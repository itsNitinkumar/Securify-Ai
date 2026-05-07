import { Request, Response } from 'express';
import OpenAIService from '../services/openai.service';

import FindingModel from '../models/finding.model';
import VersionService from '../services/version.service';
import ActivityLogService from '../services/activity-log.service';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';

class FindingController {
  // Generate finding content using AI (without creating a finding)
  static generateContent = asyncHandler(async (req: Request, res: Response) => {
    console.log('📥 Generate content request received');
    const { evidence, severity } = req.body;
    const user = (req as any).user;

    console.log('Request data:', { evidence: evidence?.substring(0, 50), severity, userRole: user?.role });

    if (!evidence || !severity) {
      console.log('❌ Missing evidence or severity');
      throw new ApiError(400, 'Evidence and severity are required');
    }

    console.log('🤖 Calling Gemini service...');
    // Generate finding content using OpenAI (don't save to database)
    const aiResult = await OpenAIService.generateFinding({
      evidence,
      severity,
      role: user.role || 'analyst',
    });

    console.log('✅ AI result received:', JSON.stringify(aiResult, null, 2));
    // Return AI-generated content only
    res.json({
      success: true,
      data: aiResult,
    });
  });

  // Generate finding using AI
  static generateFinding = asyncHandler(async (req: Request, res: Response) => {
    const { evidence, severity, project_id } = req.body;
    const user = (req as any).user;

    if (!evidence || !severity) {
      throw new ApiError(400, 'Evidence and severity are required');
    }

    // Generate finding using OpenAI
    const aiResult = await OpenAIService.generateFinding({
      evidence,
      severity,
      role: user.role || 'analyst',
    });

    // Save to database
    const finding = await FindingModel.create({
      ...aiResult,
      project_id,
      created_by: user.id,
      steps_to_reproduce: aiResult.steps_to_reproduce,
      references: aiResult.references,
    });

    // Create initial version
    await VersionService.createVersion(finding.id, finding, user.id);

    // Log activity
    await ActivityLogService.log({
      user_id: user.id,
      action: 'CREATE_FINDING',
      entity_type: 'finding',
      entity_id: finding.id,
      details: { title: finding.title, severity: finding.severity },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      data: finding,
    });
  });

  // Create finding manually (without AI)
  static createFinding = asyncHandler(async (req: Request, res: Response) => {
    const {
      title,
      description,
      severity,
      impact,
      remediation,
      steps_to_reproduce,
      references,
      project_id,
    } = req.body;
    const user = (req as any).user;

    if (!title || !severity) {
      throw new ApiError(400, 'Title and severity are required');
    }

    // Save to database
    const finding = await FindingModel.create({
      title,
      description: description || '',
      severity,
      impact: impact || '',
      recommendation: remediation || '',
      steps_to_reproduce: steps_to_reproduce || [],
      references: references || [],
      project_id: project_id,
      created_by: user.id,
      status: 'draft',
    });

    // Create initial version
    await VersionService.createVersion(finding.id, finding, user.id);

    // Log activity
    await ActivityLogService.log({
      user_id: user.id,
      action: 'CREATE_FINDING',
      entity_type: 'finding',
      entity_id: finding.id,
      details: { title: finding.title, severity: finding.severity },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      data: finding,
    });
  });

  // Get all findings
  static getAllFindings = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { severity, status, project_id } = req.query;

    const filters: any = {};

    // Role-based access control
    if (user.role === 'analyst') {
      filters.created_by = user.id;
    } else if (user.role === 'client') {
      // Clients can only see approved findings from their projects
      filters.status = 'approved';
      if (project_id) filters.project_id = project_id;
    }

    if (severity) filters.severity = severity;
    if (status && user.role !== 'client') filters.status = status;
    if (project_id && user.role !== 'client') filters.project_id = project_id;

    const findings = await FindingModel.findAll(filters);

