-- Up Migration
-- Add logo_path column to report_templates if it doesn't exist
ALTER TABLE report_templates
ADD COLUMN IF NOT EXISTS logo_path TEXT;

-- Down Migration
-- ALTER TABLE report_templates DROP COLUMN IF EXISTS logo_path;
