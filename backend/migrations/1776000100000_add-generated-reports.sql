-- Up Migration
-- Create generated reports table
CREATE TABLE IF NOT EXISTS generated_reports (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES report_templates(id) ON DELETE SET NULL,
  report_name VARCHAR(255) NOT NULL,
  file_path TEXT,
  file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('docx', 'pdf')),
  google_drive_id VARCHAR(255),
  generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_generated_reports_project ON generated_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_template ON generated_reports(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_generated_by ON generated_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_generated_reports_created_at ON generated_reports(created_at DESC);

-- Down Migration
-- DROP TABLE IF EXISTS generated_reports CASCADE;
