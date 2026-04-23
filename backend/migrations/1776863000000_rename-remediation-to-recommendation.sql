-- Up Migration
-- Rename remediation to recommendation in both tables
ALTER TABLE findings RENAME COLUMN remediation TO recommendation;
ALTER TABLE finding_versions RENAME COLUMN remediation TO recommendation;

-- Down Migration
-- ALTER TABLE findings RENAME COLUMN recommendation TO remediation;
-- ALTER TABLE finding_versions RENAME COLUMN recommendation TO remediation;
