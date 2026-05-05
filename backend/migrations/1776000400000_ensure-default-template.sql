-- Ensure default report template exists
-- First, ensure the table has the correct structure

-- Add template_data column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'report_templates' AND column_name = 'template_data'
  ) THEN
    ALTER TABLE report_templates ADD COLUMN template_data JSONB NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- Delete any existing default templates
DELETE FROM report_templates WHERE is_default = true;

-- Insert the comprehensive default template
INSERT INTO report_templates (
  name,
  description,
  is_default,
  template_data,
  created_by
) VALUES (
  'Comprehensive Penetration Testing Report',
  'Professional penetration testing report template with comprehensive sections including cover page, executive summary, methodology, scope, findings summary, detailed findings, risk matrix, recommendations, and conclusion',
  true,
  '{"sections":[{"type":"cover_page","title":"Penetration Testing Report","enabled":true},{"type":"executive_summary","title":"Executive Summary","enabled":true},{"type":"methodology","title":"Testing Methodology","enabled":true},{"type":"scope","title":"Scope of Testing","enabled":true},{"type":"findings_summary","title":"Findings Summary","enabled":true},{"type":"detailed_findings","title":"Detailed Findings","enabled":true},{"type":"risk_matrix","title":"Risk Assessment Matrix","enabled":true},{"type":"recommendations","title":"Recommendations","enabled":true},{"type":"conclusion","title":"Conclusion","enabled":true},{"type":"appendix","title":"Appendix","enabled":false}],"company_name":"SecurifyAI","header_text":"CONFIDENTIAL - Penetration Testing Report","footer_text":"This document contains confidential information","primary_color":"#00d639","secondary_color":"#00ff41","font_family":"Arial","template_file":"comprehensive-report-template.html"}',
  NULL
);

