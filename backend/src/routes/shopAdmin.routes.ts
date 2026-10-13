import { Router } from 'express';
import multer from 'multer';
import { ShopAdminController } from '../controllers/shopAdmin.controller';
import { authenticate, authorizeRole, requireShopAccess } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator';
import {
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  addOrderNoteSchema,
} from '../validators/order.validator';
import { updateShopSchema } from '../validators/shop.validator';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

const router = Router();

// Require shop admin authentication and shop tenant scoping
router.use(authenticate);
router.use(authorizeRole('shop_admin', 'super_admin'));
router.use(requireShopAccess);

// Dashboard
router.get('/dashboard', ShopAdminController.getDashboard);

// Shop settings
router.get('/shop', ShopAdminController.getShop);
router.patch('/shop', validate(updateShopSchema), ShopAdminController.updateShop);

// Shop Subscription & Usage
router.get('/subscription', async (req: any, res: any) => {
  const shopId = req.shopId || (req.user?.assignedShopIds && req.user.assignedShopIds[0]);
  req.params.shopId = shopId ? shopId.toString() : '';
  const { SubscriptionController } = await import('../controllers/subscription.controller');
  await SubscriptionController.getShopSubscription(req, res);
});

// Effective Product Form Schema for this shop
router.get('/product-form', async (req: any, res: any) => {
  const shopId = req.shopId || (req.user?.assignedShopIds && req.user.assignedShopIds[0]);
  req.params.shopId = shopId ? shopId.toString() : '';
  const { ProductFormController } = await import('../controllers/productForm.controller');
  await ProductFormController.getEffectiveForm(req, res);
});

// Products
router.get('/products', ShopAdminController.getProducts);
router.post('/products', validate(createProductSchema), ShopAdminController.createProduct);
router.get('/products/:id', ShopAdminController.getProductById);
router.patch('/products/:id', validate(updateProductSchema), ShopAdminController.updateProduct);
router.delete('/products/:id', ShopAdminController.deleteProduct);

// Categories
router.get('/categories', ShopAdminController.getCategories);
router.post('/categories', validate(createCategorySchema), ShopAdminController.createCategory);
router.patch('/categories/:id', validate(updateCategorySchema), ShopAdminController.updateCategory);
router.delete('/categories/:id', ShopAdminController.deleteCategory);

// Orders
router.get('/orders', ShopAdminController.getOrders);
router.get('/orders/:id', ShopAdminController.getOrderById);
router.patch('/orders/:id/status', validate(updateOrderStatusSchema), ShopAdminController.updateOrderStatus);
router.patch('/orders/:id/payment', validate(updatePaymentStatusSchema), ShopAdminController.updatePaymentStatus);
router.post('/orders/:id/notes', validate(addOrderNoteSchema), ShopAdminController.addOrderNote);
router.get('/orders/:id/invoice', ShopAdminController.downloadInvoice);

// Media Upload
router.post('/upload', upload.single('image'), ShopAdminController.uploadMedia);

export default router;
