import { Router } from 'express';
import { CheckoutController } from '../controllers/checkout.controller';
import { optionalAuthenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { guestCheckoutSchema } from '../validators/order.validator';
import { checkoutLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public guest order endpoint: POST /api/v1/shops/:slug/orders/guest
router.post(
  '/:slug/orders/guest',
  checkoutLimiter,
  optionalAuthenticate,
  validate(guestCheckoutSchema),
  CheckoutController.guestCheckout
);

// Alias: POST /api/v1/shops/:slug/orders
router.post(
  '/:slug/orders',
  checkoutLimiter,
  optionalAuthenticate,
  validate(guestCheckoutSchema),
  CheckoutController.guestCheckout
);

// Standard checkout endpoint: POST /api/v1/shops/:slug/checkout
router.post(
  '/:slug/checkout',
  checkoutLimiter,
  optionalAuthenticate,
  CheckoutController.checkout
);

// Public Order confirmation endpoint (secured via unguessable token or ownership)
router.get(
  '/:slug/orders/:id/confirmation',
  optionalAuthenticate,
  CheckoutController.getOrderConfirmation
);

// Public Order invoice PDF download endpoint
router.get(
  '/:slug/orders/:id/invoice',
  optionalAuthenticate,
  CheckoutController.downloadInvoice
);

export default router;
