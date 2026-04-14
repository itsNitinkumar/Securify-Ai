import { Request, Response } from 'express';
import EvidenceModel from '../models/evidence.model';
import FindingModel from '../models/finding.model';
import ActivityLogService from '../services/activity-log.service';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';
import fs from 'fs';

class EvidenceController {
  // Upload evidence
  static uploadEvidence = asyncHandler(async (req: Request, res: Response) => {
    const { finding_id, caption } = req.body;
    const user = (req as any).user;
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

    // Access control
    if (user.role === 'analyst' && finding.created_by !== user.id) {
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
    await ActivityLogService.log({
      user_id: user.id,
      action: 'UPLOAD_EVIDENCE',
      entity_type: 'evidence',
      entity_id: evidence.id,
      details: { finding_id, filename: file.originalname },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      data: evidence,
    });
  });

  // Get evidence for a finding
  static getEvidenceByFinding = asyncHandler(async (req: Request, res: Response) => {
    const finding_id = Array.isArray(req.params.finding_id) ? req.params.finding_id[0] : req.params.finding_id;
    const user = (req as any).user;

    // Verify finding exists and user has access
    const finding = await FindingModel.findById(parseInt(finding_id));
    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    // Access control
    if (user.role === 'analyst' && finding.created_by !== user.id) {
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
    if (user.role === 'analyst' && finding.created_by !== user.id) {
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

    // Access control
    if (user.role === 'analyst' && finding.created_by !== user.id) {
      throw new ApiError(403, 'Access denied');
    }

    const updated = await EvidenceModel.updateCaption(parseInt(id), caption);

    // Log activity
    await ActivityLogService.log({
      user_id: user.id,
      action: 'UPDATE_EVIDENCE_CAPTION',
      entity_type: 'evidence',
      entity_id: parseInt(id),
      details: { caption },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

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

    // Access control - only creator or manager can delete
    if (user.role !== 'manager' && finding.created_by !== user.id) {
      throw new ApiError(403, 'Access denied');
    }

    // Delete file from filesystem
    if (fs.existsSync(evidence.file_path)) {
      fs.unlinkSync(evidence.file_path);
    }

    // Delete from database
    await EvidenceModel.delete(parseInt(id));

    // Log activity
    await ActivityLogService.log({
      user_id: user.id,
      action: 'DELETE_EVIDENCE',
      entity_type: 'evidence',
      entity_id: parseInt(id),
      details: { filename: evidence.original_filename },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Evidence deleted successfully',
    });
  });
}

export default EvidenceController;
