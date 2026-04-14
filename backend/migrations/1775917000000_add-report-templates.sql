-- Up Migration
-- Drop table if exists (in case of failed previous migration)
DROP TABLE IF EXISTS report_templates CASCADE;

-- Create report templates table
CREATE TABLE report_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  sections JSONB NOT NULL DEFAULT '[]',
  company_name VARCHAR(255),
  company_logo_url TEXT,
  header_text TEXT,
  footer_text TEXT,
  primary_color VARCHAR(7) DEFAULT '#1a73e8',
  secondary_color VARCHAR(7) DEFAULT '#34a853',
  font_family VARCHAR(100) DEFAULT 'Arial',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_report_templates_default ON report_templates(is_default);
CREATE INDEX idx_report_templates_created_by ON report_templates(created_by);

-- Insert default template
INSERT INTO report_templates (
  name,
  description,
  is_default,
  sections,
  company_name,
  header_text,
  footer_text
) VALUES (
  'Default Penetration Testing Report',
  'Standard penetration testing report template with all essential sections',
  true,
  '[{"type":"cover_page","title":"Penetration Testing Report","enabled":true},{"type":"executive_summary","title":"Executive Summary","enabled":true},{"type":"methodology","title":"Testing Methodology","enabled":true},{"type":"scope","title":"Scope of Testing","enabled":true},{"type":"findings_summary","title":"Findings Summary","enabled":true},{"type":"detailed_findings","title":"Detailed Findings","enabled":true},{"type":"risk_matrix","title":"Risk Assessment Matrix","enabled":true},{"type":"recommendations","title":"Recommendations","enabled":true},{"type":"conclusion","title":"Conclusion","enabled":true},{"type":"appendix","title":"Appendix","enabled":false}]'::jsonb,
  'SecurifyAI',
  'CONFIDENTIAL - Penetration Testing Report',
  'This document contains confidential information'
);

-- Down Migration
-- DROP TABLE IF EXISTS report_templates CASCADE;
