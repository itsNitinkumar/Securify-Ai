import { Router } from 'express';
import DashboardController from '../controllers/dashboard.controller';
import { protect } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// Overall statistics
router.get('/stats', DashboardController.getOverallStats);

// Findings analytics
router.get('/findings/by-severity', DashboardController.getFindingsBySeverity);
router.get('/findings/by-status', DashboardController.getFindingsByStatus);
router.get('/findings/trend', DashboardController.getFindingsTrend);

// Activity
router.get('/activity/recent', DashboardController.getRecentActivity);

// Analysts (Manager only)
router.get('/analysts/top', DashboardController.getTopAnalysts);

// Project stats
router.get('/projects/:project_id/stats', DashboardController.getProjectStats);

// User activity
router.get('/users/:user_id/activity', DashboardController.getUserActivity);
router.get('/my-activity', DashboardController.getUserActivity);

export default router;
