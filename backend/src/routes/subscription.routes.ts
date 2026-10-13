import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { authenticate, authorizeRole } from '../middleware/auth';

const router = Router();

// Public plan listing
router.get('/plans', SubscriptionController.getPlans);

// Authenticated routes
router.use(authenticate);

// Shop Admin & Super Admin view shop subscription & usage
router.get('/shop/:shopId', SubscriptionController.getShopSubscription);

// Super Admin exclusive management routes
router.use(authorizeRole('super_admin'));

router.post('/plans', SubscriptionController.createPlan);
router.patch('/plans/:id', SubscriptionController.updatePlan);
router.delete('/plans/:id', SubscriptionController.deletePlan);
router.get('/assignments', SubscriptionController.getAssignments);
router.post('/assign', SubscriptionController.assignPlan);
router.post('/record-payment', SubscriptionController.recordPayment);

export default router;
