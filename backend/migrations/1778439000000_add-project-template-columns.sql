-- Up Migration

-- Add template columns to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES report_templates(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS template_name VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS out_of_scope_endpoints JSONB;

-- Down Migration
ALTER TABLE projects DROP COLUMN IF EXISTS template_id;
ALTER TABLE projects DROP COLUMN IF EXISTS template_name;
ALTER TABLE projects DROP COLUMN IF EXISTS out_of_scope_endpoints;