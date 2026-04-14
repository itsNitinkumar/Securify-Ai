import { Router } from 'express';
import ProjectController from '../controllers/project.controller';
import { protect, requireRole } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// CRUD operations - Manager only
router.post('/', requireRole('manager'), ProjectController.createProject);
router.get('/', ProjectController.getAllProjects); // All authenticated users can list
router.get('/:id', ProjectController.getProject); // All authenticated users can view
router.get('/:id/with-findings', ProjectController.getProjectWithFindings);
router.put('/:id', requireRole('manager'), ProjectController.updateProject);
router.delete('/:id', requireRole('manager'), ProjectController.deleteProject);

export default router;
