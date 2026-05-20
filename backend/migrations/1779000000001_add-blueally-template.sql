-- Up Migration

INSERT INTO report_templates (name, description, is_default, template_data, created_by)
SELECT
  'BlueAlly',
  'BlueAlly report template',
  false,
  '{
    "key": "blueally",
    "docx_template_file": "blueally.docx"
  }'::jsonb,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM report_templates WHERE LOWER(name) = 'blueally'
);

-- Down Migration
-- DELETE FROM report_templates WHERE LOWER(name) = 'blueally';
