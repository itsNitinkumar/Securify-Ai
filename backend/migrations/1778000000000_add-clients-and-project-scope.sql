-- Up Migration

-- Clients master list (used for project dropdown + persistence)
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- Project metadata for scope + report generation
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS application_details JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_roles JSONB;

-- Best-effort backfill clients from existing projects
INSERT INTO clients (name)
SELECT DISTINCT TRIM(client_name) AS name
FROM projects
WHERE client_name IS NOT NULL AND TRIM(client_name) <> ''
ON CONFLICT (name) DO NOTHING;

UPDATE projects p
SET client_id = c.id
FROM clients c
WHERE p.client_id IS NULL
  AND p.client_name IS NOT NULL
  AND TRIM(p.client_name) = c.name;

-- Down Migration
-- DROP TABLE IF EXISTS clients;
-- ALTER TABLE projects DROP COLUMN IF EXISTS client_id;
-- ALTER TABLE projects DROP COLUMN IF EXISTS start_date;
-- ALTER TABLE projects DROP COLUMN IF EXISTS end_date;
-- ALTER TABLE projects DROP COLUMN IF EXISTS application_details;
-- ALTER TABLE projects DROP COLUMN IF EXISTS user_roles;
