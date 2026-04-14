import { Router } from 'express';
import FindingLibraryController from '../controllers/finding-library.controller';
import { protect, requireRole } from '../middlewares/auth';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

// All routes require authentication
router.use(protect);

// Public routes (all authenticated users)
router.get('/', apiLimiter, FindingLibraryController.getAllTemplates as any);
router.get('/categories', apiLimiter, FindingLibraryController.getCategories as any);
router.get('/search', apiLimiter, FindingLibraryController.searchTemplates as any);
router.get('/category/:category', apiLimiter, FindingLibraryController.getByCategory as any);
router.get('/severity/:severity', apiLimiter, FindingLibraryController.getBySeverity as any);
router.get('/my-templates', apiLimiter, FindingLibraryController.getUserTemplates as any);
router.get('/:id', apiLimiter, FindingLibraryController.getTemplate as any);

// Clone template to finding - Analyst, Reviewer, Manager
router.post('/:id/clone', requireRole('analyst', 'reviewer', 'manager'), apiLimiter, FindingLibraryController.cloneToFinding as any);

// Create custom template - Analyst, Reviewer, Manager
router.post('/', requireRole('analyst', 'reviewer', 'manager'), apiLimiter, FindingLibraryController.createTemplate as any);

// Update template - Owner or Manager
router.put('/:id', requireRole('analyst', 'reviewer', 'manager'), apiLimiter, FindingLibraryController.updateTemplate as any);

// Delete template - Owner or Manager
router.delete('/:id', requireRole('analyst', 'reviewer', 'manager'), apiLimiter, FindingLibraryController.deleteTemplate as any);

export default router;
