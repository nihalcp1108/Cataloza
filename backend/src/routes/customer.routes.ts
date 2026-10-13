import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { authenticate, authorizeRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateCustomerProfileSchema, customerAddressSchema } from '../validators/customer.validator';

const router = Router();

// Protect all customer routes
router.use(authenticate);

// Profile
router.get('/me', CustomerController.getProfile);
router.patch('/me', validate(updateCustomerProfileSchema), CustomerController.updateProfile);

// Saved Delivery Addresses
router.get('/me/addresses', CustomerController.getAddresses);
router.post('/me/addresses', validate(customerAddressSchema), CustomerController.createAddress);
router.patch('/me/addresses/:id', validate(customerAddressSchema.partial()), CustomerController.updateAddress);
router.delete('/me/addresses/:id', CustomerController.deleteAddress);

// Orders History & Invoice
router.get('/me/orders', CustomerController.getOrders);
router.get('/me/orders/:id', CustomerController.getOrderById);
router.get('/me/orders/:id/invoice', CustomerController.downloadInvoice);

export default router;
