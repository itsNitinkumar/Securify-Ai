import { Request, Response } from 'express';
import OpenAIService from '../services/openai.service';
import { AuthRequest } from '../types';

import FindingModel from '../models/finding.model';
import VersionService from '../services/version.service';
import ActivityLogService from '../services/activity-log.service';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';
import imageUrlService from '../services/image-url.service';
import { config } from '../config/env';

class FindingController {
  /**
   * Helper: Process finding images to convert paths to accessible URLs
   */
  private static async processFindingImages(finding: any): Promise<any> {
    if (!finding) return finding;
    
    const baseUrl = config.frontendUrl.replace(':5173', ':3000'); // Use backend URL
    
    if (finding.steps_to_reproduce && Array.isArray(finding.steps_to_reproduce)) {
      finding.steps_to_reproduce = await imageUrlService.processStepsImages(
        finding.steps_to_reproduce,
        baseUrl
      );
    }
    
    return finding;
  }

  /**
   * Helper: Process multiple findings
   */
  private static async processMultipleFindings(findings: any[]): Promise<any[]> {
    return Promise.all(findings.map(f => this.processFindingImages(f)));
  }

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
      likelihood,
      // remediation,
      recommendation,
      steps_to_reproduce,
      references,
      affected_target,
      // affected_component,
      // cvss_score,
      // cwe_id,
      // owasp_category,
      // proof_of_concept,
      tags,
      finding_references,
      status,
      project_id,
    } = req.body;
    const user = (req as any).user;

    console.log('📝 Creating finding:', {
      title,
      severity,
      project_id,
      steps_count: Array.isArray(steps_to_reproduce) ? steps_to_reproduce.length : 0,
      has_likelihood: !!likelihood,
      has_impact: !!impact,
    });

    if (!title || !severity) {
      throw new ApiError(400, 'Title and severity are required');
    }

    // Check for duplicate finding in the same project
    if (project_id) {
      console.log('🔍 Checking for duplicates in project:', project_id);
      const existingFindings = await FindingModel.findAll({ project_id });
      const duplicate = existingFindings.find(f =>
        f.title.toLowerCase().trim() === title.toLowerCase().trim()
      );
      if (duplicate) {
        throw new ApiError(400, `Finding with title "${title}" already exists in this project`);
      }
    }

    console.log('💾 Saving finding to database...');
    // Save to database
    const finding = await FindingModel.create({
      title,
      description: description || '',
      severity,
      impact: impact || null,
      likelihood: likelihood || null,
      recommendation: recommendation || null,
      steps_to_reproduce: steps_to_reproduce || [],
      references: references || [],
      finding_references: finding_references || [],
      tags: tags || [],
      affected_target: affected_target || null,
      project_id: project_id,
      created_by: user.id,
      status: status || 'draft',
    });

    console.log('✅ Finding created with ID:', finding.id);

    // Create initial version
    console.log('📦 Creating version...');
    await VersionService.createVersion(finding.id, finding, user.id);

    // Log activity
    console.log('📝 Logging activity...');
    await ActivityLogService.log({
      user_id: user.id,
      action: 'CREATE_FINDING',
      entity_type: 'finding',
      entity_id: finding.id,
      details: { title: finding.title, severity: finding.severity },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    console.log('✅ Finding creation complete, sending response');
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
    
    // Process image URLs
    const processedFindings = await FindingController.processMultipleFindings(findings);

    res.json({
      success: true,
      data: processedFindings,
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

    // Process image URLs
    const processedFinding = await FindingController.processFindingImages(finding);

    res.json({
      success: true,
      data: processedFinding,
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

    let finding;
    try {
      finding = await FindingModel.findById(parseInt(id));
    } catch (error: any) {
      console.error('❌ Database error when fetching finding:', error);
      if (error.message?.includes('timeout')) {
        throw new ApiError(504, 'Database query timeout. Please try again.');
      }
      throw new ApiError(500, 'Failed to fetch finding from database');
    }

    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    console.log('🔍 Approval check:', {
      findingId: finding.id,
      status: finding.status,
      statusType: typeof finding.status,
      statusTrimmed: finding.status?.trim(),
      isPendingReview: finding.status === 'pending_review',
      isPendingReviewTrimmed: finding.status?.trim() === 'pending_review',
    });

    // Normalize status by trimming whitespace
    const normalizedStatus = finding.status?.trim();

    // Provide helpful error messages based on current status
    if (normalizedStatus === 'approved') {
      throw new ApiError(400, 'This finding has already been approved');
    }

    if (normalizedStatus === 'draft') {
      throw new ApiError(400, 'This finding must be submitted for review before it can be approved');
    }

    if (normalizedStatus === 'changes_requested') {
      throw new ApiError(400, 'This finding has changes requested. It must be resubmitted for review before approval');
    }

    if (normalizedStatus !== 'pending_review') {
      throw new ApiError(400, `Only findings pending review can be approved. Current status: "${normalizedStatus}"`);
    }

    let updatedFinding;
    try {
      updatedFinding = await FindingModel.update(parseInt(id), {
        status: 'approved',
        approved_by: user.id,
        reviewed_by: user.id,
      });
    } catch (error: any) {
      console.error('❌ Database error when updating finding:', error);
      if (error.message?.includes('timeout')) {
        throw new ApiError(504, 'Database update timeout. Please try again.');
      }
      throw new ApiError(500, 'Failed to update finding in database');
    }

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

  // Import findings from another project
  static importFromProject = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
    const { source_project_id, finding_ids, target_project_id } = req.body;
    const userId = req.user?.id;

    if (!source_project_id || !target_project_id || !finding_ids || !Array.isArray(finding_ids)) {
      throw new ApiError(400, 'Source project ID, target project ID, and finding IDs are required');
    }

    if (source_project_id === target_project_id) {
      throw new ApiError(400, 'Source and target projects cannot be the same');
    }

    // Get findings from source project
    const sourceFindings = await FindingModel.findAll({ project_id: source_project_id, status: 'approved' });
    const findingsToImport = sourceFindings.filter(f => finding_ids.includes(f.id));

    if (findingsToImport.length === 0) {
      throw new ApiError(400, 'No approved findings found to import');
    }

    // Create copies in target project
    const importedFindings = [];
    for (const finding of findingsToImport) {
      console.log('📥 Importing finding:', {
        sourceId: finding.id,
        title: finding.title,
        status: finding.status,
        hasLikelihood: !!finding.likelihood,
        hasImpact: !!finding.impact,
        hasRecommendation: !!finding.recommendation,
        hasReferences: !!finding.references,
        hasSteps: !!finding.steps_to_reproduce,
        likelihood: finding.likelihood,
        recommendation: finding.recommendation,
      });
      const newFinding = await FindingModel.create({
        project_id: target_project_id,
        title: finding.title,
        severity: finding.severity,
        description: finding.description,
        affected_target: finding.affected_target,
        likelihood: finding.likelihood,
        impact: finding.impact,
        steps_to_reproduce: finding.steps_to_reproduce,
        recommendation: finding.recommendation,
        references: finding.references,
        finding_references: finding.finding_references,
        tags: finding.tags,
        status: finding.status || 'draft',
        created_by: userId,
      });
      importedFindings.push(newFinding);
    }

    res.status(201).json({
      success: true,
      message: `Successfully imported ${importedFindings.length} findings`,
      data: { imported_count: importedFindings.length, findings: importedFindings },
    });
  });
}

export default FindingController;