    res.json({
      success: true,
      data: findings,
    });
  });

  // Get single finding
  static getFinding = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = (req as any).user;

    const finding = await FindingModel.findById(parseInt(id));

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

    console.log('📤 Returning finding:', {
      id: finding.id,
      title: finding.title,
      hasLikelihood: !!finding.likelihood,
      hasImpact: !!finding.impact,
      hasRecommendation: !!finding.recommendation,
      hasReferences: !!finding.references,
      hasSteps: !!finding.steps_to_reproduce,
      likelihood: finding.likelihood,
      likelihoodType: typeof finding.likelihood,
      impact: finding.impact,
      impactType: typeof finding.impact,
      recommendation: finding.recommendation,
      recommendationType: typeof finding.recommendation,
      references: finding.references,
      referencesType: typeof finding.references,
      steps_to_reproduce: finding.steps_to_reproduce,
      stepsType: typeof finding.steps_to_reproduce,
    });

    res.json({
      success: true,
      data: finding,
    });
  });

  // Update finding
  static updateFinding = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = (req as any).user;
    const updates = req.body;

    const finding = await FindingModel.findById(parseInt(id));

    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    // Access control
    if (user.role === 'analyst') {
      // Analysts can only edit their own findings
      if (finding.created_by !== user.id) {
        throw new ApiError(403, 'Only the creator can edit this finding');
      }
      // Analysts can edit if status is draft or changes_requested
      if (finding.status !== 'draft' && finding.status !== 'changes_requested') {
        throw new ApiError(403, 'Cannot edit finding with current status');
      }
    }

    if (user.role === 'reviewer') {
      throw new ApiError(403, 'Reviewers cannot edit findings');
    }

    const updatedFinding = await FindingModel.update(parseInt(id), updates);

    // Create new version
    await VersionService.createVersion(parseInt(id), updatedFinding, user.id);

    // Log activity
    await ActivityLogService.log({
      user_id: user.id,
      action: 'UPDATE_FINDING',
      entity_type: 'finding',
      entity_id: parseInt(id),
      details: { updates },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    res.json({
      success: true,
      data: updatedFinding,
    });
  });

  // Regenerate section using AI
  static regenerateSection = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { section } = req.body;
    const user = (req as any).user;

    if (!section) {
      throw new ApiError(400, 'Section name is required');
    }

    const finding = await FindingModel.findById(parseInt(id));

    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    // Access control
    if (user.role === 'analyst' && finding.created_by !== user.id) {
      throw new ApiError(403, 'Access denied');
    }

    // Regenerate section using AI
    const regenerated = await OpenAIService.regenerateSection(section, finding);

    // Update finding with new section
    const updatedFinding = await FindingModel.update(parseInt(id), regenerated);

    res.json({
      success: true,
      data: updatedFinding,
    });
  });

  // Approve finding (Reviewer and Manager)
  static approveFinding = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = (req as any).user;

    // Both Reviewers and Managers can approve findings
    if (user.role !== 'reviewer' && user.role !== 'manager') {
      throw new ApiError(403, 'Only reviewers and managers can approve findings');
    }

    const finding = await FindingModel.findById(parseInt(id));

    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    if (finding.status !== 'pending_review') {
      throw new ApiError(400, 'Only findings pending review can be approved');
    }

    const updatedFinding = await FindingModel.update(parseInt(id), {
      status: 'approved',
      approved_by: user.id,
      reviewed_by: user.id,
    });

    // Log activity
    await ActivityLogService.log({
      user_id: user.id,
      action: 'APPROVE_FINDING',
      entity_type: 'finding',
      entity_id: parseInt(id),
      details: { title: finding.title },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    res.json({
      success: true,
      data: updatedFinding,
    });
  });

  // Request changes (Reviewer/Manager only)
  static requestChanges = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { comment } = req.body;
    const user = (req as any).user;

    if (user.role !== 'manager' && user.role !== 'reviewer') {
      throw new ApiError(403, 'Only managers and reviewers can request changes');
    }

    const finding = await FindingModel.findById(parseInt(id));

    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    if (finding.status !== 'pending_review') {
      throw new ApiError(400, 'Only findings pending review can have changes requested');
    }

    const updatedFinding = await FindingModel.update(parseInt(id), {
      status: 'changes_requested',
      reviewed_by: user.id,
    });

    // Log activity with comment
    await ActivityLogService.log({
      user_id: user.id,
      action: 'REQUEST_CHANGES',
      entity_type: 'finding',
      entity_id: parseInt(id),
      details: { title: finding.title, comment: comment || 'No comment provided' },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    res.json({
      success: true,
      data: updatedFinding,
      message: 'Changes requested successfully',
    });
  });

  // Submit finding for review
  static submitForReview = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = (req as any).user;

    const finding = await FindingModel.findById(parseInt(id));

    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    // Only creator can submit for review
    if (finding.created_by !== user.id) {
      throw new ApiError(403, 'Only the creator can submit this finding for review');
    }

    // Can only submit draft or changes_requested findings
    if (finding.status !== 'draft' && finding.status !== 'changes_requested') {
      throw new ApiError(400, `Cannot submit finding with status: ${finding.status}`);
    }

    const updatedFinding = await FindingModel.update(parseInt(id), {
      status: 'pending_review',
      reviewed_by: undefined, // Clear previous reviewer
    });

    // Log activity
    await ActivityLogService.log({
      user_id: user.id,
      action: finding.status === 'changes_requested' ? 'RESUBMIT_FOR_REVIEW' : 'SUBMIT_FOR_REVIEW',
      entity_type: 'finding',
      entity_id: parseInt(id),
      details: { title: finding.title },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    res.json({
      success: true,
      data: updatedFinding,
      message: 'Finding submitted for review successfully',
    });
  });

  // Natural language query
  static queryFindings = asyncHandler(async (req: Request, res: Response) => {
    const { query } = req.body;
    const user = (req as any).user;

    if (!query) {
      throw new ApiError(400, 'Query is required');
    }

    // Convert natural language to filters using AI
    const filters = await OpenAIService.naturalLanguageQuery(
      query,
      user.role,
      user.id
    );

    // Apply filters to get findings
    const findings = await FindingModel.findAll(filters.filters);

    res.json({
      success: true,
      data: findings,
      filters: filters,
    });
  });

  // Delete finding
  static deleteFinding = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = (req as any).user;

    const finding = await FindingModel.findById(parseInt(id));

    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    // Only creator or manager can delete
    if (user.role !== 'manager' && finding.created_by !== user.id) {
      throw new ApiError(403, 'Access denied');
    }

    await FindingModel.delete(parseInt(id));

    // Log activity
    await ActivityLogService.log({
      user_id: user.id,
      action: 'DELETE_FINDING',
      entity_type: 'finding',
      entity_id: parseInt(id),
      details: { title: finding.title },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Finding deleted successfully',
    });
  });

  // Get version history
  static getVersionHistory = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = (req as any).user;

    const finding = await FindingModel.findById(parseInt(id));
    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    // Access control
    if (user.role === 'analyst' && finding.created_by !== user.id) {
      throw new ApiError(403, 'Access denied');
    }

    const versions = await VersionService.getVersionHistory(parseInt(id));

    res.json({
      success: true,
      data: versions,
    });
  });

  // Get specific version
  static getVersion = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const version = Array.isArray(req.params.version) ? req.params.version[0] : req.params.version;
    const user = (req as any).user;

    const finding = await FindingModel.findById(parseInt(id));
    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    // Access control
    if (user.role === 'analyst' && finding.created_by !== user.id) {
      throw new ApiError(403, 'Access denied');
    }

    const versionData = await VersionService.getVersion(parseInt(id), parseInt(version));

    if (!versionData) {
      throw new ApiError(404, 'Version not found');
    }

    res.json({
      success: true,
      data: versionData,
    });
  });
}

export default FindingController;
