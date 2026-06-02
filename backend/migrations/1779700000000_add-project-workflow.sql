-- migrate:up

-- Add new permissions for project workflow
INSERT INTO permissions (name, slug, description, module)
VALUES
  ('Submit Project for Review', 'submit_project_review', 'Submit a project for manager review', 'projects'),
  ('Request Project Changes', 'request_project_changes', 'Request changes to a project under review', 'projects'),
  ('Complete Project', 'complete_project', 'Mark a project as complete', 'projects')
ON CONFLICT (slug) DO NOTHING;

-- Assign new permissions to existing roles
-- Admin gets all
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'admin'
  AND p.slug IN ('submit_project_review', 'request_project_changes', 'complete_project')
ON CONFLICT DO NOTHING;

-- Manager gets all
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'manager'
  AND p.slug IN ('submit_project_review', 'request_project_changes', 'complete_project')
ON CONFLICT DO NOTHING;

-- Reporter gets submit only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'reporter'
  AND p.slug IN ('submit_project_review')
ON CONFLICT DO NOTHING;

-- Add status to projects (project-level review workflow)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Update findings status check to include 'submitted'
ALTER TABLE findings DROP CONSTRAINT IF EXISTS findings_status_check;
ALTER TABLE findings ADD CONSTRAINT findings_status_check
  CHECK (status IN ('draft', 'submitted', 'pending_review', 'approved', 'rejected', 'changes_requested'));

-- Create project_comments table for section-based review comments
CREATE TABLE IF NOT EXISTS project_comments (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  section_type VARCHAR(100) NOT NULL,
  section_identifier VARCHAR(255),
  comment TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_comments_project ON project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_section ON project_comments(project_id, section_type);
CREATE INDEX IF NOT EXISTS idx_project_comments_resolved ON project_comments(project_id, resolved);

-- migrate:down

DROP TABLE IF EXISTS project_comments;
ALTER TABLE projects DROP COLUMN IF EXISTS status;
ALTER TABLE findings DROP CONSTRAINT IF EXISTS findings_status_check;
ALTER TABLE findings ADD CONSTRAINT findings_status_check
  CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'changes_requested'));
