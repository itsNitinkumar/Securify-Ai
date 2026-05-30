import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../types';
import ApiResponse from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';

class RoleController {
  static getAll = asyncHandler<AuthRequest>(async (_req: AuthRequest, res: Response) => {
    const result = await pool.query(`
      SELECT
        r.id, r.name, r.slug, r.description,
        COUNT(DISTINCT u.id)::int AS user_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'name', p.name,
              'slug', p.slug,
              'description', p.description,
              'module', p.module
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) AS permissions
      FROM roles r
      LEFT JOIN users u ON u.role_id = r.id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      GROUP BY r.id, r.name, r.slug, r.description
      ORDER BY r.id
    `);

    return ApiResponse.success(res, 200, 'Roles retrieved', result.rows);
  });

  static getAllPermissions = asyncHandler<AuthRequest>(async (_req: AuthRequest, res: Response) => {
    const result = await pool.query(`
      SELECT id, name, slug, description, module
      FROM permissions
      ORDER BY module, id
    `);

    const grouped = result.rows.reduce((acc: Record<string, any[]>, perm: any) => {
      const module = perm.module.charAt(0).toUpperCase() + perm.module.slice(1);
      if (!acc[module]) acc[module] = [];
      acc[module].push(perm);
      return acc;
    }, {});

    return ApiResponse.success(res, 200, 'Permissions retrieved', {
      all: result.rows,
      grouped,
    });
  });
}

export default RoleController;
