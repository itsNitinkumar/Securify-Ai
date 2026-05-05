-- Up Migration
-- Add new columns to report_templates for editable sections
ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS confidentiality_text TEXT;
ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS introduction_text TEXT;
ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS approach_text TEXT;
ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS scope_text TEXT;
ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS scope_applications JSONB;
ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS scope_user_roles JSONB;
ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS scope_tools JSONB;
ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS appendix_text TEXT;
ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS client_name_highlight TEXT DEFAULT '#ffff00';
ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS highlight_color TEXT DEFAULT '#ffff00';

-- Create template_sections table for managing different sections
CREATE TABLE IF NOT EXISTS template_sections (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES report_templates(id) ON DELETE CASCADE,
  section_name VARCHAR(100) NOT NULL,
  section_content TEXT,
  section_order INTEGER,
  is_editable BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_template_sections_template ON template_sections(template_id);
CREATE INDEX IF NOT EXISTS idx_template_sections_order ON template_sections(section_order);

-- Down Migration
-- DROP TABLE IF EXISTS template_sections;
-- ALTER TABLE report_templates DROP COLUMN IF EXISTS confidentiality_text;
-- ALTER TABLE report_templates DROP COLUMN IF EXISTS introduction_text;
-- ALTER TABLE report_templates DROP COLUMN IF EXISTS approach_text;
-- ALTER TABLE report_templates DROP COLUMN IF EXISTS scope_text;
-- ALTER TABLE report_templates DROP COLUMN IF EXISTS scope_applications;
-- ALTER TABLE report_templates DROP COLUMN IF EXISTS scope_user_roles;
-- ALTER TABLE report_templates DROP COLUMN IF EXISTS scope_tools;
-- ALTER TABLE report_templates DROP COLUMN IF EXISTS appendix_text;
-- ALTER TABLE report_templates DROP COLUMN IF EXISTS client_name_highlight;
-- ALTER TABLE report_templates DROP COLUMN IF EXISTS highlight_color;
