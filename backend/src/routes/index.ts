import { Router } from 'express';
import { config } from '../config';
import authRoutes from './auth.routes';
import publicRoutes from './public.routes';
import customerRoutes from './customer.routes';
import cartRoutes from './cart.routes';
import checkoutRoutes from './checkout.routes';
import shopAdminRoutes from './shopAdmin.routes';
import superAdminRoutes from './superAdmin.routes';
import productFormRoutes from './productForm.routes';
import subscriptionRoutes from './subscription.routes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    smtpConfigured: Boolean(config.smtp.host && config.smtp.user && config.smtp.pass),
  });
});

// Mount modules
router.use('/auth', authRoutes);
router.use('/public', publicRoutes);
router.use('/customers', customerRoutes);
router.use('/shops', cartRoutes);
router.use('/shops', checkoutRoutes);
router.use('/shop-admin', shopAdminRoutes);
router.use('/super-admin', superAdminRoutes);
router.use('/forms', productFormRoutes);
router.use('/subscriptions', subscriptionRoutes);

export default router;
