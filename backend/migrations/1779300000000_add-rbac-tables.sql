-- Up Migration
-- ============================================================
-- New RBAC system: roles, permissions, role_permissions
-- ============================================================

-- 1. Create companies table (separate from clients list)
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  module VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create role_permissions join table
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- 5. Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;

-- 6. Add new columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- Seed new roles (maps to old role slugs)
-- ============================================================
INSERT INTO roles (name, slug, description) VALUES
  ('Admin', 'admin', 'Full system access – manage users, roles, permissions, and all projects'),
  ('Manager', 'manager', 'Oversees projects and team – approves findings, manages users, generates reports'),
  ('Reporter', 'reporter', 'Creates and manages findings on assigned projects – submits for review'),
  ('Client', 'client', 'Read-only access to approved findings and reports for their own company')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Seed permissions
-- ============================================================
INSERT INTO permissions (name, slug, description, module) VALUES
  -- Dashboard
  ('View Dashboard', 'view_dashboard', 'Access the dashboard page', 'dashboard'),

  -- User management
  ('Create Users', 'create_users', 'Create new user accounts', 'users'),
  ('View Users', 'view_users', 'View user list and details', 'users'),
  ('Edit Users', 'edit_users', 'Modify user details and roles', 'users'),
  ('Delete Users', 'delete_users', 'Remove user accounts', 'users'),
  ('Approve Users', 'approve_users', 'Approve pending user registrations', 'users'),

  -- Project management
  ('Create Projects', 'create_projects', 'Create new projects', 'projects'),
  ('View Projects', 'view_projects', 'View project list and details', 'projects'),
  ('Edit Projects', 'edit_projects', 'Modify project details', 'projects'),
  ('Delete Projects', 'delete_projects', 'Remove projects', 'projects'),
  ('Assign Projects', 'assign_projects', 'Assign reporters to projects', 'projects'),

  -- Finding management
  ('Create Findings', 'create_findings', 'Create new findings', 'findings'),
  ('View Findings', 'view_findings', 'View finding details', 'findings'),
  ('Edit Findings', 'edit_findings', 'Modify findings', 'findings'),
  ('Delete Findings', 'delete_findings', 'Remove findings', 'findings'),
  ('Approve Findings', 'approve_findings', 'Approve or reject finding submissions', 'findings'),
  ('Request Finding Changes', 'request_finding_changes', 'Request changes to submitted findings', 'findings'),

  -- Comments
  ('Create Comments', 'create_comments', 'Add comments to findings', 'comments'),
  ('View Comments', 'view_comments', 'View comments on findings', 'comments'),
  ('Delete Comments', 'delete_comments', 'Remove comments', 'comments'),

  -- Evidence
  ('Upload Evidence', 'upload_evidence', 'Upload evidence files', 'evidence'),
  ('View Evidence', 'view_evidence', 'View evidence files', 'evidence'),
  ('Delete Evidence', 'delete_evidence', 'Remove evidence files', 'evidence'),

  -- Reports
  ('Generate Reports', 'generate_reports', 'Generate and download reports', 'reports'),
  ('View Reports', 'view_reports', 'View generated reports', 'reports'),
  ('Delete Reports', 'delete_reports', 'Remove generated reports', 'reports'),

  -- Templates
  ('View Templates', 'view_templates', 'View report templates', 'templates'),
  ('Manage Templates', 'manage_templates', 'Create and modify report templates', 'templates'),

  -- Clients / Companies
  ('View Clients', 'view_clients', 'View client/company list', 'clients'),
  ('Manage Clients', 'manage_clients', 'Create and modify clients/companies', 'clients'),

  -- Role Requests (legacy, being deprecated)
  ('View Role Requests', 'view_role_requests', 'View role upgrade requests', 'role_requests'),
  ('Approve Role Requests', 'approve_role_requests', 'Approve or reject role upgrade requests', 'role_requests'),

  -- RBAC Admin
  ('Manage Roles', 'manage_roles', 'Create and modify roles', 'rbac'),
  ('Manage Permissions', 'manage_permissions', 'Assign permissions to roles', 'rbac')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Assign permissions to roles
-- ============================================================

-- Admin: ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'admin'
ON CONFLICT DO NOTHING;

-- Manager: Most permissions except RBAC admin and delete
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'manager'
  AND p.slug NOT IN (
    'manage_roles', 'manage_permissions',
    'delete_users'
  )
ON CONFLICT DO NOTHING;

-- Reporter: Focused on finding creation and assigned projects
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'reporter'
  AND p.slug IN (
    'view_dashboard',
    'view_projects',
    'create_findings', 'view_findings', 'edit_findings',
    'create_comments', 'view_comments',
    'upload_evidence', 'view_evidence',
    'view_reports', 'generate_reports'
  )
ON CONFLICT DO NOTHING;

-- Client: Read-only access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'client'
  AND p.slug IN (
    'view_dashboard',
    'view_projects',
    'view_findings', 'view_comments', 'view_evidence', 'view_reports'
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- Backfill: map existing role strings to new role IDs
-- ============================================================
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE (r.slug = 'admin' AND u.role = 'admin')
   OR (r.slug = 'manager' AND u.role = 'manager')
   OR (r.slug = 'reporter' AND u.role = 'analyst')
   OR (r.slug = 'reporter' AND u.role = 'reviewer')
   OR (r.slug = 'client' AND u.role = 'client');

-- Backfill companies from existing clients
INSERT INTO companies (name)
SELECT name FROM clients
ON CONFLICT (name) DO NOTHING;

-- Backfill company_id on users: find users linked to projects
-- This is best-effort; admin will need to assign company_ids
UPDATE users u
SET company_id = c.id
FROM companies c
WHERE u.company_id IS NULL
  AND EXISTS (
    SELECT 1 FROM projects p
    JOIN clients cl ON p.client_id = cl.id
    WHERE cl.name = c.name
      AND p.created_by = u.id
  );

-- Backfill company_id on projects from client_id
UPDATE projects p
SET company_id = c.id
FROM clients cl, companies c
WHERE p.client_id = cl.id
  AND cl.name = c.name
  AND p.company_id IS NULL;

-- ============================================================
-- Down Migration
-- ============================================================
-- ALTER TABLE projects DROP COLUMN IF EXISTS assigned_reporter_id;
-- ALTER TABLE projects DROP COLUMN IF EXISTS company_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS company_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS role_id;
-- DROP TABLE IF EXISTS role_permissions;
-- DROP TABLE IF EXISTS permissions;
-- DROP TABLE IF EXISTS roles;
-- DROP TABLE IF EXISTS companies;
