import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, UserRole } from '../types';
import { PermissionSlug } from '../types/permissions';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';
import { config } from '../config/env';
import AuthModel from '../models/auth.model';
import UserModel from '../models/user.model';
import pool from '../config/database';

export const protect = asyncHandler<AuthRequest>(
  async (req: AuthRequest, _res: Response, next: NextFunction) => {
    let token = req.headers.authorization?.split(' ')[1];

    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw new ApiError(401, 'Not authorized, no token');
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { id: number; email: string };
      const user = await AuthModel.findById(decoded.id);

      if (!user) {
        throw new ApiError(401, 'User not found');
      }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        role_id: (user as any).role_id,
        company_id: (user as any).company_id,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };

      next();
    } catch (error) {
      throw new ApiError(401, 'Not authorized, invalid token');
    }
  }
  ) as any;

// New: permission-based access control
export const authorize = (...requiredPermissions: PermissionSlug[]): any => {
  return asyncHandler<AuthRequest>(
    async (req: AuthRequest, _res: Response, next: NextFunction) => {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }

      const permissions = await UserModel.getPermissions(req.user.id);
      req.permissions = permissions;

      console.log('🔐 Authorization Check:', {
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        userRoleId: req.user.role_id,
        userPermissions: permissions,
        requiredPermissions,
      });

      const hasAny = requiredPermissions.some((p) => permissions.includes(p));
      if (!hasAny) {
        console.error('❌ Authorization FAILED:', {
          userId: req.user.id,
          userRole: req.user.role,
          userPermissions: permissions,
          requiredPermissions,
          hasAny,
        });
        throw new ApiError(403, 'Access denied. Insufficient permissions.');
      }

      console.log('✅ Authorization SUCCESS');
      next();
    }
  ) as any;
};

// Project access middleware: enforces ownership/company scoping
export const authorizeProjectAccess = (projectIdParam: string = 'projectId'): any => {
  return asyncHandler<AuthRequest>(
    async (req: AuthRequest, _res: Response, next: NextFunction) => {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }

      const permissions = req.permissions || await UserModel.getPermissions(req.user.id);
      req.permissions = permissions;

      // Admins and Managers have full project access
      if (permissions.includes('assign_projects' as PermissionSlug) ||
          permissions.includes('manage_roles' as PermissionSlug)) {
        return next();
      }

      const rawId = req.params[projectIdParam];
      const projectId = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
      if (isNaN(projectId)) {
        throw new ApiError(400, 'Invalid project ID');
      }

      const result = await pool.query(
        'SELECT company_id, assigned_reporter_id FROM projects WHERE id = $1',
        [projectId]
      );

      const project = result.rows[0];
      if (!project) {
        throw new ApiError(404, 'Project not found');
      }

      // Reporter: only assigned projects
      if (permissions.includes('create_findings' as PermissionSlug)) {
        if (project.assigned_reporter_id === req.user.id) {
          return next();
        }
        throw new ApiError(403, 'Access denied. You are not assigned to this project.');
      }

      // Client: only own company projects
      if (req.user.company_id && project.company_id === req.user.company_id) {
        return next();
      }

      throw new ApiError(403, 'Access denied. You do not have access to this project.');
    }
  ) as any;
};

// Finding ownership middleware: ensures user owns the finding or has override permission
export const authorizeFindingAccess = (findingIdParam: string = 'id'): any => {
  return asyncHandler<AuthRequest>(
    async (req: AuthRequest, _res: Response, next: NextFunction) => {
      if (!req.user) {
        throw new ApiError(401, 'Not authenticated');
      }

      const permissions = req.permissions || await UserModel.getPermissions(req.user.id);
      req.permissions = permissions;

      // Admin/Manager bypass
      if (permissions.includes('approve_findings' as PermissionSlug) ||
          permissions.includes('manage_roles' as PermissionSlug)) {
        return next();
      }

      const rawId = req.params[findingIdParam];
      const findingId = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
      if (isNaN(findingId)) {
        throw new ApiError(400, 'Invalid finding ID');
      }

      const result = await pool.query(
        'SELECT created_by, project_id FROM findings WHERE id = $1',
        [findingId]
      );

      const finding = result.rows[0];
      if (!finding) {
        throw new ApiError(404, 'Finding not found');
      }

      // Reporter: own findings or findings in assigned project
      if (finding.created_by === req.user.id) {
        return next();
      }

      // Check if user is assigned to the project this finding belongs to
      const projectCheck = await pool.query(
        'SELECT id FROM projects WHERE id = $1 AND assigned_reporter_id = $2',
        [finding.project_id, req.user.id]
      );
      if (projectCheck.rows.length > 0) {
        return next();
      }

      throw new ApiError(403, 'Access denied. You do not have access to this finding.');
    }
  ) as any;
};
