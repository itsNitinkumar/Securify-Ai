-- Up Migration

-- 1. Add DAST template to report_templates
INSERT INTO report_templates (name, description, is_default, template_data, created_by)
SELECT
  'DAST',
  'Dynamic Application Security Testing (DAST) report template',
  false,
  '{
    "key": "dast",
    "docx_template_file": "DAST_template.docx"
  }'::jsonb,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM report_templates WHERE LOWER(name) = 'dast'
);

-- 2. Add finding_type column to findings
ALTER TABLE findings
ADD COLUMN IF NOT EXISTS finding_type VARCHAR(20) NOT NULL DEFAULT 'true_positive'
CHECK (finding_type IN ('true_positive', 'false_positive'));

-- 3. Add validation_status column to findings
ALTER TABLE findings
ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT NULL
CHECK (validation_status IS NULL OR validation_status IN ('confirmed', 'false_positive', 'inconclusive'));

-- 4. Add evidence_items column to findings (JSONB array for FP evidence)
ALTER TABLE findings
ADD COLUMN IF NOT EXISTS evidence_items JSONB DEFAULT '[]'::jsonb;

-- Down Migration
-- ALTER TABLE findings DROP COLUMN IF EXISTS evidence_items;
-- ALTER TABLE findings DROP COLUMN IF EXISTS validation_status;
-- ALTER TABLE findings DROP COLUMN IF EXISTS finding_type;
-- DELETE FROM report_templates WHERE LOWER(name) = 'dast';
