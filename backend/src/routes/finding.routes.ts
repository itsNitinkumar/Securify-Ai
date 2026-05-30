import { Router } from 'express';
import FindingController from '../controllers/finding.controller';
import { protect, authorize, authorizeFindingAccess } from '../middlewares/auth';
import { Permissions } from '../types/permissions';
import { aiGenerationLimiter, apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

// All routes require authentication
router.use(protect);

// Generate AI content only (no finding creation)
router.post('/generate-content', authorize(Permissions.CREATE_FINDINGS), aiGenerationLimiter, FindingController.generateContent);

// Generate false positive content using AI
router.post('/generate-false-positive-content', authorize(Permissions.CREATE_FINDINGS), aiGenerationLimiter, FindingController.generateFalsePositiveContent);

// Generate finding using AI
router.post('/generate', authorize(Permissions.CREATE_FINDINGS), aiGenerationLimiter, FindingController.generateFinding);

// Create finding manually
router.post('/', authorize(Permissions.CREATE_FINDINGS), apiLimiter, FindingController.createFinding);

// Natural language query - All authenticated users (with AI rate limit)
router.post('/query', aiGenerationLimiter, FindingController.queryFindings);

// CRUD operations (with general API rate limit)
router.get('/', authorize(Permissions.VIEW_FINDINGS), apiLimiter, FindingController.getAllFindings);
router.get('/:id', authorize(Permissions.VIEW_FINDINGS), apiLimiter, FindingController.getFinding);
router.put('/:id', authorize(Permissions.EDIT_FINDINGS), authorizeFindingAccess(), apiLimiter, FindingController.updateFinding);
router.delete('/:id', authorize(Permissions.DELETE_FINDINGS), authorizeFindingAccess(), apiLimiter, FindingController.deleteFinding);

// AI regeneration
router.post('/:id/regenerate', authorize(Permissions.EDIT_FINDINGS), authorizeFindingAccess(), aiGenerationLimiter, FindingController.regenerateSection);

// Approval - Manager only
router.post('/:id/approve', authorize(Permissions.APPROVE_FINDINGS), apiLimiter, FindingController.approveFinding);

// Request changes - Manager only
router.post('/:id/request-changes', authorize(Permissions.REQUEST_FINDING_CHANGES), apiLimiter, FindingController.requestChanges);

// Submit for review - Reporter
router.post('/:id/submit-review', authorize(Permissions.CREATE_FINDINGS), authorizeFindingAccess(), apiLimiter, FindingController.submitForReview);

// Version history - All can view
router.get('/:id/versions', authorize(Permissions.VIEW_FINDINGS), apiLimiter, FindingController.getVersionHistory);
router.get('/:id/versions/:version', authorize(Permissions.VIEW_FINDINGS), apiLimiter, FindingController.getVersion);

// Import findings from another project
router.post('/import', authorize(Permissions.CREATE_FINDINGS), apiLimiter, FindingController.importFromProject as any);

export default router;
