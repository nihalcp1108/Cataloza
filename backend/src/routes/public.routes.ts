import { Router } from 'express';
import { PublicController } from '../controllers/public.controller';

const router = Router();

// Platform landing page
router.get('/landing', PublicController.getLandingPageData);

// Shop public catalogue endpoints
router.get('/shops/:slug', PublicController.getShopBySlug);
router.get('/shops/:slug/products', PublicController.getShopProducts);
router.get('/shops/:slug/products/:productSlug', PublicController.getProductBySlug);
router.get('/shops/:slug/categories', PublicController.getShopCategories);

export default router;
