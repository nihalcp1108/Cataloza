import { Router } from 'express';
import { ProductFormController } from '../controllers/productForm.controller';
import { authenticate, authorizeRole } from '../middleware/auth';

const router = Router();

// Public / Shop Admin route to fetch effective published form for a shop
router.get('/effective', ProductFormController.getEffectiveForm);
router.get('/effective/:shopId', ProductFormController.getEffectiveForm);

// Super Admin exclusive form builder routes
router.use(authenticate);
router.use(authorizeRole('super_admin'));

router.get('/templates', ProductFormController.getTemplates);
router.post('/templates', ProductFormController.createTemplate);
router.get('/templates/:id', ProductFormController.getTemplateById);
router.patch('/templates/:id', ProductFormController.updateTemplate);
router.post('/templates/:id/duplicate', ProductFormController.duplicateTemplate);
router.post('/templates/:id/draft', ProductFormController.saveDraft);
router.post('/templates/:id/publish', ProductFormController.publishVersion);
router.post('/assign', ProductFormController.assignTemplate);

export default router;
