-- Up Migration
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  client_name VARCHAR(255),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS findings (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low', 'Informational')),
  description TEXT NOT NULL,
  affected_target TEXT,
  likelihood JSONB,
  impact JSONB,
  steps_to_reproduce JSONB,
  proof_of_concept TEXT,
  remediation TEXT,
  recommendation JSONB,
  "references" JSONB,
  finding_references JSONB,
  tags JSONB,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'changes_requested')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finding_comments (
  id SERIAL PRIMARY KEY,
  finding_id INTEGER REFERENCES findings(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_findings_project ON findings(project_id);
CREATE INDEX idx_findings_severity ON findings(severity);
CREATE INDEX idx_findings_status ON findings(status);
CREATE INDEX idx_findings_created_by ON findings(created_by);

-- Down Migration
DROP TABLE IF EXISTS finding_comments;
DROP TABLE IF EXISTS findings;
DROP TABLE IF EXISTS projects;