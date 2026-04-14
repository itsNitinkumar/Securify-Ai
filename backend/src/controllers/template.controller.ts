import { Response } from 'express';
import { AuthRequest } from '../types';
import TemplateModel from '../models/template.model';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';
import ActivityLogService from '../services/activity-log.service';

class TemplateController {
  // Create new template
  static createTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      name,
      description,
      is_default,
      sections,
      company_name,
      company_logo_url,
      header_text,
      footer_text,
      primary_color,
      secondary_color,
      font_family,
    } = req.body;

    if (!name || !sections || !Array.isArray(sections)) {
      throw new ApiError(400, 'Name and sections are required');
    }

    const template = await TemplateModel.create({
      name,
      description,
      is_default,
      sections,
      company_name,
      company_logo_url,
      header_text,
      footer_text,
      primary_color,
      secondary_color,
      font_family,
      created_by: req.user!.id,
    });

    // Log activity
    await ActivityLogService.log({
      user_id: req.user!.id,
      action: 'create_template',
      entity_type: 'template',
      entity_id: template.id,
      details: { template_name: name },
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: { template },
    });
  });

  // Get all templates
  static getAllTemplates = asyncHandler(async (req: AuthRequest, res: Response) => {
    const templates = await TemplateModel.getAll();

    res.json({
      success: true,
      message: 'Templates retrieved successfully',
      data: { templates, count: templates.length },
    });
  });

  // Get template by ID
  static getTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const template = await TemplateModel.getById(parseInt(id));

    if (!template) {
      throw new ApiError(404, 'Template not found');
    }

    res.json({
      success: true,
      message: 'Template retrieved successfully',
      data: { template },
    });
  });

  // Get default template
  static getDefaultTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const template = await TemplateModel.getDefault();

    if (!template) {
      throw new ApiError(404, 'No default template found');
    }

    res.json({
      success: true,
      message: 'Default template retrieved successfully',
      data: { template },
    });
  });

  // Update template
  static updateTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    const existingTemplate = await TemplateModel.getById(parseInt(id));
    if (!existingTemplate) {
      throw new ApiError(404, 'Template not found');
    }

    const template = await TemplateModel.update(parseInt(id), updateData);

    // Log activity
    await ActivityLogService.log({
      user_id: req.user!.id,
      action: 'update_template',
      entity_type: 'template',
      entity_id: parseInt(id),
      details: { changes: updateData },
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: { template },
    });
  });

  // Delete template
  static deleteTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const template = await TemplateModel.getById(parseInt(id));
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }

    if (template.is_default) {
      throw new ApiError(400, 'Cannot delete default template');
    }

    await TemplateModel.delete(parseInt(id));

    // Log activity
    await ActivityLogService.log({
      user_id: req.user!.id,
      action: 'delete_template',
      entity_type: 'template',
      entity_id: parseInt(id),
      details: { template_name: template.name },
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  });

  // Get user's templates
  static getUserTemplates = asyncHandler(async (req: AuthRequest, res: Response) => {
    const templates = await TemplateModel.getByUser(req.user!.id);

    res.json({
      success: true,
      message: 'User templates retrieved successfully',
      data: { templates, count: templates.length },
    });
  });

  // Set template as default
  static setDefaultTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const template = await TemplateModel.getById(parseInt(id));
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }

    await TemplateModel.update(parseInt(id), { is_default: true });

    // Log activity
    await ActivityLogService.log({
      user_id: req.user!.id,
      action: 'set_default_template',
      entity_type: 'template',
      entity_id: parseInt(id),
      details: { template_name: template.name },
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Template set as default successfully',
    });
  });
}

export default TemplateController;
