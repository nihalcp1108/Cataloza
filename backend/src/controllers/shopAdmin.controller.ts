import { Response } from 'express';
import { Types } from 'mongoose';
import slugify from 'slugify';
import { AuthenticatedRequest } from '../types';
import { Shop } from '../models/Shop';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Order } from '../models/Order';
import { UploadService } from '../services/upload.service';
import { InvoiceService } from '../services/invoice.service';
import { AuditService } from '../services/audit.service';
import { SubscriptionService } from '../services/subscription.service';
import { ProductFormService } from '../services/productForm.service';

export class ShopAdminController {
  /**
   * Helper: resolves the effective shopId from the authenticated request
   */
  private static getShopId(req: AuthenticatedRequest): Types.ObjectId {
    const shopId = req.shopId || (req.user?.assignedShopIds && req.user.assignedShopIds[0]);
    if (!shopId) {
      throw new Error('No shop assigned to this administrator account');
    }
    return new Types.ObjectId(shopId);
  }

  /**
   * Dashboard statistics for the shop
   */
  public static async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);

      const [
        totalProducts,
        activeProducts,
        totalOrders,
        pendingOrders,
        confirmedOrders,
        completedOrders,
        cancelledOrders,
        recentOrders,
      ] = await Promise.all([
        Product.countDocuments({ shopId }),
        Product.countDocuments({ shopId, isActive: true }),
        Order.countDocuments({ shopId }),
        Order.countDocuments({ shopId, orderStatus: 'pending' }),
        Order.countDocuments({ shopId, orderStatus: 'confirmed' }),
        Order.countDocuments({ shopId, orderStatus: 'delivered' }),
        Order.countDocuments({ shopId, orderStatus: 'cancelled' }),
        Order.find({ shopId }).sort({ createdAt: -1 }).limit(5).select('orderNumber grandTotal orderStatus paymentStatus createdAt customerSnapshot'),
      ]);

      // Calculate revenue (excluding cancelled orders)
      const revenueAgg = await Order.aggregate([
        { $match: { shopId, orderStatus: { $ne: 'cancelled' } } },
        { $group: { _id: null, totalRevenue: { $sum: '$grandTotal' } } },
      ]);
      const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

      // Best selling products from order snapshots
      const topProductsAgg = await Order.aggregate([
        { $match: { shopId, orderStatus: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            name: { $first: '$items.name' },
            sku: { $first: '$items.sku' },
            unitsSold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.lineTotal' },
          },
        },
        { $sort: { unitsSold: -1 } },
        { $limit: 5 },
      ]);

      res.json({
        success: true,
        data: {
          metrics: {
            totalProducts,
            activeProducts,
            totalOrders,
            pendingOrders,
            confirmedOrders,
            completedOrders,
            cancelledOrders,
            totalRevenue,
          },
          recentOrders,
          topProducts: topProductsAgg,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get shop settings
   */
  public static async getShop(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);
      const shop = await Shop.findById(shopId);
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }
      res.json({ success: true, data: { shop } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Update shop settings
   */
  public static async updateShop(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);
      const shop = await Shop.findById(shopId);
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      // Fields permitted for shop admin edit
      const allowedFields = [
        'name',
        'description',
        'logo',
        'banner',
        'contactPhone',
        'whatsappNumber',
        'email',
        'address',
        'businessHours',
        'socialLinks',
        'accentColor',
        'currency',
        'currencySymbol',
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          (shop as any)[field] = req.body[field];
        }
      });

      await shop.save();

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        shopId: shop._id,
        action: 'UPDATE_SHOP_SETTINGS',
        targetEntity: 'Shop',
        targetId: shop._id.toString(),
      });

      res.json({ success: true, message: 'Shop settings updated successfully', data: { shop } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Products management
   */
  public static async getProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 15));
      const skip = (page - 1) * limit;

      const filter: any = { shopId };

      if (req.query.search) {
        const search = (req.query.search as string).trim();
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
        ];
      }

      if (req.query.categoryId) {
        filter.categoryId = req.query.categoryId;
      }

      if (req.query.isActive !== undefined) {
        filter.isActive = req.query.isActive === 'true';
      }

      const [products, total] = await Promise.all([
        Product.find(filter)
          .populate('categoryId', 'name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Product.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          products,
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

  public static async createProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);

      // 1. Subscription limits enforcement
      const subCheck = await SubscriptionService.canAddProduct(shopId);
      if (!subCheck.allowed) {
        res.status(403).json({ success: false, message: subCheck.reason });
        return;
      }

      // 2. Resolve effective published product form
      const { version, fields } = await ProductFormService.getEffectiveFormForShop(shopId);

      // 3. Server-side validation of custom fields against published schema
      const customFields = req.body.customFields || {};
      if (fields && fields.length > 0) {
        const validation = ProductFormService.validateCustomFields(customFields, fields);
        if (!validation.isValid) {
          res.status(400).json({
            success: false,
            message: 'Custom field validation failed',
            errors: validation.errors,
          });
          return;
        }
      }

      // 4. Check unique SKU within this shop
      const existingSku = await Product.findOne({ shopId, sku: req.body.sku.toUpperCase().trim() });
      if (existingSku) {
        res.status(400).json({ success: false, message: `SKU "${req.body.sku}" already exists in your shop` });
        return;
      }

      // 5. Generate unique product slug
      let baseSlug = slugify(req.body.name, { lower: true, strict: true }) || 'product';
      let slug = baseSlug;
      let counter = 1;
      while (await Product.findOne({ shopId, slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const product = await Product.create({
        ...req.body,
        shopId,
        slug,
        sku: req.body.sku.toUpperCase().trim(),
        customFields,
        formVersionId: version?._id,
      });

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        shopId,
        action: 'CREATE_PRODUCT',
        targetEntity: 'Product',
        targetId: product._id.toString(),
      });

      res.status(201).json({ success: true, message: 'Product created successfully', data: { product } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  public static async getProductById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);
      const product = await Product.findOne({ _id: req.params.id, shopId }).populate('categoryId', 'name');
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }
      res.json({ success: true, data: { product } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async updateProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);
      const product = await Product.findOne({ _id: req.params.id, shopId });
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }

      // Validate custom fields if updated
      if (req.body.customFields !== undefined) {
        const { fields } = await ProductFormService.getEffectiveFormForShop(shopId);
        if (fields && fields.length > 0) {
          const validation = ProductFormService.validateCustomFields(req.body.customFields, fields);
          if (!validation.isValid) {
            res.status(400).json({
              success: false,
              message: 'Custom field validation failed',
              errors: validation.errors,
            });
            return;
          }
        }
        product.customFields = req.body.customFields;
      }

      // Check SKU uniqueness if changed
      if (req.body.sku && req.body.sku.toUpperCase() !== product.sku) {
        const existingSku = await Product.findOne({
          shopId,
          sku: req.body.sku.toUpperCase().trim(),
          _id: { $ne: product._id },
        });
        if (existingSku) {
          res.status(400).json({ success: false, message: `SKU "${req.body.sku}" already exists in your shop` });
          return;
        }
        product.sku = req.body.sku.toUpperCase().trim();
      }

      // Update remaining fields safely
      const fieldsToUpdate = [
        'name',
        'description',
        'categoryId',
        'images',
        'price',
        'compareAtPrice',
        'unit',
        'minimumOrderQuantity',
        'trackInventory',
        'stockQuantity',
        'isActive',
        'isFeatured',
        'variants',
      ];

      fieldsToUpdate.forEach((field) => {
        if (req.body[field] !== undefined) {
          (product as any)[field] = req.body[field];
        }
      });

      await product.save();

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        shopId,
        action: 'UPDATE_PRODUCT',
        targetEntity: 'Product',
        targetId: product._id.toString(),
      });

      res.json({ success: true, message: 'Product updated successfully', data: { product } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  public static async deleteProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);
      const result = await Product.findOneAndDelete({ _id: req.params.id, shopId });
      if (!result) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        shopId,
        action: 'DELETE_PRODUCT',
        targetEntity: 'Product',
        targetId: req.params.id,
      });

      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Category management
   */
  public static async getCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);
      const categories = await Category.find({ shopId }).sort({ displayOrder: 1, name: 1 });
      res.json({ success: true, data: { categories } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async createCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);

      let baseSlug = slugify(req.body.name, { lower: true, strict: true }) || 'category';
      let slug = baseSlug;
      let counter = 1;
      while (await Category.findOne({ shopId, slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const category = await Category.create({
        ...req.body,
        shopId,
        slug,
      });

      res.status(201).json({ success: true, message: 'Category created', data: { category } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  public static async updateCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);
      const category = await Category.findOne({ _id: req.params.id, shopId });
      if (!category) {
        res.status(404).json({ success: false, message: 'Category not found' });
        return;
      }

      Object.assign(category, req.body);
      await category.save();

      res.json({ success: true, message: 'Category updated', data: { category } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  public static async deleteCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);

      // Check if products are assigned to this category
      const productCount = await Product.countDocuments({ shopId, categoryId: req.params.id });
      if (productCount > 0) {
        res.status(400).json({
          success: false,
          message: `Cannot delete category: ${productCount} product(s) are currently assigned to it. Please reassign or delete those products first.`,
        });
        return;
      }

      const result = await Category.findOneAndDelete({ _id: req.params.id, shopId });
      if (!result) {
        res.status(404).json({ success: false, message: 'Category not found' });
        return;
      }

      res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Order management
   */
  public static async getOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 15));
      const skip = (page - 1) * limit;

      const filter: any = { shopId };

      if (req.query.status) {
        filter.orderStatus = req.query.status;
      }

      if (req.query.paymentStatus) {
        filter.paymentStatus = req.query.paymentStatus;
      }

      if (req.query.search) {
        const search = (req.query.search as string).trim();
        filter.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { 'customerSnapshot.name': { $regex: search, $options: 'i' } },
          { 'customerSnapshot.phone': { $regex: search, $options: 'i' } },
        ];
      }

      const [orders, total] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
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

  public static async getOrderById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);
      const order = await Order.findOne({ _id: req.params.id, shopId })
        .populate('statusHistory.changedBy', 'name role')
        .populate('paymentHistory.recordedBy', 'name role');

      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      res.json({ success: true, data: { order } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async updateOrderStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);
      const { status, note, cancellationReason } = req.body;

      const order = await Order.findOne({ _id: req.params.id, shopId });
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      order.orderStatus = status;
      if (status === 'cancelled' && cancellationReason) {
        order.cancellationReason = cancellationReason;
      }

      order.statusHistory.push({
        status,
        changedBy: new Types.ObjectId(req.user!.userId),
        note: note || `Order marked as ${status}`,
        timestamp: new Date(),
      });

      await order.save();

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        shopId,
        action: 'UPDATE_ORDER_STATUS',
        targetEntity: 'Order',
        targetId: order._id.toString(),
        metadata: { newStatus: status, note },
      });

      res.json({ success: true, message: `Order status updated to ${status}`, data: { order } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  public static async updatePaymentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);
      const { status, amount, reference, note } = req.body;

      const order = await Order.findOne({ _id: req.params.id, shopId });
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      order.paymentStatus = status;
      order.paymentHistory.push({
        status,
        amount: amount !== undefined ? amount : order.grandTotal,
        reference,
        recordedBy: new Types.ObjectId(req.user!.userId),
        note,
        timestamp: new Date(),
      });

      await order.save();

      await AuditService.logAction({
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        shopId,
        action: 'UPDATE_PAYMENT_STATUS',
        targetEntity: 'Order',
        targetId: order._id.toString(),
        metadata: { paymentStatus: status, amount, reference },
      });

      res.json({ success: true, message: `Payment status updated to ${status}`, data: { order } });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  public static async addOrderNote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);
      const { internalNotes } = req.body;

      const order = await Order.findOne({ _id: req.params.id, shopId });
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      order.internalNotes = internalNotes;
      await order.save();

      res.json({ success: true, message: 'Order internal notes saved', data: { order } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async downloadInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);
      const order = await Order.findOne({ _id: req.params.id, shopId });
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      const shop = await Shop.findById(shopId);
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      const pdfBuffer = await InvoiceService.generateInvoiceBuffer(order, shop);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Invoice-${order.orderNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async uploadMedia(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const shopId = ShopAdminController.getShopId(req);
      if (!(req as any).file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }

      const file = (req as any).file;
      const imageUrl = await UploadService.uploadImage(
        file.buffer,
        file.mimetype,
        `wholesale_catalogue/${shopId}`
      );

      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: { url: imageUrl },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
