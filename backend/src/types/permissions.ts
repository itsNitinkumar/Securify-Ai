export const Permissions = {
  // Dashboard
  VIEW_DASHBOARD: 'view_dashboard',

  // Users
  CREATE_USERS: 'create_users',
  VIEW_USERS: 'view_users',
  EDIT_USERS: 'edit_users',
  DELETE_USERS: 'delete_users',
  APPROVE_USERS: 'approve_users',

  // Projects
  CREATE_PROJECTS: 'create_projects',
  VIEW_PROJECTS: 'view_projects',
  EDIT_PROJECTS: 'edit_projects',
  DELETE_PROJECTS: 'delete_projects',
  ASSIGN_PROJECTS: 'assign_projects',

  // Findings
  CREATE_FINDINGS: 'create_findings',
  VIEW_FINDINGS: 'view_findings',
  EDIT_FINDINGS: 'edit_findings',
  DELETE_FINDINGS: 'delete_findings',
  APPROVE_FINDINGS: 'approve_findings',
  REQUEST_FINDING_CHANGES: 'request_finding_changes',

  // Comments
  CREATE_COMMENTS: 'create_comments',
  VIEW_COMMENTS: 'view_comments',
  DELETE_COMMENTS: 'delete_comments',

  // Evidence
  UPLOAD_EVIDENCE: 'upload_evidence',
  VIEW_EVIDENCE: 'view_evidence',
  DELETE_EVIDENCE: 'delete_evidence',

  // Reports
  GENERATE_REPORTS: 'generate_reports',
  VIEW_REPORTS: 'view_reports',
  DELETE_REPORTS: 'delete_reports',

  // Templates
  VIEW_TEMPLATES: 'view_templates',
  MANAGE_TEMPLATES: 'manage_templates',

  // Clients
  VIEW_CLIENTS: 'view_clients',
  MANAGE_CLIENTS: 'manage_clients',

  // Role Requests (legacy, being deprecated)
  VIEW_ROLE_REQUESTS: 'view_role_requests',
  APPROVE_ROLE_REQUESTS: 'approve_role_requests',

  // RBAC Admin
  MANAGE_ROLES: 'manage_roles',
  MANAGE_PERMISSIONS: 'manage_permissions',
} as const;

export type PermissionSlug = typeof Permissions[keyof typeof Permissions];
