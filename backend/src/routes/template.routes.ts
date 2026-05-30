import { Router } from 'express';
import TemplateController from '../controllers/template.controller';
import { protect, authorize } from '../middlewares/auth';
import { Permissions } from '../types/permissions';

const router = Router();

// All routes require authentication
router.use(protect);

// Get all templates - All authenticated users can view
router.get('/', authorize(Permissions.VIEW_TEMPLATES), TemplateController.getAllTemplates as any);

// Get default template - All authenticated users
router.get('/default', authorize(Permissions.VIEW_TEMPLATES), TemplateController.getDefaultTemplate as any);

// Get user's templates - All authenticated users
router.get('/my-templates', authorize(Permissions.VIEW_TEMPLATES), TemplateController.getUserTemplates as any);

// Get specific template - All authenticated users
router.get('/:id', authorize(Permissions.VIEW_TEMPLATES), TemplateController.getTemplate as any);

// Create template - Manager/Admin only
router.post('/', authorize(Permissions.MANAGE_TEMPLATES), TemplateController.createTemplate as any);

// Update template - Manager/Admin only
router.put('/:id', authorize(Permissions.MANAGE_TEMPLATES), TemplateController.updateTemplate as any);

// Delete template - Manager/Admin only
router.delete('/:id', authorize(Permissions.MANAGE_TEMPLATES), TemplateController.deleteTemplate as any);

// Set as default - Manager/Admin only
router.post('/:id/set-default', authorize(Permissions.MANAGE_TEMPLATES), TemplateController.setDefaultTemplate as any);

export default router;
