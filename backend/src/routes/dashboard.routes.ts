import { Router } from 'express';
import DashboardController from '../controllers/dashboard.controller';
import { protect, authorize } from '../middlewares/auth';
import { Permissions } from '../types/permissions';

const router = Router();

router.use(protect);

router.get('/stats', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getOverallStats);
router.get('/findings/by-severity', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getFindingsBySeverity);
router.get('/findings/by-status', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getFindingsByStatus);
router.get('/findings/trend', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getFindingsTrend);
router.get('/findings/recent', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getRecentFindings);
router.get('/findings/by-category', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getFindingsByCategory);
router.get('/findings/by-domain', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getFindingsByDomain);
router.get('/mttr', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getMttr);
router.get('/remediation-velocity', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getRemediationVelocity);
router.get('/client-risk', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getClientRiskBreakdown);
router.get('/comments', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getCommentActivity);
router.get('/projects-by-status', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getProjectsByStatus);
router.get('/reporters/top', authorize(Permissions.VIEW_DASHBOARD, Permissions.VIEW_USERS), DashboardController.getTopReporters);
router.get('/projects/:project_id/stats', authorize(Permissions.VIEW_DASHBOARD), DashboardController.getProjectStats);

export default router;
