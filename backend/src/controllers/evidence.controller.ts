import { Request, Response } from 'express';
import EvidenceModel from '../models/evidence.model';
import FindingModel from '../models/finding.model';
import ProjectModel from '../models/project.model';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';
import fs from 'fs';

class EvidenceController {
  /**
   * Helper: A reporter (create_findings permission, no approve_findings) can act on
   * any finding in a project while it is in `pending_comment_resolution` (i.e. the
   * manager sent it back for changes) AND the reporter is the project's assignee.
   * This lets the reporter address review comments across the whole project.
   */
  private static async canReporterActOnFinding(
    user: any,
    permissions: string[],
    finding: any
  ): Promise<boolean> {
    if (permissions.includes('approve_findings') || permissions.includes('manage_roles')) {
      return true;
    }
    if (!permissions.includes('create_findings')) {
      return false;
    }
    if (finding.created_by === user.id) {
      return true;
    }
    const project = await ProjectModel.findById(finding.project_id);
    if (!project) return false;
    return (
      project.status === 'pending_comment_resolution' &&
      project.assigned_reporter_id === user.id
    );
  }

  // Upload evidence
  static uploadEvidence = asyncHandler(async (req: Request, res: Response) => {
    const { finding_id, caption } = req.body;
    const user = (req as any).user;
    const permissions = (req as any).permissions || [];
    const file = req.file;

    if (!file) {
      throw new ApiError(400, 'No file uploaded');
    }

    if (!finding_id) {
      // Delete uploaded file if finding_id is missing
      fs.unlinkSync(file.path);
      throw new ApiError(400, 'Finding ID is required');
    }

    // Verify finding exists and user has access
    const finding = await FindingModel.findById(parseInt(finding_id));
    if (!finding) {
      fs.unlinkSync(file.path);
      throw new ApiError(404, 'Finding not found');
    }

    // Access control - reporter can upload to any finding in their project
    // when the project is in pending_comment_resolution (manager sent back for changes).
    const canAct = await EvidenceController.canReporterActOnFinding(user, permissions, finding);
    if (!canAct) {
      fs.unlinkSync(file.path);
      throw new ApiError(403, 'Access denied');
    }

    // Save evidence to database
    const evidence = await EvidenceModel.create({
      finding_id: parseInt(finding_id),
      filename: file.filename,
      original_filename: file.originalname,
      file_path: file.path,
      file_type: file.mimetype,
      file_size: file.size,
      caption: caption || null,
      uploaded_by: user.id,
    });

    // Log activity
    res.status(201).json({
      success: true,
      data: evidence,
    });
  });

  // Get evidence for a finding
  static getEvidenceByFinding = asyncHandler(async (req: Request, res: Response) => {
    const finding_id = Array.isArray(req.params.finding_id) ? req.params.finding_id[0] : req.params.finding_id;
    const user = (req as any).user;
    const permissions = (req as any).permissions || [];

    // Verify finding exists and user has access
    const finding = await FindingModel.findById(parseInt(finding_id));
    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    // Access control - reporter can view evidence for any finding in their project
    // when the project is in pending_comment_resolution.
    const canView = await EvidenceController.canReporterActOnFinding(user, permissions, finding);
    if (!canView) {
      throw new ApiError(403, 'Access denied');
    }

    if (user.role === 'client' && finding.status !== 'approved') {
      throw new ApiError(403, 'Access denied');
    }

    const evidence = await EvidenceModel.findByFindingId(parseInt(finding_id));

    res.json({
      success: true,
      data: evidence,
    });
  });

  // Download evidence file
  static downloadEvidence = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = (req as any).user;
    const permissions = (req as any).permissions || [];

    const evidence = await EvidenceModel.findById(parseInt(id));
    if (!evidence) {
      throw new ApiError(404, 'Evidence not found');
    }

    // Verify finding access
    const finding = await FindingModel.findById(evidence.finding_id);
    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    // Access control
    const canDownload = await EvidenceController.canReporterActOnFinding(user, permissions, finding);
    if (!canDownload) {
      throw new ApiError(403, 'Access denied');
    }

    if (user.role === 'client' && finding.status !== 'approved') {
      throw new ApiError(403, 'Access denied');
    }

    // Check if file exists
    if (!fs.existsSync(evidence.file_path)) {
      throw new ApiError(404, 'File not found on server');
    }

    // Send file
    res.download(evidence.file_path, evidence.original_filename);
  });

  // Update evidence caption
  static updateCaption = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { caption } = req.body;
    const user = (req as any).user;

    const evidence = await EvidenceModel.findById(parseInt(id));
    if (!evidence) {
      throw new ApiError(404, 'Evidence not found');
    }

    // Verify finding access
    const finding = await FindingModel.findById(evidence.finding_id);
    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    const permissions = (req as any).permissions || [];
    const canEdit = await EvidenceController.canReporterActOnFinding(user, permissions, finding);
    if (!canEdit) {
      throw new ApiError(403, 'Access denied');
    }

    const updated = await EvidenceModel.updateCaption(parseInt(id), caption);

    // Log activity
    res.json({
      success: true,
      data: updated,
    });
  });

  // Delete evidence
  static deleteEvidence = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = (req as any).user;

    const evidence = await EvidenceModel.findById(parseInt(id));
    if (!evidence) {
      throw new ApiError(404, 'Evidence not found');
    }

    // Verify finding access
    const finding = await FindingModel.findById(evidence.finding_id);
    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    const permissions = (req as any).permissions || [];
    const canDelete = await EvidenceController.canReporterActOnFinding(user, permissions, finding);
    if (!canDelete) {
      throw new ApiError(403, 'Access denied');
    }

    // Delete file from filesystem
    if (fs.existsSync(evidence.file_path)) {
      fs.unlinkSync(evidence.file_path);
    }

    // Delete from database
    await EvidenceModel.delete(parseInt(id));

    // Log activity
    res.json({
      success: true,
      message: 'Evidence deleted successfully',
    });
  });
}

export default EvidenceController;
