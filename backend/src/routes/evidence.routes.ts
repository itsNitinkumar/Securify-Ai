import { Router } from 'express';
import EvidenceController from '../controllers/evidence.controller';
import { protect, authorize } from '../middlewares/auth';
import { Permissions } from '../types/permissions';
import { evidenceUpload } from '../config/multer';
import { uploadLimiter, apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

// All routes require authentication
router.use(protect);

// Upload evidence
router.post('/upload', authorize(Permissions.UPLOAD_EVIDENCE), uploadLimiter, evidenceUpload.single('file'), EvidenceController.uploadEvidence);

// Get evidence for a finding - All can view
router.get('/finding/:finding_id', authorize(Permissions.VIEW_EVIDENCE), apiLimiter, EvidenceController.getEvidenceByFinding);

// Download evidence - All can download
router.get('/:id/download', authorize(Permissions.VIEW_EVIDENCE), apiLimiter, EvidenceController.downloadEvidence);

// Update evidence caption
router.put('/:id/caption', authorize(Permissions.UPLOAD_EVIDENCE), apiLimiter, EvidenceController.updateCaption);

// Delete evidence
router.delete('/:id', authorize(Permissions.DELETE_EVIDENCE), apiLimiter, EvidenceController.deleteEvidence);

export default router;
