-- Up Migration
-- Allow 'None' severity for False Positive findings
ALTER TABLE findings DROP CONSTRAINT IF EXISTS findings_severity_check;
ALTER TABLE findings ADD CONSTRAINT findings_severity_check
  CHECK (severity IN ('Critical', 'High', 'Medium', 'Low', 'Informational', 'None'));

-- Down Migration
ALTER TABLE findings DROP CONSTRAINT IF EXISTS findings_severity_check;
ALTER TABLE findings ADD CONSTRAINT findings_severity_check
  CHECK (severity IN ('Critical', 'High', 'Medium', 'Low', 'Informational'));
