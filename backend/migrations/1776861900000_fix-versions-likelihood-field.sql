-- Up Migration
-- Change likelihood in finding_versions from VARCHAR(50) to TEXT
ALTER TABLE finding_versions ALTER COLUMN likelihood TYPE TEXT;

-- Down Migration
-- ALTER TABLE finding_versions ALTER COLUMN likelihood TYPE VARCHAR(50);
