import { Router } from 'express';
import DashboardController from '../controllers/dashboard.controller';
import { protect, authorize } from '../middlewares/auth';
import { Permissions } from '../types/permissions';

const router = Router();

// All routes require authentication
router.use(protect);

// Overall statistics
router.get('/stats', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getOverallStats);

// Findings analytics
router.get('/findings/by-severity', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getFindingsBySeverity);
router.get('/findings/by-status', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getFindingsByStatus);
router.get('/findings/trend', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getFindingsTrend);

// Activity
router.get('/activity/recent', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getRecentActivity);

// Top Reporters
router.get('/reporters/top', authorize(Permissions.VIEW_USERS), DashboardController.getTopReporters);

// Project stats
router.get('/projects/:project_id/stats', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getProjectStats);

// User activity
router.get('/users/:user_id/activity', authorize(Permissions.VIEW_USERS), DashboardController.getUserActivity);
router.get('/my-activity', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getUserActivity);

export default router;
