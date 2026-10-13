import { Router } from 'express';
import { CheckoutController } from '../controllers/checkout.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { checkoutSchema } from '../validators/order.validator';
import { checkoutLimiter } from '../middleware/rateLimiter';

const router = Router();

// Checkout must be authenticated & rate limited
router.post(
  '/:slug/checkout',
  checkoutLimiter,
  authenticate,
  validate(checkoutSchema),
  CheckoutController.checkout
);

export default router;
