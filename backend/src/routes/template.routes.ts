import { Router } from 'express';
import TemplateController from '../controllers/template.controller';
import { protect, requireRole } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// Get all templates - All authenticated users can view
router.get('/', TemplateController.getAllTemplates as any);

// Get default template - All authenticated users
router.get('/default', TemplateController.getDefaultTemplate as any);

// Get user's templates - All authenticated users
router.get('/my-templates', TemplateController.getUserTemplates as any);

// Get specific template - All authenticated users
router.get('/:id', TemplateController.getTemplate as any);

// Create template - Manager only
router.post('/', requireRole('manager'), TemplateController.createTemplate as any);

// Update template - Manager only
router.put('/:id', requireRole('manager'), TemplateController.updateTemplate as any);

// Delete template - Manager only
router.delete('/:id', requireRole('manager'), TemplateController.deleteTemplate as any);

// Set as default - Manager only
router.post('/:id/set-default', requireRole('manager'), TemplateController.setDefaultTemplate as any);

export default router;
