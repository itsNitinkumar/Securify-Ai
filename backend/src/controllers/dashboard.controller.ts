import { Request, Response } from 'express';
import DashboardService from '../services/dashboard.service';
import asyncHandler from '../utils/asyncHandler';

class DashboardController {
  // Get overall dashboard statistics
  static getOverallStats = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;

    // Analysts can only see their own stats
    let stats;
    if (user.role === 'analyst') {
      stats = await DashboardService.getUserActivitySummary(user.id);
    } else {
      stats = await DashboardService.getOverallStats();
    }

    res.json({
      success: true,
      data: stats,
    });
  });

  // Get findings by severity
  static getFindingsBySeverity = asyncHandler(async (_req: Request, res: Response) => {
    const data = await DashboardService.getFindingsBySeverity();

    res.json({
      success: true,
      data,
    });
  });

  // Get findings by status
  static getFindingsByStatus = asyncHandler(async (_req: Request, res: Response) => {
    const data = await DashboardService.getFindingsByStatus();

    res.json({
      success: true,
      data,
    });
  });

  // Get recent activity
  static getRecentActivity = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await DashboardService.getRecentActivity(limit);

    res.json({
      success: true,
      data,
    });
  });

  // Get top analysts
  static getTopAnalysts = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;

    // Only managers can see top analysts
    if (user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const limit = parseInt(req.query.limit as string) || 5;
    const data = await DashboardService.getTopAnalysts(limit);

    return res.json({
      success: true,
      data,
    });
  });

  // Get project statistics
  static getProjectStats = asyncHandler(async (req: Request, res: Response) => {
    const projectId = Array.isArray(req.params.project_id) 
      ? req.params.project_id[0] 
      : req.params.project_id;

    const data = await DashboardService.getProjectStats(parseInt(projectId));

    res.json({
      success: true,
      data,
    });
  });

  // Get findings trend
  static getFindingsTrend = asyncHandler(async (_req: Request, res: Response) => {
    const data = await DashboardService.getFindingsTrend();

    res.json({
      success: true,
      data,
    });
  });

  // Get user activity summary
  static getUserActivity = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const userId = req.params.user_id 
      ? parseInt(Array.isArray(req.params.user_id) ? req.params.user_id[0] : req.params.user_id)
      : user.id;

    // Users can only see their own activity unless they're managers
    if (user.role !== 'manager' && userId !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const data = await DashboardService.getUserActivitySummary(userId);

    return res.json({
      success: true,
      data,
    });
  });
}

export default DashboardController;
