import { Response } from 'express';
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../types';
import { Shop } from '../models/Shop';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { PlatformSetting } from '../models/PlatformSetting';
import { Category } from '../models/Category';
import { ShopSubscription } from '../models/ShopSubscription';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { ProductFormTemplate } from '../models/ProductFormTemplate';
import { AuditLog } from '../models/AuditLog';
import { config } from '../config';
import { AuditService } from '../services/audit.service';
import { EmailService } from '../services/email.service';

export class SuperAdminController {
  /**
   * Super Admin platform dashboard metrics
   */
  public static async getDashboard(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const [
        totalShops,
        activeShops,
        inactiveShops,
        suspendedShops,
        totalCustomers,
        totalShopAdmins,
        totalProducts,
        totalOrders,
        activeSubscriptions,
        expiringSubscriptions,
        expiredSubscriptions,
        recentShops,
        recentOrders,
      ] = await Promise.all([
        Shop.countDocuments(),
        Shop.countDocuments({ status: 'active' }),
        Shop.countDocuments({ status: 'inactive' }),
        Shop.countDocuments({ status: 'suspended' }),
        User.countDocuments({ role: 'customer' }),
        User.countDocuments({ role: 'shop_admin' }),
        Product.countDocuments(),
        Order.countDocuments(),
        ShopSubscription.countDocuments({ status: { $in: ['active', 'trialing'] } }),
        ShopSubscription.countDocuments({
          status: 'active',
          endDate: { $lte: sevenDaysFromNow, $gte: new Date() },
        }),
        ShopSubscription.countDocuments({ status: 'expired' }),
        Shop.find().sort({ createdAt: -1 }).limit(5).select('name slug status createdAt contactPhone whatsappNumber'),
        Order.find().sort({ createdAt: -1 }).limit(5).populate('shopId', 'name slug').select('orderNumber grandTotal orderStatus paymentStatus createdAt customerSnapshot'),
      ]);

      const [revenueAgg, subRevenueAgg] = await Promise.all([
        Order.aggregate([
          { $match: { orderStatus: { $ne: 'cancelled' } } },
          { $group: { _id: null, totalRevenue: { $sum: '$grandTotal' } } },
        ]),
        ShopSubscription.aggregate([
          { $unwind: '$payments' },
          { $group: { _id: null, totalSubRevenue: { $sum: '$payments.amount' } } },
        ]),
      ]);

      const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
      const totalSubscriptionRevenue = subRevenueAgg[0]?.totalSubRevenue || 0;

      res.json({
        success: true,
        data: {
          metrics: {
            totalShops,
            activeShops,
            inactiveShops,
            suspendedShops,
            totalCustomers,
            totalShopAdmins,
            totalProducts,
            totalOrders,
            totalRevenue,
            totalSubscriptionRevenue,
            activeSubscriptions,
            expiringSubscriptions,
            expiredSubscriptions,
          },
          recentShops,
          recentOrders,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * List all shops
   */
  public static async getShops(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 15));
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (req.query.status) {
        filter.status = req.query.status;
      }
      if (req.query.search) {
        const search = (req.query.search as string).trim();
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { slug: { $regex: search, $options: 'i' } },
          { whatsappNumber: { $regex: search, $options: 'i' } },
        ];
      }

      const [shops, total] = await Promise.all([
        Shop.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Shop.countDocuments(filter),
      ]);

      // Populate product and order counts for each shop
      const enrichedShops = await Promise.all(
        shops.map(async (shop) => {
          const [productCount, orderCount, adminUsers] = await Promise.all([
            Product.countDocuments({ shopId: shop._id }),
            Order.countDocuments({ shopId: shop._id }),
            User.find({ assignedShopIds: shop._id }).select('name email phone'),
          ]);
          return {
            ...shop.toObject(),
            productCount,
            orderCount,
            admins: adminUsers,
            publicUrl: `${config.publicAppUrl}/${shop.slug}`,
          };
        })
      );

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          shops: enrichedShops,
          pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Create shop & provision initial Shop Admin account atomically
   */
  public static async createShop(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        name,
        slug,
        description,
        logo,
        banner,
        contactPhone,
        whatsappNumber,
        email,
        address,
        businessHours,
        accentColor,
        adminName,
        adminEmail,
        adminPhone,
        adminPassword,
      } = req.body;

      const normalizedSlug = slug.toLowerCase().trim();

      // Check reserved slugs
      if (config.reservedSlugs.includes(normalizedSlug)) {
        res.status(400).json({
          success: false,
          message: `The slug "${normalizedSlug}" is reserved by the platform and cannot be used for a shop.`,
        });
        return;
      }

      // Check unique slug
      const existingShop = await Shop.findOne({ slug: normalizedSlug });
      if (existingShop) {
        res.status(400).json({
          success: false,
          message: `A shop with the slug "${normalizedSlug}" already exists.`,
        });
        return;
      }

      // 1. Create the shop
      const shop = await Shop.create({
        name,
        slug: normalizedSlug,
        description,
        logo,
        banner,
        contactPhone,
        whatsappNumber,
        email,
        address,
        businessHours,
        accentColor: accentColor || '#2563eb',
        status: 'active',
        createdBy: new Types.ObjectId(req.user!.userId),
      });

      // 2. Provision or assign initial Shop Admin
      const normalizedAdminEmail = adminEmail.toLowerCase().trim();
      let adminUser = await User.findOne({ email: normalizedAdminEmail });

      if (adminUser) {
        // Assign this existing admin to the shop
        if (!adminUser.assignedShopIds.some((id) => id.toString() === shop._id.toString())) {
          adminUser.assignedShopIds.push(shop._id);
          if (adminUser.role === 'customer') {
            adminUser.role = 'shop_admin';
          }
          await adminUser.save();
        }
      } else {
        // Create brand new shop admin user
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(adminPassword, salt);

        adminUser = await User.create({
          name: adminName,
          email: normalizedAdminEmail,
          phone: adminPhone || contactPhone,
          passwordHash,
          role: 'shop_admin',
          assignedShopIds: [shop._id],
          isActive: true,
        });
      }

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        shopId: shop._id,
        action: 'CREATE_SHOP',
        targetEntity: 'Shop',
        targetId: shop._id.toString(),
        metadata: { shopName: shop.name, slug: shop.slug, adminEmail: adminUser.email },
      });

