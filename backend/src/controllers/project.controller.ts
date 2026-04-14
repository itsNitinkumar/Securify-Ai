import { Request, Response } from 'express';
import ProjectModel from '../models/project.model';
import ActivityLogService from '../services/activity-log.service';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';

class ProjectController {
  // Create project
  static createProject = asyncHandler(async (req: Request, res: Response) => {
    const { name, description, client_name } = req.body;
    const user = (req as any).user;

    if (!name) {
      throw new ApiError(400, 'Project name is required');
    }

    // Only managers can create projects
    if (user.role !== 'manager') {
      throw new ApiError(403, 'Only managers can create projects');
    }

    const project = await ProjectModel.create({
      name,
      description,
      client_name,
      created_by: user.id,
    });

    // Log activity
    await ActivityLogService.log({
      user_id: user.id,
      action: 'CREATE_PROJECT',
      entity_type: 'project',
      entity_id: project.id,
      details: { name },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      data: project,
    });
  });

  // Get all projects
  static getAllProjects = asyncHandler(async (req: Request, res: Response) => {
    const projects = await ProjectModel.findAll();

    res.json({
      success: true,
      data: projects,
    });
  });

  // Get single project
  static getProject = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const project = await ProjectModel.findById(parseInt(id));

    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    res.json({
      success: true,
      data: project,
    });
  });

  // Get project with findings
  static getProjectWithFindings = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const project = await ProjectModel.getProjectWithFindings(parseInt(id));

    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    res.json({
      success: true,
      data: project,
    });
  });

  // Update project
  static updateProject = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name, description, client_name } = req.body;
    const user = (req as any).user;

    // Only managers can update projects
    if (user.role !== 'manager') {
      throw new ApiError(403, 'Only managers can update projects');
    }

    const project = await ProjectModel.findById(parseInt(id));
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    const updated = await ProjectModel.update(parseInt(id), {
      name,
      description,
      client_name,
    });

    // Log activity
    await ActivityLogService.log({
      user_id: user.id,
      action: 'UPDATE_PROJECT',
      entity_type: 'project',
      entity_id: parseInt(id),
      details: { name, description, client_name },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    res.json({
      success: true,
      data: updated,
    });
  });

  // Delete project
  static deleteProject = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = (req as any).user;

    // Only managers can delete projects
    if (user.role !== 'manager') {
      throw new ApiError(403, 'Only managers can delete projects');
    }

    const project = await ProjectModel.findById(parseInt(id));
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    await ProjectModel.delete(parseInt(id));

    // Log activity
    await ActivityLogService.log({
      user_id: user.id,
      action: 'DELETE_PROJECT',
      entity_type: 'project',
      entity_id: parseInt(id),
      details: { name: project.name },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  });
}

export default ProjectController;
