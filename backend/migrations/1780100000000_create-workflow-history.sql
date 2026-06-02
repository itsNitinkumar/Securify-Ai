-- migrate:up

-- Add workflow tracking columns to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Create workflow_history table
CREATE TABLE IF NOT EXISTS workflow_history (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workflow_history_project ON workflow_history(project_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_project_created ON workflow_history(project_id, created_at);

-- migrate:down

DROP TABLE IF EXISTS workflow_history;
ALTER TABLE projects DROP COLUMN IF EXISTS submitted_by;
ALTER TABLE projects DROP COLUMN IF EXISTS submitted_at;
ALTER TABLE projects DROP COLUMN IF EXISTS completed_by;
ALTER TABLE projects DROP COLUMN IF EXISTS completed_at;
