import { Request, Response } from 'express';
import { Shop } from '../models/Shop';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { PlatformSetting } from '../models/PlatformSetting';
import { ProductFormService } from '../services/productForm.service';

export class PublicController {
  /**
   * Platform landing page overview data
   */
  public static async getLandingPageData(_req: Request, res: Response): Promise<void> {
    try {
      const setting = await PlatformSetting.findOne() || {
        platformName: 'WholesaleFlow',
        supportEmail: 'support@wholesaleflow.com',
        supportPhone: '+91 98765 43210',
      };

      const totalActiveShops = await Shop.countDocuments({ status: 'active' });
      const featuredShops = await Shop.find({ status: 'active' })
        .select('name slug description logo banner contactPhone whatsappNumber address accentColor')
        .limit(6)
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: {
          settings: setting,
          totalShops: totalActiveShops,
          featuredShops,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Shop details by unique URL slug
   */
  public static async getShopBySlug(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug.toLowerCase().trim();
      const shop = await Shop.findOne({ slug });

      if (!shop) {
        res.status(404).json({
          success: false,
          message: `Shop "${slug}" not found on this platform`,
        });
        return;
      }

      if (shop.status === 'suspended') {
        res.status(403).json({
          success: false,
          isSuspended: true,
          message: 'This wholesale catalogue has been suspended by the platform administrator.',
          shop: { name: shop.name, slug: shop.slug },
        });
        return;
      }

      if (shop.status === 'inactive') {
        res.status(403).json({
          success: false,
          isInactive: true,
          message: 'This wholesale catalogue is temporarily unavailable.',
          shop: { name: shop.name, slug: shop.slug },
        });
        return;
      }

      const categories = await Category.find({ shopId: shop._id, isActive: true })
        .sort({ displayOrder: 1, name: 1 })
        .select('name slug image description displayOrder');

      const featuredProducts = await Product.find({
        shopId: shop._id,
        isActive: true,
        isFeatured: true,
      })
        .limit(8)
        .select('name slug sku price compareAtPrice unit images minimumOrderQuantity trackInventory stockQuantity isFeatured');

      res.json({
        success: true,
        data: {
          shop,
          categories,
          featuredProducts,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Filtered & paginated product catalogue for a shop
   */
  public static async getShopProducts(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug.toLowerCase().trim();
      const shop = await Shop.findOne({ slug, status: 'active' });

      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found or inactive' });
        return;
      }

      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 12));
      const skip = (page - 1) * limit;

      const filter: any = {
        shopId: shop._id,
        isActive: true,
      };

      const andClauses: any[] = [];

      // Search query
      const search = (req.query.search as string)?.trim();
      if (search) {
        andClauses.push({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { sku: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        });
      }

      // In-stock availability filter
      if (req.query.inStock === 'true') {
        andClauses.push({
          $or: [
            { trackInventory: false },
            { stockQuantity: { $gt: 0 } },
          ],
        });
      }

      // Category filter
      if (req.query.categoryId) {
        filter.categoryId = req.query.categoryId;
      } else if (req.query.categorySlug) {
        const cat = await Category.findOne({ shopId: shop._id, slug: req.query.categorySlug });
        if (cat) {
          filter.categoryId = cat._id;
        }
      }

      // Price filter
      if (req.query.minPrice || req.query.maxPrice) {
        filter.price = {};
        if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice as string);
        if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice as string);
      }

      if (andClauses.length > 0) {
        filter.$and = andClauses;
      }

      // Sort
      let sort: any = { createdAt: -1 };
      const sortBy = req.query.sortBy as string;
      if (sortBy === 'price_asc') sort = { price: 1 };
      else if (sortBy === 'price_desc') sort = { price: -1 };
      else if (sortBy === 'name') sort = { name: 1 };
      else if (sortBy === 'featured') sort = { isFeatured: -1, createdAt: -1 };

      const [products, total] = await Promise.all([
        Product.find(filter)
          .populate('categoryId', 'name slug')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .select('-__v'),
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

  /**
   * Product details by shop slug and product slug
   */
  public static async getProductBySlug(req: Request, res: Response): Promise<void> {
    try {
      const shopSlug = req.params.shopSlug.toLowerCase().trim();
      const productSlug = req.params.productSlug.toLowerCase().trim();

      const shop = await Shop.findOne({ slug: shopSlug, status: 'active' });
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found or inactive' });
        return;
      }

      const product = await Product.findOne({
        shopId: shop._id,
        slug: productSlug,
        isActive: true,
      }).populate('categoryId', 'name slug');

      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found in this shop' });
        return;
      }

      // Related products from the same shop
      const relatedProducts = await Product.find({
        shopId: shop._id,
        categoryId: product.categoryId,
        _id: { $ne: product._id },
        isActive: true,
      })
        .limit(4)
        .select('name slug sku price compareAtPrice unit images minimumOrderQuantity trackInventory stockQuantity');

      // Effective public form fields for display
      const { fields: formFields } = await ProductFormService.getEffectiveFormForShop(shop._id, true);

      res.json({
        success: true,
        data: {
          shop,
          product,
          formFields,
          relatedProducts,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Shop categories list
   */
  public static async getShopCategories(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug.toLowerCase().trim();
      const shop = await Shop.findOne({ slug, status: 'active' });
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      const categories = await Category.find({ shopId: shop._id, isActive: true })
        .sort({ displayOrder: 1, name: 1 });

      res.json({
        success: true,
        data: { categories },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
