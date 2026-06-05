import { Request, Response } from 'express';
import DashboardService from '../services/dashboard.service';
import asyncHandler from '../utils/asyncHandler';

class DashboardController {
  // Get overall dashboard statistics
  static getOverallStats = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const permissions = (req as any).permissions || [];

    // Reporters see their own stats; managers/admins see overall
    let stats;
    if (permissions.includes('create_findings') && !permissions.includes('approve_findings')) {
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

  // Get top reporters
  static getTopReporters = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 5;
    const data = await DashboardService.getTopReporters(limit);

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
}

export default DashboardController;