      res.status(201).json({
        success: true,
        message: 'Shop created and initial Shop Admin assigned successfully',
        data: {
          shop,
          admin: {
            id: adminUser._id,
            name: adminUser.name,
            email: adminUser.email,
          },
          publicUrl: `${config.publicAppUrl}/${shop.slug}`,
        },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Shop details for super admin
   */
  public static async getShopById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shop = await Shop.findById(req.params.id);
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      const [admins, productCount, orderCount] = await Promise.all([
        User.find({ assignedShopIds: shop._id }).select('name email phone isActive lastLogin'),
        Product.countDocuments({ shopId: shop._id }),
        Order.countDocuments({ shopId: shop._id }),
      ]);

      res.json({
        success: true,
        data: {
          shop,
          admins,
          productCount,
          orderCount,
          publicUrl: `${config.publicAppUrl}/${shop.slug}`,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Update shop
   */
  public static async updateShop(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shop = await Shop.findById(req.params.id);
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      Object.assign(shop, req.body);
      await shop.save();

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        shopId: shop._id,
        action: 'SUPER_ADMIN_UPDATE_SHOP',
        targetEntity: 'Shop',
        targetId: shop._id.toString(),
      });

      res.json({ success: true, message: 'Shop updated', data: { shop } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Suspend a shop and its active subscription
   */
  public static async suspendShop(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const shop = await Shop.findById(id);
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      shop.status = 'suspended';
      await shop.save();

      // Suspend shop subscription too
      await ShopSubscription.updateMany(
        { shopId: shop._id, status: { $in: ['active', 'trialing'] } },
        { status: 'suspended' }
      );

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        shopId: shop._id,
        action: 'SUSPEND_SHOP',
        targetEntity: 'Shop',
        targetId: shop._id.toString(),
        metadata: { reason: reason || 'Suspended by Super Admin' },
      });

      res.json({ success: true, message: 'Shop suspended successfully', data: { shop } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Reactivate a suspended shop
   */
  public static async reactivateShop(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const shop = await Shop.findById(id);
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      shop.status = 'active';
      await shop.save();

      // Reactivate subscription if it was suspended
      await ShopSubscription.updateMany(
        { shopId: shop._id, status: 'suspended' },
        { status: 'active' }
      );

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        shopId: shop._id,
        action: 'REACTIVATE_SHOP',
        targetEntity: 'Shop',
        targetId: shop._id.toString(),
      });

      res.json({ success: true, message: 'Shop reactivated successfully', data: { shop } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Comprehensive shop details covering all tabs
   */
  public static async getShopFullDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const shop = await Shop.findById(id).populate('subscriptionId productFormTemplateId');
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      const [admins, products, categories, orders, subscription, auditLogs] = await Promise.all([
        User.find({ assignedShopIds: shop._id }).select('name email phone isActive lastLogin createdAt'),
        Product.find({ shopId: shop._id }).populate('categoryId', 'name').sort({ createdAt: -1 }).limit(10),
        Category.find({ shopId: shop._id }).sort({ displayOrder: 1 }),
        Order.find({ shopId: shop._id }).sort({ createdAt: -1 }).limit(10),
        ShopSubscription.findOne({ shopId: shop._id }).populate('planId'),
        AuditLog.find({ shopId: shop._id }).populate('actorId', 'name email role').sort({ timestamp: -1 }).limit(20),
      ]);

      const [productCount, orderCount] = await Promise.all([
        Product.countDocuments({ shopId: shop._id }),
        Order.countDocuments({ shopId: shop._id }),
      ]);

      res.json({
        success: true,
        data: {
          shop,
          admins,
          products,
          categories,
          orders,
          subscription,
          auditLogs,
          stats: {
            productCount,
            orderCount,
          },
          publicUrl: `${config.publicAppUrl}/${shop.slug}`,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Platform audit logs
   */
  public static async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (req.query.shopId) filter.shopId = req.query.shopId;
      if (req.query.action) filter.action = req.query.action;

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .populate('actorId', 'name email role')
          .populate('shopId', 'name slug')
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit),
        AuditLog.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Activate or deactivate shop
   */
  public static async toggleShopStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shop = await Shop.findById(req.params.id);
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      const newStatus = shop.status === 'active' ? 'inactive' : 'active';
      shop.status = newStatus;
      await shop.save();

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        shopId: shop._id,
        action: 'TOGGLE_SHOP_STATUS',
        targetEntity: 'Shop',
        targetId: shop._id.toString(),
        metadata: { newStatus },
      });

      res.json({ success: true, message: `Shop is now ${newStatus}`, data: { shop } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * List all Shop Admins
   */
  public static async getShopAdmins(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const admins = await User.find({ role: 'shop_admin' })
        .populate('assignedShopIds', 'name slug')
        .select('name email phone isActive lastLogin assignedShopIds invitationToken invitationExpires createdAt');

      res.json({ success: true, data: { admins } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Create or assign shop admin
   */
  public static async createShopAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, email, phone, password, shopId, shopIds } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      // Disallow using the fixed Super Admin email
      if (normalizedEmail === 'cpnihal35@gmail.com') {
        res.status(400).json({
          success: false,
          message: 'The email cpnihal35@gmail.com is strictly reserved for the platform Super Administrator.',
        });
        return;
      }

      const assignedIds: Types.ObjectId[] = [];
      if (shopIds && Array.isArray(shopIds)) {
        shopIds.forEach((id: string) => {
          if (Types.ObjectId.isValid(id)) assignedIds.push(new Types.ObjectId(id));
        });
      } else if (shopId && Types.ObjectId.isValid(shopId)) {
        assignedIds.push(new Types.ObjectId(shopId));
      }

      let user = await User.findOne({ email: normalizedEmail });

      const invitationToken = crypto.randomBytes(32).toString('hex');
      const invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      if (user) {
        if (user.role === 'super_admin') {
          res.status(400).json({ success: false, message: 'Cannot modify Super Admin accounts from this interface' });
          return;
        }

        user.role = 'shop_admin';
        user.name = name || user.name;
        user.phone = phone || user.phone;
        assignedIds.forEach((id) => {
          if (!user!.assignedShopIds.some((existing) => existing.toString() === id.toString())) {
            user!.assignedShopIds.push(id);
          }
        });
        user.invitationToken = invitationToken;
        user.invitationExpires = invitationExpires;
        await user.save();
      } else {
        const salt = await bcrypt.genSalt(12);
        const tempPassword = password || crypto.randomBytes(16).toString('hex');
        const passwordHash = await bcrypt.hash(tempPassword, salt);

        user = await User.create({
          name: name.trim(),
          email: normalizedEmail,
          phone: phone ? phone.trim() : undefined,
          passwordHash,
          role: 'shop_admin',
          assignedShopIds: assignedIds,
          isActive: true,
          mustChangePassword: !password, // if password was auto-generated, must change
          invitationToken,
          invitationExpires,
        });
      }

      // Try sending invitation email
      const inviteUrl = `${config.publicAppUrl}/login?token=${invitationToken}`;
      try {
        const shop = assignedIds.length > 0 ? await Shop.findById(assignedIds[0]) : null;
        await EmailService.sendShopAdminInvitation(
          normalizedEmail,
          name,
          shop?.name || 'Wholesale Supplier',
          inviteUrl
        );
      } catch (err: any) {
        console.warn(`[ShopAdmin] Invitation email not dispatched: ${err.message}`);
      }

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'SUPER_ADMIN_CREATE_SHOP_ADMIN',
        targetEntity: 'User',
        targetId: user._id.toString(),
        metadata: { email: normalizedEmail, assignedShops: assignedIds },
      });

      res.status(201).json({
        success: true,
        message: 'Shop admin created and assigned successfully',
        data: {
          user,
          invitationToken,
          inviteUrl,
        },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Update shop admin (shops, status, name, phone)
   */
  public static async updateShopAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, phone, shopIds, isActive } = req.body;

      const user = await User.findById(id);
      if (!user || user.role !== 'shop_admin') {
        res.status(404).json({ success: false, message: 'Shop Admin not found' });
        return;
      }

      if (name) user.name = name.trim();
      if (phone !== undefined) user.phone = phone ? phone.trim() : undefined;
      if (isActive !== undefined) user.isActive = Boolean(isActive);

      if (shopIds && Array.isArray(shopIds)) {
        user.assignedShopIds = shopIds
          .filter((sid: string) => Types.ObjectId.isValid(sid))
          .map((sid: string) => new Types.ObjectId(sid));
      }

      await user.save();

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'SUPER_ADMIN_UPDATE_SHOP_ADMIN',
        targetEntity: 'User',
        targetId: user._id.toString(),
      });

      res.json({
        success: true,
        message: 'Shop Admin details updated successfully',
        data: { user },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Resend invitation / password setup link to shop admin
   */
  public static async resendAdminInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user || user.role !== 'shop_admin') {
        res.status(404).json({ success: false, message: 'Shop Admin not found' });
        return;
      }

      const invitationToken = crypto.randomBytes(32).toString('hex');
      user.invitationToken = invitationToken;
      user.invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await user.save();

      const inviteUrl = `${config.publicAppUrl}/login?token=${invitationToken}`;
      try {
        const shop = user.assignedShopIds.length > 0 ? await Shop.findById(user.assignedShopIds[0]) : null;
        await EmailService.sendShopAdminInvitation(
          user.email,
          user.name,
          shop?.name || 'Wholesale Supplier',
          inviteUrl
        );
      } catch (err: any) {
        console.warn(`[ShopAdmin] Could not send invitation email: ${err.message}`);
      }

      res.json({
        success: true,
        message: 'Invitation link generated and emailed to admin',
        data: {
          invitationToken,
          inviteUrl,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Revoke active sessions for an administrator
   */
  public static async revokeAdminSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'SUPER_ADMIN_REVOKE_SESSIONS',
        targetEntity: 'User',
        targetId: user._id.toString(),
      });

      res.json({
        success: true,
        message: 'Active sessions for this administrator have been revoked.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Platform-wide orders overview
   */
  public static async getPlatformOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (req.query.shopId) filter.shopId = req.query.shopId;
      if (req.query.status) filter.orderStatus = req.query.status;
      if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
      if (req.query.search) {
        const search = (req.query.search as string).trim();
        filter.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { 'customerSnapshot.name': { $regex: search, $options: 'i' } },
        ];
      }

      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate('shopId', 'name slug')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Order.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Platform settings
   */
  public static async getSettings(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let setting = await PlatformSetting.findOne();
      if (!setting) {
        setting = await PlatformSetting.create({});
      }
      res.json({ success: true, data: { setting } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let setting = await PlatformSetting.findOne();
      if (!setting) {
        setting = new PlatformSetting(req.body);
      } else {
        Object.assign(setting, req.body);
      }
      await setting.save();

      res.json({ success: true, message: 'Platform settings updated', data: { setting } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Protected email service diagnostic
   * Tests SMTP connectivity and credentials without revealing secrets.
   */
  public static async getEmailDiagnostic(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await EmailService.verifyConnection();
      res.json({
        success: result.success,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Protected email test dispatch
   * Dispatches a real test message exclusively to authorized Super Admin cpnihal35@gmail.com
   */
  public static async sendTestEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await EmailService.sendTestEmail('cpnihal35@gmail.com');
      res.json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      res.status(502).json({
        success: false,
        message: `Test email dispatch failed: ${error.message}`,
      });
    }
  }
}
