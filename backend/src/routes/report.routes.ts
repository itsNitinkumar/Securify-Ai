import { Router } from 'express';
import ReportController from '../controllers/report.controller';
import { protect, authorize } from '../middlewares/auth';
import { Permissions } from '../types/permissions';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

// All routes require authentication
router.use(protect);

// Report Generation - Manager and Admin only
router.post(
  '/generate',
  authorize(Permissions.GENERATE_REPORTS),
  apiLimiter,
  ReportController.generateReport
);

router.post(
  '/preview',
  authorize(Permissions.GENERATE_REPORTS),
  apiLimiter,
  ReportController.previewReport
);

// HTML Preview
router.post(
  '/preview/html',
  authorize(Permissions.VIEW_REPORTS),
  apiLimiter,
  ReportController.getHTMLPreview
);

// Download Report
router.get(
  '/:id/download',
  authorize(Permissions.VIEW_REPORTS),
  apiLimiter,
  ReportController.downloadReport
);

// Get Reports by Project
router.get(
  '/project/:projectId',
  authorize(Permissions.VIEW_REPORTS),
  apiLimiter,
  ReportController.getReportsByProject
);

// Delete Report - Manager and Admin only
router.delete(
  '/:id',
  authorize(Permissions.DELETE_REPORTS),
  apiLimiter,
  ReportController.deleteReport
);

// Template Management
router.post(
  '/templates',
  authorize(Permissions.MANAGE_TEMPLATES),
  apiLimiter,
  ReportController.createTemplate
);

router.get(
  '/templates',
  authorize(Permissions.VIEW_TEMPLATES),
  apiLimiter,
  ReportController.getAllTemplates
);

router.get(
  '/templates/:id',
  authorize(Permissions.VIEW_TEMPLATES),
  apiLimiter,
  ReportController.getTemplate
);

router.put(
  '/templates/:id',
  authorize(Permissions.MANAGE_TEMPLATES),
  apiLimiter,
  ReportController.updateTemplate
);

router.delete(
  '/templates/:id',
  authorize(Permissions.MANAGE_TEMPLATES),
  apiLimiter,
  ReportController.deleteTemplate
);

export default router;
