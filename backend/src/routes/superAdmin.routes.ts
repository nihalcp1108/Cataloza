import { Router } from 'express';
import { SuperAdminController } from '../controllers/superAdmin.controller';
import { authenticate, authorizeRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createShopSchema } from '../validators/shop.validator';

const router = Router();

// Strict platform super admin authorization
router.use(authenticate);
router.use(authorizeRole('super_admin'));

// Platform dashboard
router.get('/dashboard', SuperAdminController.getDashboard);

// Shop management
router.get('/shops', SuperAdminController.getShops);
router.post('/shops', validate(createShopSchema), SuperAdminController.createShop);
router.get('/shops/:id', SuperAdminController.getShopById);
router.get('/shops/:id/details', SuperAdminController.getShopFullDetails);
router.patch('/shops/:id', SuperAdminController.updateShop);
router.patch('/shops/:id/toggle-status', SuperAdminController.toggleShopStatus);
router.patch('/shops/:id/suspend', SuperAdminController.suspendShop);
router.patch('/shops/:id/reactivate', SuperAdminController.reactivateShop);

// Shop Admins
router.get('/admins', SuperAdminController.getShopAdmins);
router.post('/admins', SuperAdminController.createShopAdmin);
router.patch('/admins/:id', SuperAdminController.updateShopAdmin);
router.post('/admins/:id/resend-invitation', SuperAdminController.resendAdminInvitation);
router.post('/admins/:id/revoke-sessions', SuperAdminController.revokeAdminSessions);

// Platform Orders Overview
router.get('/orders', SuperAdminController.getPlatformOrders);

// Audit Logs
router.get('/audit-logs', SuperAdminController.getAuditLogs);

// Platform Settings
router.get('/settings', SuperAdminController.getSettings);
router.patch('/settings', SuperAdminController.updateSettings);

// Email Diagnostic & Verification
router.get('/email/diagnostic', SuperAdminController.getEmailDiagnostic);
router.post('/email/test', SuperAdminController.sendTestEmail);

export default router;
