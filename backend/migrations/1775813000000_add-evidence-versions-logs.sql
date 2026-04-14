-- Up Migration

-- Evidence table for file uploads
CREATE TABLE IF NOT EXISTS evidence (
  id SERIAL PRIMARY KEY,
  finding_id INTEGER REFERENCES findings(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  caption TEXT,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Finding versions for version control
CREATE TABLE IF NOT EXISTS finding_versions (
  id SERIAL PRIMARY KEY,
  finding_id INTEGER REFERENCES findings(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR(500),
  severity VARCHAR(50),
  description TEXT,
  affected_target TEXT,
  likelihood VARCHAR(50),
  impact TEXT,
  steps_to_reproduce JSONB,
  proof_of_concept TEXT,
  remediation TEXT,
  finding_references JSONB,
  tags JSONB,
  status VARCHAR(50),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity logs for audit trail
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Report templates
CREATE TABLE IF NOT EXISTS report_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  logo_path TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generated reports
CREATE TABLE IF NOT EXISTS generated_reports (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES report_templates(id) ON DELETE SET NULL,
  report_name VARCHAR(255) NOT NULL,
  file_path TEXT,
  file_type VARCHAR(10),
  google_drive_id TEXT,
  generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_evidence_finding ON evidence(finding_id);
CREATE INDEX idx_finding_versions_finding ON finding_versions(finding_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_generated_reports_project ON generated_reports(project_id);

-- Down Migration
DROP TABLE IF EXISTS generated_reports;
DROP TABLE IF EXISTS report_templates;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS finding_versions;
DROP TABLE IF EXISTS evidence;
