-- Up Migration
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS include_out_of_scope_endpoints BOOLEAN NOT NULL DEFAULT FALSE;

-- Down Migration
ALTER TABLE projects
  DROP COLUMN IF EXISTS include_out_of_scope_endpoints;
