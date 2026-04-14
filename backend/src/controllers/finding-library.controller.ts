import { Response } from 'express';
import { AuthRequest } from '../types';
import FindingLibraryModel from '../models/finding-library.model';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';
import ActivityLogService from '../services/activity-log.service';

class FindingLibraryController {
    // Get all templates
    static getAllTemplates = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
        const templates = await FindingLibraryModel.getAll();

        res.json({
            success: true,
            message: 'Templates retrieved successfully',
            data: { templates, count: templates.length },
        });
    });

    // Get templates by category
    static getByCategory = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
        const { category } = req.params;

        const templates = await FindingLibraryModel.getByCategory(category as string);

        res.json({
            success: true,
            message: 'Templates retrieved successfully',
            data: { templates, count: templates.length },
        });
    });

    // Get templates by severity
    static getBySeverity = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
        const { severity } = req.params;

        const templates = await FindingLibraryModel.getBySeverity(severity as string);

        res.json({
            success: true,
            message: 'Templates retrieved successfully',
            data: { templates, count: templates.length },
        });
    });

    // Get template by ID
    static getTemplate = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;

        const template = await FindingLibraryModel.getById(parseInt(id as string));

        if (!template) {
            throw new ApiError(404, 'Template not found');
        }

        res.json({
            success: true,
            message: 'Template retrieved successfully',
            data: { template },
        });
    });

    // Search templates
    static searchTemplates = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
        const { q } = req.query;

        if (!q || typeof q !== 'string') {
            throw new ApiError(400, 'Search query is required');
        }

        const templates = await FindingLibraryModel.search(q);

        res.json({
            success: true,
            message: 'Search completed successfully',
            data: { templates, count: templates.length },
        });
    });

    // Get all categories
    static getCategories = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
        const categories = await FindingLibraryModel.getCategories();

        res.json({
            success: true,
            message: 'Categories retrieved successfully',
            data: { categories },
        });
    });

    // Create custom template
    static createTemplate = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
        const {
            title,
            category,
            severity,
            description,
            affected_component,
            likelihood,
            impact,
            steps_to_reproduce,
            remediation,
            reference_links,
            owasp_category,
            cwe_id,
            cvss_score,
            is_public,
        } = req.body;

        if (!title || !category || !severity || !description || !likelihood || !impact || !remediation) {
            throw new ApiError(400, 'Missing required fields');
        }

        const template = await FindingLibraryModel.create({
            title,
            category,
            severity,
            description,
            affected_component,
            likelihood,
            impact,
            steps_to_reproduce,
            remediation,
            reference_links,
            owasp_category,
            cwe_id,
            cvss_score,
            is_public,
            created_by: req.user!.id,
        });

        // Log activity
        await ActivityLogService.log({
            user_id: req.user!.id,
            action: 'create_finding_template',
            entity_type: 'finding_library',
            entity_id: template.id,
            details: { template_title: title },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
        });

        res.status(201).json({
            success: true,
            message: 'Template created successfully',
            data: { template },
        });
    });

    // Update template
    static updateTemplate = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;
        const updateData = req.body;

        const existingTemplate = await FindingLibraryModel.getById(parseInt(id as string));
        if (!existingTemplate) {
            throw new ApiError(404, 'Template not found');
        }

        // Only allow updating own templates or if manager
        if (existingTemplate.created_by !== req.user!.id && req.user!.role !== 'manager') {
            throw new ApiError(403, 'Not authorized to update this template');
        }

        const template = await FindingLibraryModel.update(parseInt(id as string), updateData);

        // Log activity
        await ActivityLogService.log({
            user_id: req.user!.id,
            action: 'update_finding_template',
            entity_type: 'finding_library',
            entity_id: parseInt(id as string),
            details: { changes: updateData },
            ip_address: req.ip as string,
            user_agent: req.get('user-agent'),
        });

        res.json({
            success: true,
            message: 'Template updated successfully',
            data: { template },
        });
    });

    // Delete template
    static deleteTemplate = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;

        const template = await FindingLibraryModel.getById(parseInt(id as string));
        if (!template) {
            throw new ApiError(404, 'Template not found');
        }

        // Only allow deleting own templates or if manager
        if (template.created_by !== req.user!.id && req.user!.role !== 'manager') {
            throw new ApiError(403, 'Not authorized to delete this template');
        }

        if (template.is_public && req.user!.role !== 'manager') {
            throw new ApiError(403, 'Cannot delete public templates');
        }

        await FindingLibraryModel.delete(parseInt(id as string));

        // Log activity
        await ActivityLogService.log({
            user_id: req.user!.id,
            action: 'delete_finding_template',
            entity_type: 'finding_library',
            entity_id: parseInt(id as string),
            details: { template_title: template.title },
            ip_address: req.ip as string,
            user_agent: req.get('user-agent'),
        });

        res.json({
            success: true,
            message: 'Template deleted successfully',
        });
    });

    // Get user's custom templates
    static getUserTemplates = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
        const templates = await FindingLibraryModel.getByUser(req.user!.id);

        res.json({
            success: true,
            message: 'User templates retrieved successfully',
            data: { templates, count: templates.length },
        });
    });

    // Clone template to create a finding
    static cloneToFinding = asyncHandler<AuthRequest>(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;
        const { project_id } = req.body;

        if (!project_id) {
            throw new ApiError(400, 'Project ID is required');
        }

        const finding = await FindingLibraryModel.cloneToFinding(
            parseInt(id as string),
            project_id,
            req.user!.id
        );

        // Log activity
        await ActivityLogService.log({
            user_id: req.user!.id,
            action: 'clone_template_to_finding',
            entity_type: 'finding',
            entity_id: finding.id,
            details: { template_id: parseInt(id as string), project_id },
            ip_address: req.ip as string,
            user_agent: req.get('user-agent'),
        });

        res.status(201).json({
            success: true,
            message: 'Finding created from template successfully',
            data: { finding },
        });
    });
}

export default FindingLibraryController;
