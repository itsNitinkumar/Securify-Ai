import { Router } from 'express';
import TemplateController from '../controllers/template.controller';
import { protect, requireRole } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// Get all templates - All authenticated users can view
router.get('/', TemplateController.getAllTemplates);

// Get default template - All authenticated users
router.get('/default', TemplateController.getDefaultTemplate);

// Get user's templates - All authenticated users
router.get('/my-templates', TemplateController.getUserTemplates);

// Get specific template - All authenticated users
router.get('/:id', TemplateController.getTemplate);

// Create template - Manager only
router.post('/', requireRole('manager'), TemplateController.createTemplate);

// Update template - Manager only
router.put('/:id', requireRole('manager'), TemplateController.updateTemplate);

// Delete template - Manager only
router.delete('/:id', requireRole('manager'), TemplateController.deleteTemplate);

// Set as default - Manager only
router.post('/:id/set-default', requireRole('manager'), TemplateController.setDefaultTemplate);

export default router;
