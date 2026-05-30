import { Request } from 'express';
import { PermissionSlug } from './permissions';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export type UserRole = 'admin' | 'manager' | 'reporter' | 'client';

// New RBAC role slugs
export type RoleSlug = 'admin' | 'manager' | 'reporter' | 'client';

export interface Role {
  id: number;
  name: string;
  slug: RoleSlug;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  role_id?: number;
  company_id?: number;
  status?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  client_name?: string;
  client_id?: number;
  company_id?: number;
  assigned_reporter_id?: number;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequest extends Request {
  user?: User;
  permissions?: PermissionSlug[];
}
