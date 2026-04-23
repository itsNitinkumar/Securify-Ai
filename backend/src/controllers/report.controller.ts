import { Request, Response } from 'express';
import ReportService from '../services/report.service';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';
import * as fs from 'fs';
import * as path from 'path';

class ReportController {
  // Generate Report
  static generateReport = asyncHandler(async (req: Request, res: Response) => {
    const { project_id, template_id, format } = req.body;
    const user = (req as any).user;

    if (!project_id) {
      throw new ApiError(400, 'Project ID is required');
    }

    const reportFormat = format || 'docx';
    if (!['docx', 'pdf'].includes(reportFormat)) {
      throw new ApiError(400, 'Format must be docx or pdf');
    }

    const result = await ReportService.generateReport(
      project_id,
      template_id || null,
      user.id,
      reportFormat
    );

    ApiResponse.success(res, 201, 'Report generated successfully', {
      reportId: result.reportId,
      downloadUrl: `/api/reports/${result.reportId}/download`,
    });
  });

  // Download Report
  static downloadReport = asyncHandler(async (req: Request, res: Response) => {
    const reportId = parseInt(req.params.id);

    const filePath = await ReportService.getReportFile(reportId);
    const fileName = path.basename(filePath);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Error downloading report:', err);
        throw new ApiError(500, 'Failed to download report');
      }
    });
  });

  // Get Reports by Project
  static getReportsByProject = asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const ReportModel = (await import('../models/report.model')).default;
    
    const reports = await ReportModel.getReportsByProject(projectId);
    ApiResponse.success(res, 200, 'Reports retrieved successfully', reports);
  });

  // Delete Report
  static deleteReport = asyncHandler(async (req: Request, res: Response) => {
    const reportId = parseInt(req.params.id);
    const user = (req as any).user;

    // Only managers and admins can delete reports
    if (user.role !== 'manager' && user.role !== 'admin') {
      throw new ApiError(403, 'Only managers and admins can delete reports');
    }

    await ReportService.deleteReport(reportId);
    ApiResponse.success(res, 200, 'Report deleted successfully');
  });

  // Template Management
  static createTemplate = asyncHandler(async (req: Request, res: Response) => {
    const { name, description, template_data, logo_path, is_default } = req.body;
    const user = (req as any).user;

    if (!name || !template_data) {
      throw new ApiError(400, 'Name and template data are required');
    }

    const template = await ReportService.createTemplate({
      name,
      description,
      template_data,
      logo_path,
      is_default,
      created_by: user.id,
    });

    ApiResponse.success(res, 201, 'Template created successfully', template);
  });

  static getAllTemplates = asyncHandler(async (req: Request, res: Response) => {
    const templates = await ReportService.getAllTemplates();
    ApiResponse.success(res, 200, 'Templates retrieved successfully', templates);
  });

  static getTemplate = asyncHandler(async (req: Request, res: Response) => {
    const templateId = parseInt(req.params.id);
    const template = await ReportService.getTemplateById(templateId);
    ApiResponse.success(res, 200, 'Template retrieved successfully', template);
  });

  static updateTemplate = asyncHandler(async (req: Request, res: Response) => {
    const templateId = parseInt(req.params.id);
    const { name, description, template_data, logo_path, is_default } = req.body;

    const template = await ReportService.updateTemplate(templateId, {
      name,
      description,
      template_data,
      logo_path,
      is_default,
    });

    ApiResponse.success(res, 200, 'Template updated successfully', template);
  });

  static deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
    const templateId = parseInt(req.params.id);
    await ReportService.deleteTemplate(templateId);
    ApiResponse.success(res, 200, 'Template deleted successfully');
  });
}

export default ReportController;
