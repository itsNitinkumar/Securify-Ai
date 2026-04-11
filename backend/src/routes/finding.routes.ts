import { Router } from 'express';
import FindingController from '../controllers/finding.controller';
import { protect } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// Generate finding using AI
router.post('/generate', FindingController.generateFinding);

// Natural language query
router.post('/query', FindingController.queryFindings);

// CRUD operations
router.get('/', FindingController.getAllFindings);
router.get('/:id', FindingController.getFinding);
router.put('/:id', FindingController.updateFinding);
router.delete('/:id', FindingController.deleteFinding);

// AI regeneration
router.post('/:id/regenerate', FindingController.regenerateSection);

// Approval (Manager only)
router.post('/:id/approve', FindingController.approveFinding);

// Version history
router.get('/:id/versions', FindingController.getVersionHistory);
router.get('/:id/versions/:version', FindingController.getVersion);

export default router;
