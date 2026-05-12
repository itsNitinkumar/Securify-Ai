import { Request, Response } from 'express';
import ProjectModel from '../models/project.model';
import ClientModel from '../models/client.model';
import ActivityLogService from '../services/activity-log.service';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';

const toDateOnly = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  // Accept YYYY-MM-DD only (browser date input format)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
};

const normalizeRows = <T extends Record<string, any>>(rows: any, pick: (row: any) => T | null): T[] | null => {
  if (rows === null || rows === undefined) return null;
  if (!Array.isArray(rows)) return null;
  const normalized = rows.map(pick).filter(Boolean) as T[];
  return normalized;
};

class ProjectController {
  // Create project
  static createProject = asyncHandler(async (req: Request, res: Response) => {
    const {
      name,
      description,
      client_name,
      client_id,
      start_date,
      end_date,
      application_details,
      user_roles,
      include_out_of_scope_endpoints,
    } = req.body;
    const user = (req as any).user;

    if (!name) {
      throw new ApiError(400, 'Project name is required');
    }

    // Only managers can create projects
    if (user.role !== 'manager') {
      throw new ApiError(403, 'Only managers can create projects');
    }

    let resolvedClientId: number | null = null;
    let resolvedClientName: string | null = null;

    if (client_id !== undefined && client_id !== null && String(client_id).trim() !== '') {
      const idNum = Number.parseInt(String(client_id), 10);
      if (!Number.isFinite(idNum)) {
        throw new ApiError(400, 'Invalid client_id');
      }
      const c = await ClientModel.findById(idNum);
      if (!c) {
        throw new ApiError(400, 'Client not found');
      }
      resolvedClientId = c.id;
      resolvedClientName = c.name;
    } else if (typeof client_name === 'string' && client_name.trim()) {
      // Persist the client name and attach the client_id.
      const c = await ClientModel.create({ name: client_name, created_by: user.id });
      resolvedClientId = c.id;
      resolvedClientName = c.name;
    }

    const project = await ProjectModel.create({
      name,
      description,
      client_id: resolvedClientId ?? undefined,
      client_name: resolvedClientName ?? undefined,
      start_date: toDateOnly(start_date) ?? undefined,
      end_date: toDateOnly(end_date) ?? undefined,
      application_details: normalizeRows(application_details, (row) => {
        const n = String(row?.name || '').trim();
        const u = String(row?.url || '').trim();
        if (!n && !u) return null;
        return { name: n, url: u };
      }) ?? undefined,
      user_roles: normalizeRows(user_roles, (row) => {
        const r = String(row?.role || '').trim();
        const u = String(row?.username || row?.email || '').trim();
        if (!r && !u) return null;
        return { role: r, username: u };
      }) ?? undefined,
      include_out_of_scope_endpoints: Boolean(include_out_of_scope_endpoints),
      created_by: user.id,
    });

    // Log activity
    await ActivityLogService.log({
      user_id: user.id,
      action: 'CREATE_PROJECT',
      entity_type: 'project',
      entity_id: project.id,
      details: { name, client_name: project.client_name, client_id: project.client_id },
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
    const {
      name,
      description,
      client_name,
      client_id,
      start_date,
      end_date,
      application_details,
      user_roles,
      out_of_scope_endpoints,
      include_out_of_scope_endpoints,
      template_id,
    } = req.body;
    const user = (req as any).user;

    // Only managers can update projects
    if (user.role !== 'manager') {
      throw new ApiError(403, 'Only managers can update projects');
    }

    const project = await ProjectModel.findById(parseInt(id));
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    let resolvedClientId: number | null | undefined = undefined;
    let resolvedClientName: string | null | undefined = undefined;

    if (client_id !== undefined) {
      if (client_id === null || String(client_id).trim() === '') {
        resolvedClientId = null;
        resolvedClientName = null;
      } else {
        const idNum = Number.parseInt(String(client_id), 10);
        if (!Number.isFinite(idNum)) {
          throw new ApiError(400, 'Invalid client_id');
        }
        const c = await ClientModel.findById(idNum);
        if (!c) {
          throw new ApiError(400, 'Client not found');
        }
        resolvedClientId = c.id;
        resolvedClientName = c.name;
      }
    } else if (client_name !== undefined) {
      const n = String(client_name || '').trim();
      if (!n) {
        resolvedClientId = null;
        resolvedClientName = null;
      } else {
        const c = await ClientModel.create({ name: n, created_by: user.id });
        resolvedClientId = c.id;
        resolvedClientName = c.name;
      }
    }

    const normalizedApps = application_details !== undefined
      ? normalizeRows(application_details, (row) => {
        const n = String(row?.name || '').trim();
        const u = String(row?.url || '').trim();
        if (!n && !u) return null;
        return { name: n, url: u };
      })
      : undefined;

    const normalizedRoles = user_roles !== undefined
      ? normalizeRows(user_roles, (row) => {
        const r = String(row?.role || '').trim();
        const u = String(row?.username || row?.email || '').trim();
        if (!r && !u) return null;
        return { role: r, username: u };
      })
      : undefined;

    const normalizedOutOfScope = out_of_scope_endpoints !== undefined
      ? normalizeRows(out_of_scope_endpoints, (row) => {
        const n = String(row?.name || '').trim();
        const u = String(row?.url || '').trim();
        if (!n && !u) return null;
        return { name: n, url: u };
      })
      : undefined;

    const updatePayload: Record<string, any> = {
      name,
      description,
    };
    if (resolvedClientId !== undefined) updatePayload.client_id = resolvedClientId;
    if (resolvedClientName) updatePayload.client_name = resolvedClientName;
    if (start_date !== undefined) updatePayload.start_date = toDateOnly(start_date);
    if (end_date !== undefined) updatePayload.end_date = toDateOnly(end_date);
    if (normalizedApps !== undefined) updatePayload.application_details = normalizedApps;
    if (normalizedRoles !== undefined) updatePayload.user_roles = normalizedRoles;
    if (normalizedOutOfScope !== undefined) updatePayload.out_of_scope_endpoints = normalizedOutOfScope;
    if (include_out_of_scope_endpoints !== undefined) updatePayload.include_out_of_scope_endpoints = Boolean(include_out_of_scope_endpoints);
    if (template_id !== undefined) updatePayload.template_id = template_id;

    const updated = await ProjectModel.update(parseInt(id), updatePayload);

    // Log activity
    await ActivityLogService.log({
      user_id: user.id,
      action: 'UPDATE_PROJECT',
      entity_type: 'project',
      entity_id: parseInt(id),
      details: {
        name,
        description,
        client_name: updated.client_name,
        client_id: updated.client_id,
        start_date: updated.start_date,
        end_date: updated.end_date,
      },
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
