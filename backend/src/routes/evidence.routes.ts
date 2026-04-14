import { Router } from 'express';
import EvidenceController from '../controllers/evidence.controller';
import { protect, requireRole } from '../middlewares/auth';
import { evidenceUpload } from '../config/multer';
import { uploadLimiter, apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

// All routes require authentication
router.use(protect);

// Upload evidence - Analyst, Reviewer, Manager (with upload rate limit)
router.post('/upload', requireRole('analyst', 'reviewer', 'manager'), uploadLimiter, evidenceUpload.single('file'), EvidenceController.uploadEvidence);

// Get evidence for a finding - All can view
router.get('/finding/:finding_id', apiLimiter, EvidenceController.getEvidenceByFinding);

// Download evidence - All can download
router.get('/:id/download', apiLimiter, EvidenceController.downloadEvidence);

// Update evidence caption - Analyst, Reviewer, Manager
router.put('/:id/caption', requireRole('analyst', 'reviewer', 'manager'), apiLimiter, EvidenceController.updateCaption);

// Delete evidence - Analyst, Manager
router.delete('/:id', requireRole('analyst', 'manager'), apiLimiter, EvidenceController.deleteEvidence);

export default router;
