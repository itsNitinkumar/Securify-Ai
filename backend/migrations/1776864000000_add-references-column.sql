-- Up Migration
-- Add references column (JSONB array) for AI-generated references
ALTER TABLE findings 
ADD COLUMN IF NOT EXISTS "references" JSONB;

-- Migrate existing finding_references to references if not already done
UPDATE findings 
SET "references" = finding_references
WHERE finding_references IS NOT NULL AND ("references" IS NULL OR "references" = 'null'::jsonb);

-- Also add to finding_versions table
ALTER TABLE finding_versions 
ADD COLUMN IF NOT EXISTS "references" JSONB;

-- Down Migration
-- ALTER TABLE findings DROP COLUMN IF EXISTS "references";
-- ALTER TABLE finding_versions DROP COLUMN IF EXISTS "references";
