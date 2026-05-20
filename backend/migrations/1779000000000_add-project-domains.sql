-- Up Migration

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS domains JSONB;

-- Down Migration
-- ALTER TABLE projects DROP COLUMN IF EXISTS domains;
