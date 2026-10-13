import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { optionalAuthenticate } from '../middleware/auth';

const router = Router();

// Cart routes scoped by shop slug
router.get('/:slug/cart', optionalAuthenticate, CartController.getCart);
router.post('/:slug/cart/items', optionalAuthenticate, CartController.addItem);
router.patch('/:slug/cart/items', optionalAuthenticate, CartController.updateItem);
router.delete('/:slug/cart/items', optionalAuthenticate, CartController.removeItem);
router.delete('/:slug/cart', optionalAuthenticate, CartController.clearCart);

export default router;
