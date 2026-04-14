import { Router } from 'express';
import FindingController from '../controllers/finding.controller';
import { protect, requireRole } from '../middlewares/auth';
import { aiGenerationLimiter, apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

// All routes require authentication
router.use(protect);

// Generate AI content only (no finding creation) - Analyst, Reviewer, Manager (with AI rate limit)
router.post('/generate-content', requireRole('analyst', 'reviewer', 'manager'), aiGenerationLimiter, FindingController.generateContent);

// Generate finding using AI - Analyst, Reviewer, Manager (with AI rate limit)
router.post('/generate', requireRole('analyst', 'reviewer', 'manager'), aiGenerationLimiter, FindingController.generateFinding);

// Create finding manually - Analyst, Reviewer, Manager
router.post('/', requireRole('analyst', 'reviewer', 'manager'), apiLimiter, FindingController.createFinding);

// Natural language query - All authenticated users (with AI rate limit)
router.post('/query', aiGenerationLimiter, FindingController.queryFindings);

// CRUD operations (with general API rate limit)
router.get('/', apiLimiter, FindingController.getAllFindings); // All can view
router.get('/:id', apiLimiter, FindingController.getFinding); // All can view
router.put('/:id', requireRole('analyst', 'reviewer', 'manager'), apiLimiter, FindingController.updateFinding); // Analyst, Reviewer, Manager can edit
router.delete('/:id', requireRole('analyst', 'manager'), apiLimiter, FindingController.deleteFinding); // Analyst and Manager can delete

// AI regeneration - Analyst, Reviewer, Manager (with AI rate limit)
router.post('/:id/regenerate', requireRole('analyst', 'reviewer', 'manager'), aiGenerationLimiter, FindingController.regenerateSection);

// Approval - Reviewer and Manager only
router.post('/:id/approve', requireRole('reviewer', 'manager'), apiLimiter, FindingController.approveFinding);

// Request changes - Reviewer and Manager only
router.post('/:id/request-changes', requireRole('reviewer', 'manager'), apiLimiter, FindingController.requestChanges);

// Submit for review - Analyst, Reviewer, Manager
router.post('/:id/submit-review', requireRole('analyst', 'reviewer', 'manager'), apiLimiter, FindingController.submitForReview);

// Version history - All can view
router.get('/:id/versions', apiLimiter, FindingController.getVersionHistory);
router.get('/:id/versions/:version', apiLimiter, FindingController.getVersion);

export default router;
