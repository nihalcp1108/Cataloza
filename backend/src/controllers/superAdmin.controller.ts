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
import { ShopSubscription, IPlanSnapshot } from '../models/ShopSubscription';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { ProductFormTemplate } from '../models/ProductFormTemplate';
import { AuditLog } from '../models/AuditLog';
import { config } from '../config';
import { AuditService } from '../services/audit.service';
import { EmailService } from '../services/email.service';

export class SuperAdminController {
  /**
   * Super Admin platform dashboard metrics
   * STRICT SEPARATION: Displays Cataloza subscription revenue, NOT shop product sales!
   */
  public static async getDashboard(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      // Basic platform tenant counts
      const [
        totalShops,
        activeShops,
        inactiveShops,
        suspendedShops,
        totalCustomers,
        totalShopAdmins,
        activeSubscriptions,
        expiringIn7Days,
        expiringIn30Days,
        expiredSubscriptions,
      ] = await Promise.all([
        Shop.countDocuments(),
        Shop.countDocuments({ status: 'active' }),
        Shop.countDocuments({ status: 'inactive' }),
        Shop.countDocuments({ status: 'suspended' }),
        User.countDocuments({ role: 'customer' }),
        User.countDocuments({ role: 'shop_admin' }),
        ShopSubscription.countDocuments({ status: { $in: ['active', 'trialing'] } }),
        ShopSubscription.countDocuments({
          status: 'active',
          endDate: { $gte: now, $lte: sevenDaysFromNow },
        }),
        ShopSubscription.countDocuments({
          status: 'active',
          endDate: { $gte: now, $lte: thirtyDaysFromNow },
        }),
        ShopSubscription.countDocuments({
          $or: [{ status: 'expired' }, { status: 'past_due' }, { endDate: { $lt: now } }],
        }),
      ]);

      // Subscription revenue aggregations (ONLY received payments)
      const [lifetimeRevenueAgg, monthlyRevenueAgg, yearlyRevenueAgg, pendingPaymentsAgg] =
        await Promise.all([
          // Lifetime subscription revenue (excluding pending, failed, cancelled)
          ShopSubscription.aggregate([
            { $unwind: '$payments' },
            {
              $match: {
                'payments.paymentStatus': { $nin: ['pending', 'failed', 'cancelled'] },
              },
            },
            {
              $group: {
                _id: null,
                total: {
                  $sum: {
                    $cond: [
                      { $eq: ['$payments.paymentStatus', 'refunded'] },
                      { $multiply: ['$payments.amount', -1] },
                      '$payments.amount',
                    ],
                  },
                },
              },
            },
          ]),

          // Current Month subscription revenue
          ShopSubscription.aggregate([
            { $unwind: '$payments' },
            {
              $match: {
                'payments.paymentDate': { $gte: startOfMonth },
                'payments.paymentStatus': { $nin: ['pending', 'failed', 'cancelled'] },
              },
            },
            {
              $group: {
                _id: null,
                total: {
                  $sum: {
                    $cond: [
                      { $eq: ['$payments.paymentStatus', 'refunded'] },
                      { $multiply: ['$payments.amount', -1] },
                      '$payments.amount',
                    ],
                  },
                },
              },
            },
          ]),

          // Current Year subscription revenue
          ShopSubscription.aggregate([
            { $unwind: '$payments' },
            {
              $match: {
                'payments.paymentDate': { $gte: startOfYear },
                'payments.paymentStatus': { $nin: ['pending', 'failed', 'cancelled'] },
              },
            },
            {
              $group: {
                _id: null,
                total: {
                  $sum: {
                    $cond: [
                      { $eq: ['$payments.paymentStatus', 'refunded'] },
                      { $multiply: ['$payments.amount', -1] },
                      '$payments.amount',
                    ],
                  },
                },
              },
            },
          ]),

          // Pending subscription payments
          ShopSubscription.aggregate([
            { $unwind: '$payments' },
            { $match: { 'payments.paymentStatus': 'pending' } },
            { $group: { _id: null, total: { $sum: '$payments.amount' } } },
          ]),
        ]);

      const totalSubscriptionRevenue = lifetimeRevenueAgg[0]?.total || 0;
      const monthlySubscriptionRevenue = monthlyRevenueAgg[0]?.total || 0;
      const yearlySubscriptionRevenue = yearlyRevenueAgg[0]?.total || 0;
      const pendingSubscriptionPayments = pendingPaymentsAgg[0]?.total || 0;

      // Calculate MRR from active recurring subscriptions
      const activeSubs = await ShopSubscription.find({
        status: { $in: ['active', 'trialing'] },
      }).populate('planId');

      let mrr = 0;
      for (const sub of activeSubs) {
        const plan: any = sub.planId;
        if (plan && typeof plan.price === 'number') {
          if (plan.billingInterval === 'yearly') {
            mrr += plan.price / 12;
          } else if (plan.billingInterval === 'quarterly') {
            mrr += plan.price / 3;
          } else if (plan.billingInterval === 'monthly') {
            mrr += plan.price;
          }
        }
      }
      mrr = Math.round(mrr);

      // 6-Month Monthly Revenue Trend for Charts
      const monthlyTrendAgg = await ShopSubscription.aggregate([
        { $unwind: '$payments' },
        {
          $match: {
            'payments.paymentDate': { $gte: sixMonthsAgo },
            'payments.paymentStatus': { $nin: ['pending', 'failed', 'cancelled'] },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$payments.paymentDate' },
              month: { $month: '$payments.paymentDate' },
            },
            revenue: {
              $sum: {
                $cond: [
                  { $eq: ['$payments.paymentStatus', 'refunded'] },
                  { $multiply: ['$payments.amount', -1] },
                  '$payments.amount',
                ],
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const revenueTrend = monthlyTrendAgg.map((item) => ({
        month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
        revenue: item.revenue,
        paymentsCount: item.count,
      }));

      // Distribution of Shops by Subscription Plan
      const planDistributionAgg = await ShopSubscription.aggregate([
        { $match: { status: { $in: ['active', 'trialing'] } } },
        {
          $lookup: {
            from: 'subscriptionplans',
            localField: 'planId',
            foreignField: '_id',
            as: 'plan',
          },
        },
        { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$plan.name',
            count: { $sum: 1 },
            value: { $sum: '$plan.price' },
          },
        },
      ]);

      const plansDistribution = planDistributionAgg.map((p) => ({
        name: p._id || 'Unassigned / Custom',
        count: p.count,
        value: p.value || 0,
      }));

      // Recent 6 Subscription Payments
      const recentPayments = await ShopSubscription.aggregate([
        { $unwind: '$payments' },
        {
          $lookup: {
            from: 'shops',
            localField: 'shopId',
            foreignField: '_id',
            as: 'shop',
          },
        },
        { $unwind: '$shop' },
        { $sort: { 'payments.paymentDate': -1 } },
        { $limit: 6 },
        {
          $project: {
            _id: '$payments._id',
            shopId: '$shop._id',
            shopName: '$shop.name',
            shopSlug: '$shop.slug',
            amount: '$payments.amount',
            currency: '$payments.currency',
            paymentDate: '$payments.paymentDate',
            paymentMethod: '$payments.paymentMethod',
            paymentStatus: '$payments.paymentStatus',
            referenceNumber: '$payments.referenceNumber',
            planName: '$payments.planName',
          },
        },
      ]);

      // Recent Registered Shops (with subscription plan populated)
      const recentShops = await Shop.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .populate({
          path: 'subscriptionId',
          populate: { path: 'planId', select: 'name code price billingInterval' },
        })
        .select('name slug status createdAt contactPhone whatsappNumber subscriptionId');

      // Expiring Subscriptions (Next 30 days)
      const expiringSubscriptions = await ShopSubscription.find({
        status: 'active',
        endDate: { $gte: now, $lte: thirtyDaysFromNow },
      })
        .populate('shopId', 'name slug contactPhone email')
        .populate('planId', 'name price billingInterval')
        .sort({ endDate: 1 })
        .limit(6);

      // Shops Requiring Attention (expired, suspended, or pending payment)
      const attentionShops = await ShopSubscription.find({
        $or: [
          { status: { $in: ['past_due', 'expired', 'suspended'] } },
          { paymentStatus: 'pending' },
          { endDate: { $lt: now }, status: 'active' },
        ],
      })
        .populate('shopId', 'name slug status contactPhone email')
        .populate('planId', 'name price billingInterval')
        .limit(6);

      res.json({
        success: true,
        data: {
          metrics: {
            totalShops,
            activeShops,
            inactiveShops,
            suspendedShops,
            totalShopAdmins,
            totalCustomers,
            activeSubscriptions,
            expiredSubscriptions,
            expiringIn7Days,
            expiringIn30Days,
            totalSubscriptionRevenue,
            monthlySubscriptionRevenue,
            yearlySubscriptionRevenue,
            pendingSubscriptionPayments,
            mrr,
          },
          charts: {
            revenueTrend,
            plansDistribution,
          },
          recentShops,
          recentPayments,
          expiringSubscriptions,
          attentionShops,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * List all shops with subscription details
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
          { 'address.city': { $regex: search, $options: 'i' } },
        ];
      }

      const [shops, total] = await Promise.all([
        Shop.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate({
            path: 'subscriptionId',
            populate: { path: 'planId', select: 'name code price billingInterval' },
          }),
        Shop.countDocuments(filter),
      ]);

      const shopIds = shops.map((s) => s._id);

      // Bulk aggregate product counts, order counts, and admin users in 3 fast queries instead of 45 queries
      const [productCountsAgg, orderCountsAgg, allAdmins] = await Promise.all([
        Product.aggregate([
          { $match: { shopId: { $in: shopIds } } },
          { $group: { _id: '$shopId', count: { $sum: 1 } } },
        ]),
        Order.aggregate([
          { $match: { shopId: { $in: shopIds } } },
          { $group: { _id: '$shopId', count: { $sum: 1 } } },
        ]),
        User.find({ assignedShopIds: { $in: shopIds } })
          .select('name email phone isActive assignedShopIds')
          .lean(),
      ]);

      const productCountMap = new Map<string, number>();
      productCountsAgg.forEach((item) => productCountMap.set(item._id.toString(), item.count));

      const orderCountMap = new Map<string, number>();
      orderCountsAgg.forEach((item) => orderCountMap.set(item._id.toString(), item.count));

      const adminsByShopMap = new Map<string, any[]>();
      allAdmins.forEach((admin) => {
        (admin.assignedShopIds || []).forEach((sId: any) => {
          const key = sId.toString();
          if (!adminsByShopMap.has(key)) adminsByShopMap.set(key, []);
          adminsByShopMap.get(key)!.push(admin);
        });
      });

      // Enrich with cached metrics
      const enrichedShops = shops.map((shop) => {
        const sId = shop._id.toString();
        const productCount = productCountMap.get(sId) || 0;
        const orderCount = orderCountMap.get(sId) || 0;
        const adminUsers = adminsByShopMap.get(sId) || [];

        const sub: any = shop.subscriptionId;
        const plan = sub?.planId;

        return {
          ...shop.toObject(),
          productCount,
          orderCount,
          admins: adminUsers,
          subscription: sub
            ? {
                _id: sub._id,
                planName: plan?.name || sub.planSnapshot?.name || 'Standard Plan',
                status: sub.status,
                startDate: sub.startDate,
                endDate: sub.endDate,
                renewalDate: sub.renewalDate || sub.endDate,
                paymentStatus: sub.paymentStatus || 'paid',
              }
            : null,
          publicUrl: `${config.publicAppUrl}/${shop.slug}`,
        };
      });

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
   * Create shop with subscription plan & initial payment details atomically
   */
  public static async createShop(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        name,
        businessName,
        slug,
        description,
        businessCategory,
        gstNumber,
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
        // Subscription & Payment details
        planId,
        billingAmount,
        discount,
        paymentStatus,
        paymentMethod,
        transactionReference,
        paymentNotes,
        startDate,
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
        businessName: businessName || name,
        slug: normalizedSlug,
        description: description || '',
        businessCategory: businessCategory || 'Wholesale Distribution',
        gstNumber: gstNumber || '',
        logo,
        banner,
        contactPhone,
        whatsappNumber: whatsappNumber.replace(/[^0-9]/g, ''),
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
        if (!adminUser.assignedShopIds.some((id) => id.toString() === shop._id.toString())) {
          adminUser.assignedShopIds.push(shop._id);
          if (adminUser.role === 'customer') {
            adminUser.role = 'shop_admin';
          }
          await adminUser.save();
        }
      } else {
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

      // 3. Subscription assignment if planId is selected
      let subscription: any = null;
      if (planId && Types.ObjectId.isValid(planId)) {
        const plan = await SubscriptionPlan.findById(planId);
        if (plan) {
          const sDate = startDate ? new Date(startDate) : new Date();
          const eDate = new Date(sDate);

          if (plan.billingInterval === 'yearly') {
            eDate.setFullYear(eDate.getFullYear() + 1);
          } else if (plan.billingInterval === 'quarterly') {
            eDate.setMonth(eDate.getMonth() + 3);
          } else {
            eDate.setMonth(eDate.getMonth() + 1);
          }

          const planSnapshot: IPlanSnapshot = {
            name: plan.name,
            code: plan.code,
            price: plan.price,
            currency: plan.currency,
            billingInterval: plan.billingInterval,
            maxProducts: plan.maxProducts,
            maxCategories: plan.maxCategories,
            maxAdmins: plan.maxAdmins,
            features: plan.features,
          };

          const finalAmount =
            billingAmount !== undefined
              ? Number(billingAmount)
              : Math.max(0, plan.price - (Number(discount) || 0));

          const initialPaymentStatus = paymentStatus || 'paid';

          const payments = [];
          if (finalAmount >= 0) {
            payments.push({
              amount: finalAmount,
              currency: plan.currency || 'INR',
              paymentDate: sDate,
              paymentMethod: paymentMethod || 'bank_transfer',
              paymentStatus: initialPaymentStatus,
              referenceNumber: transactionReference || `REF-${Date.now()}`,
              planName: plan.name,
              discount: Number(discount) || 0,
              notes: paymentNotes || 'Initial subscription activation',
              recordedBy: new Types.ObjectId(req.user!.userId),
            });
          }

          subscription = await ShopSubscription.create({
            shopId: shop._id,
            planId: plan._id,
            planSnapshot,
            status: 'active',
            startDate: sDate,
            endDate: eDate,
            renewalDate: eDate,
            billingAmount: finalAmount,
            paymentStatus: initialPaymentStatus,
            payments,
            statusHistory: [
              {
                fromStatus: 'none',
                toStatus: 'active',
                reason: `Initial subscription to ${plan.name}`,
                changedAt: new Date(),
                changedBy: new Types.ObjectId(req.user!.userId),
              },
            ],
          });

          shop.subscriptionId = subscription._id;
          await shop.save();
        }
      }

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        shopId: shop._id,
        action: 'CREATE_SHOP',
        targetEntity: 'Shop',
        targetId: shop._id.toString(),
        metadata: {
          shopName: shop.name,
          slug: shop.slug,
          adminEmail: adminUser.email,
          planId: subscription?.planId,
        },
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
          subscription,
          publicUrl: `${config.publicAppUrl}/${shop.slug}`,
        },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Shop details by ID
   */
  public static async getShopById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shop = await Shop.findById(req.params.id).populate('subscriptionId');
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
   * Comprehensive shop details covering all 8 tabs
   */
  public static async getShopFullDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const shop = await Shop.findById(id).populate('subscriptionId productFormTemplateId').lean();
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      const [admins, products, categories, orders, subscription, auditLogs] = await Promise.all([
        User.find({ assignedShopIds: shop._id }).select('name email phone isActive lastLogin createdAt').lean(),
        Product.find({ shopId: shop._id }).populate('categoryId', 'name').sort({ createdAt: -1 }).limit(20).lean(),
        Category.find({ shopId: shop._id }).sort({ displayOrder: 1 }).lean(),
        Order.find({ shopId: shop._id }).sort({ createdAt: -1 }).limit(25).lean(),
        ShopSubscription.findOne({ shopId: shop._id }).populate('planId').lean(),
        AuditLog.find({ shopId: shop._id }).populate('actorId', 'name email role').sort({ timestamp: -1 }).limit(20).lean(),
      ]);

      // Calculate shop-specific customer directory and wholesale order volume
      const [productCount, orderCount, shopOrderValueAgg, customerAgg] = await Promise.all([
        Product.countDocuments({ shopId: shop._id }),
        Order.countDocuments({ shopId: shop._id }),
        Order.aggregate([
          { $match: { shopId: shop._id, orderStatus: { $ne: 'cancelled' } } },
          { $group: { _id: null, totalValue: { $sum: '$grandTotal' } } },
        ]),
        Order.aggregate([
          { $match: { shopId: shop._id } },
          {
            $group: {
              _id: { $ifNull: ['$deliveryAddress.phone', '$customerSnapshot.phone'] },
              name: { $first: { $ifNull: ['$deliveryAddress.fullName', '$customerSnapshot.name'] } },
              businessName: { $first: '$deliveryAddress.businessName' },
              totalOrders: { $sum: 1 },
              totalSpent: { $sum: '$grandTotal' },
              lastOrderDate: { $max: '$createdAt' },
            },
          },
          { $sort: { lastOrderDate: -1 } },
          { $limit: 20 },
        ]),
      ]);

      const totalShopOrderValue = shopOrderValueAgg[0]?.totalValue || 0;
      const customers = customerAgg.map((c) => ({
        phone: c._id || 'Unknown',
        name: c.name || 'Guest Buyer',
        businessName: c.businessName || '',
        totalOrders: c.totalOrders,
        totalSpent: c.totalSpent,
        lastOrderDate: c.lastOrderDate,
      }));

      res.json({
        success: true,
        data: {
          shop,
          admins,
          products,
          categories,
          orders,
          customers,
          subscription,
          auditLogs,
          stats: {
            productCount,
            orderCount,
            customerCount: customers.length,
            // Explicitly documented as Wholesale Buyer GMV, NOT Platform Subscription Revenue!
            totalShopOrderValue,
          },
          publicUrl: `${config.publicAppUrl}/${shop.slug}`,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Renew subscription or upgrade/downgrade plan
   */
  public static async renewSubscription(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        shopId,
        planId,
        durationMonths,
        amount,
        paymentStatus,
        paymentMethod,
        referenceNumber,
        notes,
      } = req.body;

      if (!shopId) {
        res.status(400).json({ success: false, message: 'shopId is required' });
        return;
      }

      const shop = await Shop.findById(shopId);
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      let subscription = await ShopSubscription.findOne({ shopId: shop._id });
      let targetPlan: any = null;

      if (planId) {
        targetPlan = await SubscriptionPlan.findById(planId);
      } else if (subscription?.planId) {
        targetPlan = await SubscriptionPlan.findById(subscription.planId);
      }

      if (!targetPlan) {
        res.status(400).json({ success: false, message: 'Valid subscription plan is required' });
        return;
      }

      const now = new Date();
      let startDate = now;
      let currentEnd = subscription?.endDate ? new Date(subscription.endDate) : now;
      let baseDate = currentEnd > now ? currentEnd : now;
      let newEndDate = new Date(baseDate);

      const monthsToAdd = Number(durationMonths) || (targetPlan.billingInterval === 'yearly' ? 12 : targetPlan.billingInterval === 'quarterly' ? 3 : 1);
      newEndDate.setMonth(newEndDate.getMonth() + monthsToAdd);

      const planSnapshot: IPlanSnapshot = {
        name: targetPlan.name,
        code: targetPlan.code,
        price: targetPlan.price,
        currency: targetPlan.currency,
        billingInterval: targetPlan.billingInterval,
        maxProducts: targetPlan.maxProducts,
        maxCategories: targetPlan.maxCategories,
        maxAdmins: targetPlan.maxAdmins,
        features: targetPlan.features,
      };

      const finalAmount = amount !== undefined ? Number(amount) : targetPlan.price;
      const isPaid = (paymentStatus || 'paid') === 'paid';

      const paymentRecord = {
        amount: finalAmount,
        currency: targetPlan.currency || 'INR',
        paymentDate: now,
        paymentMethod: paymentMethod || 'bank_transfer',
        paymentStatus: paymentStatus || 'paid',
        referenceNumber: referenceNumber || `REN-${Date.now()}`,
        planName: targetPlan.name,
        notes: notes || `Renewal for ${monthsToAdd} month(s)`,
        recordedBy: new Types.ObjectId(req.user!.userId),
      };

      if (subscription) {
        const fromStatus = subscription.status;
        subscription.planId = targetPlan._id;
        subscription.planSnapshot = planSnapshot;
        subscription.endDate = newEndDate;
        subscription.renewalDate = newEndDate;
        subscription.status = isPaid ? 'active' : 'past_due';
        subscription.paymentStatus = isPaid ? 'paid' : 'pending';
        subscription.billingAmount = finalAmount;
        subscription.payments.push(paymentRecord as any);
        subscription.statusHistory.push({
          fromStatus,
          toStatus: subscription.status,
          reason: `Renewed plan: ${targetPlan.name} for ${monthsToAdd} months`,
          changedAt: now,
          changedBy: new Types.ObjectId(req.user!.userId),
        });
        await subscription.save();
      } else {
        subscription = await ShopSubscription.create({
          shopId: shop._id,
          planId: targetPlan._id,
          planSnapshot,
          startDate,
          endDate: newEndDate,
          renewalDate: newEndDate,
          status: isPaid ? 'active' : 'past_due',
          paymentStatus: isPaid ? 'paid' : 'pending',
          billingAmount: finalAmount,
          payments: [paymentRecord],
          statusHistory: [
            {
              fromStatus: 'none',
              toStatus: isPaid ? 'active' : 'past_due',
              reason: `Initial renewal subscription: ${targetPlan.name}`,
              changedAt: now,
              changedBy: new Types.ObjectId(req.user!.userId),
            },
          ],
        });
        shop.subscriptionId = subscription._id;
        await shop.save();
      }

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        shopId: shop._id,
        action: 'RENEW_SUBSCRIPTION',
        targetEntity: 'ShopSubscription',
        targetId: subscription._id.toString(),
        metadata: {
          planName: targetPlan.name,
          amount: finalAmount,
          months: monthsToAdd,
          paymentStatus,
        },
      });

      res.json({
        success: true,
        message: `Subscription successfully renewed until ${newEndDate.toLocaleDateString()}`,
        data: { subscription },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Record subscription payment manually
   */
  public static async recordSubscriptionPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        subscriptionId,
        amount,
        currency,
        paymentMethod,
        paymentStatus,
        referenceNumber,
        notes,
        extendDays,
      } = req.body;

      if (!subscriptionId || amount === undefined) {
        res.status(400).json({ success: false, message: 'subscriptionId and amount are required' });
        return;
      }

      const subscription = await ShopSubscription.findById(subscriptionId).populate('planId');
      if (!subscription) {
        res.status(404).json({ success: false, message: 'Subscription not found' });
        return;
      }

      const plan: any = subscription.planId;
      const statusToSet = paymentStatus || 'paid';

      subscription.payments.push({
        amount: Number(amount),
        currency: currency || 'INR',
        paymentDate: new Date(),
        paymentMethod: paymentMethod || 'bank_transfer',
        paymentStatus: statusToSet,
        referenceNumber: referenceNumber || `PAY-${Date.now()}`,
        planName: plan?.name || subscription.planSnapshot?.name || 'Subscription Plan',
        notes: notes || '',
        recordedBy: new Types.ObjectId(req.user!.userId),
      } as any);

      if (extendDays && Number(extendDays) > 0) {
        const currentEnd = new Date(subscription.endDate);
        const baseDate = currentEnd > new Date() ? currentEnd : new Date();
        baseDate.setDate(baseDate.getDate() + Number(extendDays));
        subscription.endDate = baseDate;
        subscription.renewalDate = baseDate;
      }

      if (statusToSet === 'paid') {
        subscription.paymentStatus = 'paid';
        if (['expired', 'past_due'].includes(subscription.status)) {
          subscription.status = 'active';
        }
      }

      await subscription.save();

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        shopId: subscription.shopId,
        action: 'RECORD_SUBSCRIPTION_PAYMENT',
        targetEntity: 'ShopSubscription',
        targetId: subscription._id.toString(),
        metadata: { amount, paymentMethod, paymentStatus: statusToSet, referenceNumber },
      });

      res.json({
        success: true,
        message: 'Subscription payment recorded successfully',
        data: { subscription },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * List all subscription payments across the platform
   */
  public static async getSubscriptionPayments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const skip = (page - 1) * limit;

      const matchQuery: any = {};
      if (req.query.paymentStatus) {
        matchQuery['payments.paymentStatus'] = req.query.paymentStatus;
      }

      const paymentsAgg = await ShopSubscription.aggregate([
        { $unwind: '$payments' },
        ...(Object.keys(matchQuery).length > 0 ? [{ $match: matchQuery }] : []),
        {
          $lookup: {
            from: 'shops',
            localField: 'shopId',
            foreignField: '_id',
            as: 'shop',
          },
        },
        { $unwind: '$shop' },
        {
          $lookup: {
            from: 'subscriptionplans',
            localField: 'planId',
            foreignField: '_id',
            as: 'plan',
          },
        },
        { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'payments.recordedBy',
            foreignField: '_id',
            as: 'recordedByUser',
          },
        },
        { $unwind: { path: '$recordedByUser', preserveNullAndEmptyArrays: true } },
        { $sort: { 'payments.paymentDate': -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: '$payments._id',
            subscriptionId: '$_id',
            shopId: '$shop._id',
            shopName: '$shop.name',
            shopSlug: '$shop.slug',
            planName: { $ifNull: ['$payments.planName', '$plan.name'] },
            amount: '$payments.amount',
            currency: '$payments.currency',
            paymentDate: '$payments.paymentDate',
            paymentMethod: '$payments.paymentMethod',
            paymentStatus: '$payments.paymentStatus',
            referenceNumber: '$payments.referenceNumber',
            notes: '$payments.notes',
            recordedBy: '$recordedByUser.name',
          },
        },
      ]);

      const totalAgg = await ShopSubscription.aggregate([
        { $unwind: '$payments' },
        ...(Object.keys(matchQuery).length > 0 ? [{ $match: matchQuery }] : []),
        { $count: 'total' },
      ]);

      const total = totalAgg[0]?.total || 0;

      res.json({
        success: true,
        data: {
          payments: paymentsAgg,
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
   * Subscription Revenue Reports
   */
  public static async getRevenueReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate, planId, shopId, paymentStatus } = req.query;

      const match: any = {};
      if (startDate || endDate) {
        match['payments.paymentDate'] = {};
        if (startDate) match['payments.paymentDate'].$gte = new Date(startDate as string);
        if (endDate) match['payments.paymentDate'].$lte = new Date(endDate as string);
      }
      if (paymentStatus) {
        match['payments.paymentStatus'] = paymentStatus;
      } else {
        match['payments.paymentStatus'] = { $nin: ['failed', 'cancelled'] };
      }
      if (shopId && Types.ObjectId.isValid(shopId as string)) {
        match.shopId = new Types.ObjectId(shopId as string);
      }
      if (planId && Types.ObjectId.isValid(planId as string)) {
        match.planId = new Types.ObjectId(planId as string);
      }

      const [summaryAgg, byPlanAgg, byShopAgg, byMethodAgg, allPayments] = await Promise.all([
        // Summary
        ShopSubscription.aggregate([
          { $unwind: '$payments' },
          { $match: match },
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: {
                  $cond: [
                    { $eq: ['$payments.paymentStatus', 'refunded'] },
                    { $multiply: ['$payments.amount', -1] },
                    {
                      $cond: [
                        { $eq: ['$payments.paymentStatus', 'pending'] },
                        0,
                        '$payments.amount',
                      ],
                    },
                  ],
                },
              },
              pendingAmount: {
                $sum: {
                  $cond: [{ $eq: ['$payments.paymentStatus', 'pending'] }, '$payments.amount', 0],
                },
              },
              refundedAmount: {
                $sum: {
                  $cond: [{ $eq: ['$payments.paymentStatus', 'refunded'] }, '$payments.amount', 0],
                },
              },
              totalCount: { $sum: 1 },
            },
          },
        ]),

        // Revenue by Plan
        ShopSubscription.aggregate([
          { $unwind: '$payments' },
          { $match: match },
          {
            $lookup: {
              from: 'subscriptionplans',
              localField: 'planId',
              foreignField: '_id',
              as: 'plan',
            },
          },
          { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: { $ifNull: ['$payments.planName', '$plan.name'] },
              revenue: {
                $sum: {
                  $cond: [
                    { $eq: ['$payments.paymentStatus', 'refunded'] },
                    { $multiply: ['$payments.amount', -1] },
                    {
                      $cond: [
                        { $eq: ['$payments.paymentStatus', 'pending'] },
                        0,
                        '$payments.amount',
                      ],
                    },
                  ],
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { revenue: -1 } },
        ]),

        // Revenue by Shop
        ShopSubscription.aggregate([
          { $unwind: '$payments' },
          { $match: match },
          {
            $lookup: {
              from: 'shops',
              localField: 'shopId',
              foreignField: '_id',
              as: 'shop',
            },
          },
          { $unwind: '$shop' },
          {
            $group: {
              _id: '$shop.name',
              shopSlug: { $first: '$shop.slug' },
              revenue: {
                $sum: {
                  $cond: [
                    { $eq: ['$payments.paymentStatus', 'refunded'] },
                    { $multiply: ['$payments.amount', -1] },
                    {
                      $cond: [
                        { $eq: ['$payments.paymentStatus', 'pending'] },
                        0,
                        '$payments.amount',
                      ],
                    },
                  ],
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 15 },
        ]),

        // Revenue by Method
        ShopSubscription.aggregate([
          { $unwind: '$payments' },
          { $match: match },
          {
            $group: {
              _id: '$payments.paymentMethod',
              revenue: {
                $sum: {
                  $cond: [
                    { $eq: ['$payments.paymentStatus', 'refunded'] },
                    { $multiply: ['$payments.amount', -1] },
                    {
                      $cond: [
                        { $eq: ['$payments.paymentStatus', 'pending'] },
                        0,
                        '$payments.amount',
                      ],
                    },
                  ],
                },
              },
              count: { $sum: 1 },
            },
          },
        ]),

        // Detail records for export
        ShopSubscription.aggregate([
          { $unwind: '$payments' },
          { $match: match },
          {
            $lookup: {
              from: 'shops',
              localField: 'shopId',
              foreignField: '_id',
              as: 'shop',
            },
          },
          { $unwind: '$shop' },
          { $sort: { 'payments.paymentDate': -1 } },
          { $limit: 200 },
          {
            $project: {
              shopName: '$shop.name',
              shopSlug: '$shop.slug',
              planName: '$payments.planName',
              amount: '$payments.amount',
              currency: '$payments.currency',
              paymentDate: '$payments.paymentDate',
              paymentMethod: '$payments.paymentMethod',
              paymentStatus: '$payments.paymentStatus',
              referenceNumber: '$payments.referenceNumber',
            },
          },
        ]),
      ]);

      res.json({
        success: true,
        data: {
          summary: summaryAgg[0] || {
            totalRevenue: 0,
            pendingAmount: 0,
            refundedAmount: 0,
            totalCount: 0,
          },
          byPlan: byPlanAgg,
          byShop: byShopAgg,
          byMethod: byMethodAgg,
          exportRecords: allPayments,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Update shop details
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

      res.json({ success: true, message: 'Shop updated successfully', data: { shop } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Suspend shop
   */
  public static async suspendShop(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const shop = await Shop.findById(id);
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      shop.status = 'suspended';
      await shop.save();

      await ShopSubscription.updateMany(
        { shopId: shop._id, status: 'active' },
        { status: 'suspended' }
      );

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        shopId: shop._id,
        action: 'SUSPEND_SHOP',
        targetEntity: 'Shop',
        targetId: shop._id.toString(),
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
   * Toggle shop status (active/inactive)
   */
  public static async toggleShopStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shop = await Shop.findById(req.params.id);
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      shop.status = shop.status === 'active' ? 'inactive' : 'active';
      await shop.save();

      res.json({ success: true, message: `Shop is now ${shop.status}`, data: { shop } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * List all shop admins
   */
  public static async getShopAdmins(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const admins = await User.find({ role: 'shop_admin' })
        .populate('assignedShopIds', 'name slug status')
        .sort({ createdAt: -1 });

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
      const invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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
          mustChangePassword: !password,
          invitationToken,
          invitationExpires,
        });
      }

      res.status(201).json({
        success: true,
        message: 'Shop admin assigned successfully',
        data: { user },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Update shop admin details
   */
  public static async updateShopAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, phone, isActive, assignedShopIds } = req.body;

      const user = await User.findById(id);
      if (!user) {
        res.status(404).json({ success: false, message: 'Admin user not found' });
        return;
      }

      if (user.role === 'super_admin') {
        res.status(403).json({ success: false, message: 'Super Admin details cannot be updated here' });
        return;
      }

      if (name) user.name = name.trim();
      if (phone !== undefined) user.phone = phone.trim();
      if (typeof isActive === 'boolean') user.isActive = isActive;
      if (Array.isArray(assignedShopIds)) {
        user.assignedShopIds = assignedShopIds.map((sid: string) => new Types.ObjectId(sid));
      }

      await user.save();

      res.json({
        success: true,
        message: 'Shop admin updated successfully',
        data: { user },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Reset Shop Admin Password
   */
  public static async resetShopAdminPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        return;
      }

      const user = await User.findById(id);
      if (!user) {
        res.status(404).json({ success: false, message: 'Admin user not found' });
        return;
      }

      if (user.role === 'super_admin') {
        res.status(403).json({ success: false, message: 'Cannot reset Super Admin password from this route' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all previous sessions
      await user.save();

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        action: 'RESET_ADMIN_PASSWORD',
        targetEntity: 'User',
        targetId: user._id.toString(),
        metadata: { adminEmail: user.email },
      });

      res.json({
        success: true,
        message: `Password for ${user.name} reset successfully. Previous sessions revoked.`,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Resend invitation to shop admin
   */
  public static async resendAdminInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      user.invitationToken = crypto.randomBytes(32).toString('hex');
      user.invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await user.save();

      res.json({
        success: true,
        message: `Invitation refreshed for ${user.email}`,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Revoke all active sessions for an admin
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

      res.json({
        success: true,
        message: `All sessions revoked for ${user.name}`,
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
   * Platform wholesale orders (Accessible in dedicated Platform Orders view, not on main dashboard)
   */
  public static async getPlatformOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (req.query.shopId) filter.shopId = req.query.shopId;
      if (req.query.status) filter.orderStatus = req.query.status;

      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate('shopId', 'name slug')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Order.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: {
          orders,
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

  public static async getSettings(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let setting = await PlatformSetting.findOne();
      if (!setting) {
        setting = await PlatformSetting.create({
          platformName: 'Cataloza',
          supportEmail: 'support@cataloza.com',
          supportPhone: '+91 99951 91108',
        });
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

  public static async sendTestEmail(_req: AuthenticatedRequest, res: Response): Promise<void> {
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
