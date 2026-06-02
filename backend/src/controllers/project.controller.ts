import { Request, Response } from 'express';
import ProjectModel from '../models/project.model';
import UserModel from '../models/user.model';
import ClientModel from '../models/client.model';
import WorkflowHistoryModel from '../models/workflow-history.model';
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
      assigned_reporter_id,
      start_date,
      end_date,
      application_details,
      user_roles,
      domains,
      include_out_of_scope_endpoints,
      out_of_scope_endpoints,
      template_id,
      template_name,
    } = req.body;
    const user = (req as any).user;

    if (!name) {
      throw new ApiError(400, 'Project name is required');
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
      assigned_reporter_id: assigned_reporter_id !== undefined && assigned_reporter_id !== null && String(assigned_reporter_id).trim() !== ''
        ? Number.parseInt(String(assigned_reporter_id), 10)
        : undefined,
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
      domains: Array.isArray(domains)
        ? (domains as any[])
          .map((d) => String(d || '').trim())
          .filter(Boolean)
        : undefined,
      include_out_of_scope_endpoints: Boolean(include_out_of_scope_endpoints),
      out_of_scope_endpoints: normalizeRows(out_of_scope_endpoints, (row) => {
        const n = String(row?.name || '').trim();
        const u = String(row?.url || '').trim();
        if (!n && !u) return null;
        return { name: n, url: u };
      }) ?? undefined,
      template_id: template_id !== undefined && template_id !== null && String(template_id).trim() !== ''
        ? (() => {
          const idNum = Number.parseInt(String(template_id), 10);
          return Number.isFinite(idNum) ? idNum : undefined;
        })()
        : undefined,
      template_name: typeof template_name === 'string' && template_name.trim() ? template_name.trim() : undefined,
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
    const user = (req as any).user;
    const permissions = (req as any).permissions || await UserModel.getPermissions(user.id);
    const {
      client_id,
      status,
      assigned_reporter_id,
      start_date,
      end_date,
      search,
    } = req.query;

    const filters: any = {};
    if (client_id) filters.client_id = parseInt(client_id as string);
    if (status) filters.status = status as string;
    if (assigned_reporter_id) filters.assigned_reporter_id = parseInt(assigned_reporter_id as string);
    if (start_date) filters.start_date = start_date as string;
    if (end_date) filters.end_date = end_date as string;
    if (search) filters.search = search as string;

    // Admin/Manager bypass: see all projects (with filters)
    if (permissions.includes('manage_roles' as any) || permissions.includes('approve_findings' as any)) {
      const projects = await ProjectModel.findAll(filters);
      return res.json({ success: true, data: projects });
    }

    // Reporter: only assigned projects (with filters)
    if (permissions.includes('create_findings' as any)) {
      filters.assigned_reporter_id = user.id;
      const projects = await ProjectModel.findAll(filters);
      return res.json({ success: true, data: projects });
    }

    // Client: only own company projects (with filters)
    if (user.company_id) {
      const projects = await ProjectModel.findByCompany(user.company_id);
      return res.json({ success: true, data: projects });
    }

    // Fallback: all projects
    const projects = await ProjectModel.findAll(filters);
    return res.json({ success: true, data: projects });
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
      assigned_reporter_id,
      start_date,
      end_date,
      application_details,
      user_roles,
      domains,
      out_of_scope_endpoints,
      include_out_of_scope_endpoints,
      template_id,
      template_name,
    } = req.body;
    const user = (req as any).user;

    const project = await ProjectModel.findById(parseInt(id));
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    let resolvedClientId: number | null | undefined = undefined;
    let resolvedClientName: string | null | undefined = undefined;

    if (client_id !== undefined) {
      if (client_id === null || String(client_id).trim() === '') {
        if (client_name !== undefined && client_name !== null && String(client_name).trim()) {
          const n = String(client_name).trim();
          const c = await ClientModel.create({ name: n, created_by: user.id });
          resolvedClientId = c.id;
          resolvedClientName = c.name;
        } else {
          resolvedClientId = null;
          resolvedClientName = null;
        }
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

    const normalizedDomains = domains !== undefined
      ? (Array.isArray(domains)
        ? (domains as any[])
          .map((d) => String(d || '').trim())
          .filter(Boolean)
        : null)
      : undefined;

    const updatePayload: Record<string, any> = {
      name,
      description,
    };
    if (resolvedClientId !== undefined) updatePayload.client_id = resolvedClientId;
    if (resolvedClientName !== undefined) updatePayload.client_name = resolvedClientName;
    if (assigned_reporter_id !== undefined) {
      updatePayload.assigned_reporter_id = assigned_reporter_id !== null && String(assigned_reporter_id).trim() !== ''
        ? Number.parseInt(String(assigned_reporter_id), 10)
        : null;
    }
    if (start_date !== undefined) updatePayload.start_date = toDateOnly(start_date);
    if (end_date !== undefined) updatePayload.end_date = toDateOnly(end_date);
    if (normalizedApps !== undefined) updatePayload.application_details = normalizedApps;
    if (normalizedRoles !== undefined) updatePayload.user_roles = normalizedRoles;
    if (normalizedDomains !== undefined) updatePayload.domains = normalizedDomains;
    if (normalizedOutOfScope !== undefined) updatePayload.out_of_scope_endpoints = normalizedOutOfScope;
    if (include_out_of_scope_endpoints !== undefined) updatePayload.include_out_of_scope_endpoints = Boolean(include_out_of_scope_endpoints);
    if (template_id !== undefined) updatePayload.template_id = template_id;
    if (template_name !== undefined) updatePayload.template_name = template_name;

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

  // Assign reporter to project
  static assignReporter = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { reporter_id } = req.body;
    const user = (req as any).user;

    const project = await ProjectModel.findById(parseInt(id));
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    // Validate reporter exists and has reporter role
    if (reporter_id !== null && reporter_id !== undefined && String(reporter_id).trim() !== '') {
      const reporterIdNum = Number.parseInt(String(reporter_id), 10);
      if (!Number.isFinite(reporterIdNum)) {
        throw new ApiError(400, 'Invalid reporter_id');
      }
      const reporter = await UserModel.findById(reporterIdNum);
      if (!reporter) {
        throw new ApiError(400, 'Reporter not found');
      }
      if (reporter.role !== 'reporter') {
        throw new ApiError(400, 'User is not a reporter');
      }
    }

    const updated = await ProjectModel.update(parseInt(id) as any, {
      assigned_reporter_id: reporter_id !== null && reporter_id !== undefined && String(reporter_id).trim() !== ''
        ? Number.parseInt(String(reporter_id), 10)
        : null,
    } as any);

    await ActivityLogService.log({
      user_id: user.id,
      action: 'ASSIGN_REPORTER',
      entity_type: 'project',
      entity_id: parseInt(id),
      details: { project_name: project.name, reporter_id },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    res.json({
      success: true,
      data: updated,
    });
  });

  // Submit project for review (Draft → Pending Review)
  static submitForReview = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = (req as any).user;

    const project = await ProjectModel.findById(parseInt(id));
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    if (project.status !== 'draft') {
      throw new ApiError(400, `Cannot submit project with status: ${project.status}. Only drafts can be submitted.`);
    }

    const updated = await ProjectModel.update(parseInt(id), {
      status: 'pending_review',
      submitted_by: user.id,
      submitted_at: new Date().toISOString(),
    } as any);

    await WorkflowHistoryModel.create({
      project_id: parseInt(id),
      from_status: project.status,
      to_status: 'pending_review',
      action: 'SUBMIT_FOR_REVIEW',
      performed_by: user.id,
    });

    await ActivityLogService.log({
      user_id: user.id,
      action: 'SUBMIT_PROJECT_FOR_REVIEW',
      entity_type: 'project',
      entity_id: parseInt(id),
      details: { name: project.name, from_status: project.status, to_status: 'pending_review' },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    res.json({ success: true, data: updated });
  });

  // Request changes on project (Pending Review → Pending Comment Resolution)
  static requestChanges = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = (req as any).user;

    const project = await ProjectModel.findById(parseInt(id));
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    if (project.status !== 'pending_review') {
      throw new ApiError(400, `Cannot request changes on project with status: ${project.status}`);
    }

    const updated = await ProjectModel.update(parseInt(id), { status: 'pending_comment_resolution' } as any);

    await WorkflowHistoryModel.create({
      project_id: parseInt(id),
      from_status: project.status,
      to_status: 'pending_comment_resolution',
      action: 'REQUEST_CHANGES',
      performed_by: user.id,
    });

    await ActivityLogService.log({
      user_id: user.id,
      action: 'REQUEST_PROJECT_CHANGES',
      entity_type: 'project',
      entity_id: parseInt(id),
      details: { name: project.name, from_status: project.status, to_status: 'pending_comment_resolution' },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    res.json({ success: true, data: updated });
  });

  // Mark project complete (Pending Review or Pending Comment Resolution → Completed)
  static markComplete = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = (req as any).user;

    const project = await ProjectModel.findById(parseInt(id));
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    if (project.status !== 'pending_review' && project.status !== 'pending_comment_resolution') {
      throw new ApiError(400, `Cannot mark project complete with status: ${project.status}`);
    }

    const updated = await ProjectModel.update(parseInt(id), {
      status: 'completed',
      completed_by: user.id,
      completed_at: new Date().toISOString(),
    } as any);

    await WorkflowHistoryModel.create({
      project_id: parseInt(id),
      from_status: project.status,
      to_status: 'completed',
      action: 'MARK_COMPLETE',
      performed_by: user.id,
    });

    await ActivityLogService.log({
      user_id: user.id,
      action: 'COMPLETE_PROJECT',
      entity_type: 'project',
      entity_id: parseInt(id),
      details: { name: project.name, from_status: project.status, to_status: 'completed' },
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('user-agent'),
    });

    res.json({ success: true, data: updated });
  });

  // Get workflow history for a project
  static getWorkflowHistory = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const history = await WorkflowHistoryModel.findByProject(parseInt(id));
    res.json({ success: true, data: history });
  });

  // Delete project
  static deleteProject = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = (req as any).user;

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
