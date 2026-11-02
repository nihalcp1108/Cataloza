import { Router } from 'express';
import mongoose from 'mongoose';
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
  const isDbConnected = mongoose.connection.readyState === 1;
  const statusCode = isDbConnected ? 200 : 503;

  res.status(statusCode).json({
    status: isDbConnected ? 'healthy' : 'unhealthy',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    emailService: 'resend',
    emailConfigured: Boolean(config.resend.apiKey),
  });
});

// Mount modules
router.use('/auth', authRoutes);
router.use('/public', publicRoutes);
router.use('/customers', customerRoutes);
router.use('/shops', cartRoutes);
router.use('/shops', checkoutRoutes);
router.use('/public/shops', cartRoutes);
router.use('/public/shops', checkoutRoutes);
router.use('/shop-admin', shopAdminRoutes);
router.use('/super-admin', superAdminRoutes);
router.use('/forms', productFormRoutes);
router.use('/subscriptions', subscriptionRoutes);

export default router;
