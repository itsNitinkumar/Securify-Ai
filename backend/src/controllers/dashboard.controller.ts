import { Request, Response } from 'express';
import DashboardService from '../services/dashboard.service';
import asyncHandler from '../utils/asyncHandler';

class DashboardController {
  static getOverallStats = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const permissions = (req as any).permissions || [];

    let stats;
    if (permissions.includes('create_findings') && !permissions.includes('approve_findings')) {
      stats = await DashboardService.getUserActivitySummary(user.id);
    } else {
      stats = await DashboardService.getOverallStats();
    }

    res.json({ success: true, data: stats });
  });

  static getFindingsBySeverity = asyncHandler(async (_req: Request, res: Response) => {
    const data = await DashboardService.getFindingsBySeverity();
    res.json({ success: true, data });
  });

  static getFindingsByStatus = asyncHandler(async (_req: Request, res: Response) => {
    const data = await DashboardService.getFindingsByStatus();
    res.json({ success: true, data });
  });

  static getTopReporters = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 5;
    const data = await DashboardService.getTopReporters(limit);
    res.json({ success: true, data });
  });

  static getProjectStats = asyncHandler(async (req: Request, res: Response) => {
    const projectId = Array.isArray(req.params.project_id)
      ? req.params.project_id[0]
      : req.params.project_id;
    const data = await DashboardService.getProjectStats(parseInt(projectId));
    res.json({ success: true, data });
  });

  static getFindingsTrend = asyncHandler(async (_req: Request, res: Response) => {
    const data = await DashboardService.getFindingsTrend();
    res.json({ success: true, data });
  });

  static getMttr = asyncHandler(async (_req: Request, res: Response) => {
    const data = await DashboardService.getMttr();
    res.json({ success: true, data });
  });

  static getRemediationVelocity = asyncHandler(async (_req: Request, res: Response) => {
    const data = await DashboardService.getRemediationVelocity();
    res.json({ success: true, data });
  });

  static getFindingsByCategory = asyncHandler(async (_req: Request, res: Response) => {
    const data = await DashboardService.getFindingsByCategory();
    res.json({ success: true, data });
  });

  static getFindingsByDomain = asyncHandler(async (_req: Request, res: Response) => {
    const data = await DashboardService.getFindingsByDomain();
    res.json({ success: true, data });
  });

  static getClientRiskBreakdown = asyncHandler(async (_req: Request, res: Response) => {
    const data = await DashboardService.getClientRiskBreakdown();
    res.json({ success: true, data });
  });

  static getRecentFindings = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await DashboardService.getRecentFindings(limit);
    res.json({ success: true, data });
  });

  static getCommentActivity = asyncHandler(async (_req: Request, res: Response) => {
    const data = await DashboardService.getCommentActivity();
    res.json({ success: true, data });
  });

  static getProjectsByStatus = asyncHandler(async (_req: Request, res: Response) => {
    const data = await DashboardService.getProjectsByStatus();
    res.json({ success: true, data });
  });
}

export default DashboardController;
