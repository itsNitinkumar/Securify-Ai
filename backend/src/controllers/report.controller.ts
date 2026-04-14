import { Request, Response } from 'express';
import ProjectModel from '../models/project.model';
import FindingModel from '../models/finding.model';
import ReportService from '../services/report.service';
import GoogleDriveService from '../services/google-drive.service';
import ActivityLogService from '../services/activity-log.service';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';
import pool from '../config/database';

class ReportController {
  // Generate report (DOCX or PDF)
  static generateReport = asyncHandler(async (req: Request, res: Response) => {
    const { project_id, format = 'docx', upload_to_drive = false, share_with_client = false, client_email } = req.body;
    const user = (req as any).user;

    if (!project_id) {
      throw new ApiError(400, 'Project ID is required');
    }

    if (!['docx', 'pdf'].includes(format)) {
      throw new ApiError(400, 'Format must be either docx or pdf');
    }

    // Only managers can generate reports
    if (user.role !== 'manager') {
      throw new ApiError(403, 'Only managers can generate reports');
    }

    // Get project
    const project = await ProjectModel.findById(parseInt(project_id));
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    // Get approved findings for the project
    const findings = await FindingModel.findAll({
      project_id: parseInt(project_id),
      status: 'approved',
    });

    if (findings.length === 0) {
      throw new ApiError(400, 'No approved findings found for this project');
    }

    // Generate filename
    const timestamp = Date.now();
    const filename = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.${format}`;

    // Generate report
    let filePath: string;
    if (format === 'docx') {
      filePath = await ReportService.generateDOCX({ project, findings }, filename);
    } else {
      filePath = await ReportService.generatePDF({ project, findings }, filename);
    }

    // Upload to Google Drive if requested
    let driveFileId: string | null = null;
    let driveLink: string | null = null;
    
    if (upload_to_drive && GoogleDriveService.isConfigured()) {
      const mimeType = format === 'docx' 
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf';
      
      driveFileId = await GoogleDriveService.uploadFile(filePath, filename, mimeType);

      if (driveFileId) {
        driveLink = await GoogleDriveService.getFileLink(driveFileId);
        
        // Share with client if requested
        if (share_with_client && client_email) {
          await GoogleDriveService.shareFile(driveFileId, client_email, 'reader');
        }
      }
    }

    // Save report metadata
    const report = await ReportService.saveReportMetadata({
      project_id: parseInt(project_id),
      report_name: filename,
      file_path: filePath,
      file_type: format,
      generated_by: user.id,
    });

    // Update with Google Drive ID if uploaded
    if (driveFileId) {
      await pool.query(
        'UPDATE generated_reports SET google_drive_id = $1 WHERE id = $2',
        [driveFileId, report.id]
      );
    }

    // Log activity
    await ActivityLogService.log({
      user_id: user.id,
      action: 'GENERATE_REPORT',
      entity_type: 'report',
      entity_id: report.id,
      details: { 
        project_id, 
        format, 
        filename,
        uploaded_to_drive: !!driveFileId,
        shared_with_client: share_with_client && !!driveFileId,
      },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    const responseData: any = {
      report_id: report.id,
      filename,
      format,
      download_url: `/api/v1/reports/${report.id}/download`,
    };

    if (driveFileId) {
      responseData.google_drive_id = driveFileId;
      responseData.google_drive_link = driveLink;
    }

    res.status(201).json({
      success: true,
      data: responseData,
    });
  });

  // Download report
  static downloadReport = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = (req as any).user;

    const result = await ReportService.getProjectReports(0); // Get all reports
    const report = result.find(r => r.id === parseInt(id));

    if (!report) {
      throw new ApiError(404, 'Report not found');
    }

    // Access control - only manager or project team can download
    if (user.role === 'client') {
      // Clients can only download reports from their projects
      // TODO: Add project-client relationship check
    }

    res.download(report.file_path, report.report_name);
  });

  // Get reports for a project
  static getProjectReports = asyncHandler(async (req: Request, res: Response) => {
    const project_id = Array.isArray(req.params.project_id) 
      ? req.params.project_id[0] 
      : req.params.project_id;

    const reports = await ReportService.getProjectReports(parseInt(project_id));

    res.json({
      success: true,
      data: reports,
    });
  });
}

export default ReportController;
