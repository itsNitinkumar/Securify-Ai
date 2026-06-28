import { Request, Response } from 'express';
import OpenAIService from '../services/openai.service';
import { AuthRequest } from '../types';

import FindingModel from '../models/finding.model';
import pool from '../config/database';
import VersionService from '../services/version.service';
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
    
    const baseUrl = config.frontendUrl.replace(':5173', ':3000');
    
    if (finding.steps_to_reproduce && Array.isArray(finding.steps_to_reproduce)) {
      finding.steps_to_reproduce = await imageUrlService.processStepsImages(
        finding.steps_to_reproduce,
        baseUrl
      );
    }
    
    if (finding.evidence_items && Array.isArray(finding.evidence_items)) {
      finding.evidence_items = await Promise.all(
        finding.evidence_items.map(async (item: any) => {
          if (item.imageKey) {
            const signedUrl = await imageUrlService.getAccessibleUrl(item.imageKey, baseUrl);
            return { ...item, signedUrl: signedUrl || item.imageKey };
          }
          return item;
        })
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
      role: user.role || 'reporter',
    });

    console.log('✅ AI result received:', JSON.stringify(aiResult, null, 2));
    // Return AI-generated content only
    res.json({
      success: true,
      data: aiResult,
    });
  });

  // Generate false positive content using AI (without creating a finding)
  static generateFalsePositiveContent = asyncHandler(async (req: Request, res: Response) => {
    const { evidence, finding_name } = req.body;
    const user = (req as any).user;

    if (!evidence) {
      throw new ApiError(400, 'Evidence is required');
    }

    const aiResult = await OpenAIService.generateFalsePositiveFinding({
      evidence,
      severity: 'none',
      role: user.role || 'reporter',
      finding_name: finding_name || undefined,
    });

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
      role: user.role || 'reporter',
    });

    // Save to database
    const finding = await FindingModel.create({
      ...aiResult,
      project_id,
      created_by: user.id,
      steps_to_reproduce: aiResult.steps_to_reproduce,
      references: aiResult.references,
    } as any);

    // Create initial version
    await VersionService.createVersion(finding.id, finding, user.id);

    // Log activity
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
      finding_type,
      validation_status,
      evidence_items,
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

    const isFP = finding_type === 'false_positive';
    if (!title || (!severity && !isFP)) {
      throw new ApiError(400, 'Title and severity are required');
    }
    const effectiveSeverity = isFP ? 'None' : severity;

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
      severity: effectiveSeverity,
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
      finding_type: finding_type || 'true_positive',
      validation_status: validation_status || null,
      evidence_items: evidence_items || [],
    });

    console.log('✅ Finding created with ID:', finding.id);

    // Create initial version
    console.log('📦 Creating version...');
    await VersionService.createVersion(finding.id, finding, user.id);

    // Log activity
    console.log('📝 Logging activity...');
    console.log('✅ Finding creation complete, sending response');
    res.status(201).json({
      success: true,
      data: finding,
    });
  });

  // Get all findings
  static getAllFindings = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const permissions = (req as any).permissions || [];
    const { severity, status, project_id, finding_type } = req.query;

    const filters: any = {};

    // Permission-based access control
    const canViewAll = permissions.includes('approve_findings') || permissions.includes('manage_roles');

    if (!canViewAll && permissions.includes('create_findings')) {
      // Reporter: only their own findings
      filters.created_by = user.id;
    }

    // Clients can now see all findings (no longer filtered by 'approved')
    if (severity) filters.severity = severity;
    if (status) filters.status = status;
    if (project_id) filters.project_id = project_id;
    if (finding_type) filters.finding_type = finding_type;

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
    const permissions = (req as any).permissions || [];

    const finding = await FindingModel.findById(parseInt(id));

    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    // Access control
    const canViewAll = user.role === 'admin' || user.role === 'manager' ||
      permissions.includes('approve_findings') || permissions.includes('manage_roles');

    if (!canViewAll && permissions.includes('create_findings') && finding.created_by !== user.id) {
      // Check if user is assigned to the project this finding belongs to
      const projectCheck = await pool.query(
        'SELECT id FROM projects WHERE id = $1 AND assigned_reporter_id = $2',
        [finding.project_id, user.id]
      );
      if (projectCheck.rows.length === 0) {
        throw new ApiError(403, 'Access denied');
      }
    }

    // Clients can view all findings for their projects
    if (user.role === 'client' && !user.company_id) {
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
    const permissions = (req as any).permissions || [];
    const updates = req.body;

    const finding = await FindingModel.findById(parseInt(id));

    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    // Access control
    const canEditAll = user.role === 'admin' || user.role === 'manager' ||
      permissions.includes('approve_findings') || permissions.includes('manage_roles');

    if (!canEditAll && (permissions.includes('create_findings') || permissions.includes('edit_findings'))) {
      // Reporter: can edit own findings or findings in assigned project
      if (finding.created_by !== user.id) {
        // Check if user is the assigned reporter for the project
        const projectResult = await pool.query(
          'SELECT id FROM projects WHERE id = $1 AND assigned_reporter_id = $2',
          [finding.project_id, user.id]
        );
        if (projectResult.rows.length === 0) {
          throw new ApiError(403, 'Only the creator or assigned reporter can edit this finding');
        }
      }
      // Status-based locking removed (approval workflow was eliminated)
    }

    const updatedFinding = await FindingModel.update(parseInt(id), updates);

    // Create new version
    await VersionService.createVersion(parseInt(id), updatedFinding, user.id);

    // Log activity
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
    if (user.role === 'reporter' && finding.created_by !== user.id) {
      const projectResult = await pool.query(
        'SELECT id FROM projects WHERE id = $1 AND assigned_reporter_id = $2',
        [finding.project_id, user.id]
      );
      if (projectResult.rows.length === 0) {
        throw new ApiError(403, 'Access denied');
      }
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

  // Submit finding (makes it final - no more editing)
  static submitFinding = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const finding = await FindingModel.findById(parseInt(id));

    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    if (finding.status !== 'draft') {
      throw new ApiError(400, `Cannot submit finding with status: ${finding.status}`);
    }

    const updatedFinding = await FindingModel.update(parseInt(id), {
      status: 'submitted',
    });
    res.json({
      success: true,
      data: updatedFinding,
      message: 'Finding submitted successfully',
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
    const permissions = (req as any).permissions || [];

    const finding = await FindingModel.findById(parseInt(id));

    if (!finding) {
      throw new ApiError(404, 'Finding not found');
    }

    // Permission check
    const canDeleteAll = user.role === 'admin' || user.role === 'manager' ||
      permissions.includes('manage_roles') || permissions.includes('approve_findings');
    if (!canDeleteAll && !(permissions.includes('delete_findings') && finding.created_by === user.id)) {
      throw new ApiError(403, 'Access denied');
    }

    await FindingModel.delete(parseInt(id));

    // Log activity
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
    if (user.role === 'reporter' && finding.created_by !== user.id) {
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
    if (user.role === 'reporter' && finding.created_by !== user.id) {
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
    const sourceFindings = await FindingModel.findAll({ project_id: source_project_id });
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
        finding_type: finding.finding_type || 'true_positive',
        validation_status: finding.validation_status || undefined,
        evidence_items: finding.evidence_items || [],
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
