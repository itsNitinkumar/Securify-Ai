-- Up Migration
ALTER TABLE findings ALTER COLUMN project_id DROP NOT NULL;

-- Down Migration
ALTER TABLE findings ALTER COLUMN project_id SET NOT NULL;
