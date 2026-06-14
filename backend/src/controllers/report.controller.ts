import { Request, Response } from 'express';
import ReportService from '../services/report.service';
import ApiError from '../utils/ApiError';
import * as fs from 'fs';
import * as path from 'path';

class ReportController {
  // Generate Report (PDF or DOCX)
  static async generateReport(req: Request, res: Response) {
    try {
      const { project_id, template_id, format, finding_ids } = req.body;
      const userId = (req as any).user.id;

      if (!project_id) {
        throw new ApiError(400, 'Project ID is required');
      }

      if (!format || !['pdf', 'docx'].includes(format)) {
        throw new ApiError(400, 'Format must be either "pdf" or "docx"');
      }

      console.log(`📄 Generating ${format.toUpperCase()} report for project ${project_id}`);

      const result = await ReportService.generateReport(
        project_id,
        template_id || null,
        userId,
        format as 'pdf' | 'docx',
        Array.isArray(finding_ids) ? finding_ids : undefined
      );

      res.status(201).json({
        message: `${format.toUpperCase()} report generated successfully`,
        reportId: result.reportId,
        filePath: result.filePath,
      });
    } catch (error: any) {
      console.error('❌ Generate report error:', error);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Failed to generate report',
      });
    }
  }

  static async previewReport(req: Request, res: Response) {
    try {
      const { project_id, template_id, format, finding_ids } = req.body;

      if (!project_id) {
        throw new ApiError(400, 'Project ID is required');
      }

      if (!format || !['pdf', 'docx'].includes(format)) {
        throw new ApiError(400, 'Format must be either "pdf" or "docx"');
      }

      const preview = await ReportService.previewReport(
        project_id,
        template_id || null,
        format as 'pdf' | 'docx',
        Array.isArray(finding_ids) ? finding_ids : undefined
      );

      res.setHeader('Content-Type', preview.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${preview.fileName}"`);
      res.send(preview.buffer);
    } catch (error: any) {
      console.error('❌ Preview report error:', error);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Failed to preview report',
      });
    }
  }

  // Download Report
  static async downloadReport(req: Request, res: Response) {
    try {
      const reportId = parseInt(req.params.id as string);

      if (isNaN(reportId)) {
        throw new ApiError(400, 'Invalid report ID');
      }

      const filePath = await ReportService.getReportFile(reportId);

      if (!fs.existsSync(filePath)) {
        throw new ApiError(404, 'Report file not found');
      }

      const fileName = path.basename(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      let contentType = 'application/octet-stream';
      if (ext === '.pdf') {
        contentType = 'application/pdf';
      } else if (ext === '.docx') {
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      console.error('❌ Download report error:', error);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Failed to download report',
      });
    }
  }

  // Get Reports by Project
  static async getReportsByProject(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId as string);

      if (isNaN(projectId)) {
        throw new ApiError(400, 'Invalid project ID');
      }

      const reports = await ReportService.getReportsByProject(projectId);

      res.json(reports);
    } catch (error: any) {
      console.error('❌ Get reports error:', error);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Failed to fetch reports',
      });
    }
  }

  // Get HTML Preview
  static async getHTMLPreview(req: Request, res: Response) {
    try {
      const { project_id, template_id, finding_ids } = req.body;

      if (!project_id) {
        throw new ApiError(400, 'Project ID is required');
      }

      const html = await ReportService.getHTMLPreview(
        project_id,
        template_id || null,
        Array.isArray(finding_ids) ? finding_ids : undefined
      );

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error: any) {
      console.error('❌ Get HTML preview error:', error);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Failed to get HTML preview',
      });
    }
  }

  // Delete Report
  static async deleteReport(req: Request, res: Response) {
    try {
      const reportId = parseInt(req.params.id as string);

      if (isNaN(reportId)) {
        throw new ApiError(400, 'Invalid report ID');
      }

      await ReportService.deleteReport(reportId);

      res.json({ message: 'Report deleted successfully' });
    } catch (error: any) {
      console.error('❌ Delete report error:', error);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Failed to delete report',
      });
    }
  }

  // Template Management
  static async createTemplate(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const template = await ReportService.createTemplate({
        ...req.body,
        created_by: userId,
      });

      res.status(201).json(template);
    } catch (error: any) {
      console.error('❌ Create template error:', error);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Failed to create template',
      });
    }
  }

  static async getAllTemplates(_req: Request, res: Response) {
    try {
      const templates = await ReportService.getAllTemplates();
      res.json(templates);
    } catch (error: any) {
      console.error('❌ Get templates error:', error);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Failed to fetch templates',
      });
    }
  }

  static async getTemplate(req: Request, res: Response) {
    try {
      const templateId = parseInt(req.params.id as string);

      if (isNaN(templateId)) {
        throw new ApiError(400, 'Invalid template ID');
      }

      const template = await ReportService.getTemplateById(templateId);
      res.json(template);
    } catch (error: any) {
      console.error('❌ Get template error:', error);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Failed to fetch template',
      });
    }
  }

  static async updateTemplate(req: Request, res: Response) {
    try {
      const templateId = parseInt(req.params.id as string);

      if (isNaN(templateId)) {
        throw new ApiError(400, 'Invalid template ID');
      }

      const template = await ReportService.updateTemplate(templateId, req.body);
      res.json(template);
    } catch (error: any) {
      console.error('❌ Update template error:', error);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Failed to update template',
      });
    }
  }

  static async deleteTemplate(req: Request, res: Response) {
    try {
      const templateId = parseInt(req.params.id as string);

      if (isNaN(templateId)) {
        throw new ApiError(400, 'Invalid template ID');
      }

      await ReportService.deleteTemplate(templateId);
      res.json({ message: 'Template deleted successfully' });
    } catch (error: any) {
      console.error('❌ Delete template error:', error);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Failed to delete template',
      });
    }
  }

  static async cloneTemplate(req: Request, res: Response) {
    try {
      const templateId = parseInt(req.params.id as string);
      const userId = (req as any).user.id;

      if (isNaN(templateId)) {
        throw new ApiError(400, 'Invalid template ID');
      }

      const cloned = await ReportService.cloneTemplate(templateId, userId);
      res.status(201).json(cloned);
    } catch (error: any) {
      console.error('❌ Clone template error:', error);
      res.status(error.statusCode || 500).json({
        error: error.message || 'Failed to clone template',
      });
    }
  }
}

export default ReportController;
