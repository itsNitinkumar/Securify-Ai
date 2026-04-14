import { Router } from 'express';
import ReportController from '../controllers/report.controller';
import { protect, requireRole } from '../middlewares/auth';
import { reportGenerationLimiter, apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

// All routes require authentication
router.use(protect);

// Generate report - Manager only (with report generation rate limit)
router.post('/generate', requireRole('manager'), reportGenerationLimiter, ReportController.generateReport);

// Download report - Manager and Client can download
router.get('/:id/download', requireRole('manager', 'client'), apiLimiter, ReportController.downloadReport);

// Get reports for a project - Manager and Client
router.get('/project/:project_id', requireRole('manager', 'client'), apiLimiter, ReportController.getProjectReports);

export default router;
