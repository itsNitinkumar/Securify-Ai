import { Router } from 'express';
import ReportController from '../controllers/report.controller';
import { protect, requireRole } from '../middlewares/auth';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

// All routes require authentication
router.use(protect);

// Report Generation - Manager and Admin only
router.post(
  '/generate',
  requireRole('manager', 'admin'),
  apiLimiter,
  ReportController.generateReport
);

// Download Report - All authenticated users
router.get(
  '/:id/download',
  apiLimiter,
  ReportController.downloadReport
);

// Get Reports by Project - All authenticated users
router.get(
  '/project/:projectId',
  apiLimiter,
  ReportController.getReportsByProject
);

// Delete Report - Manager and Admin only
router.delete(
  '/:id',
  requireRole('manager', 'admin'),
  apiLimiter,
  ReportController.deleteReport
);

// Template Management - Manager and Admin only
router.post(
  '/templates',
  requireRole('manager', 'admin'),
  apiLimiter,
  ReportController.createTemplate
);

router.get(
  '/templates',
  apiLimiter,
  ReportController.getAllTemplates
);

router.get(
  '/templates/:id',
  apiLimiter,
  ReportController.getTemplate
);

router.put(
  '/templates/:id',
  requireRole('manager', 'admin'),
  apiLimiter,
  ReportController.updateTemplate
);

router.delete(
  '/templates/:id',
  requireRole('manager', 'admin'),
  apiLimiter,
  ReportController.deleteTemplate
);

export default router;
