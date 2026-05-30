-- Convert affected_target from TEXT to JSONB array for multiple URL support
-- Migrate existing single text values into arrays

ALTER TABLE findings ALTER COLUMN affected_target TYPE JSONB USING
  CASE
    WHEN affected_target IS NULL OR affected_target = '' THEN '[]'::jsonb
    ELSE jsonb_build_array(affected_target)
  END;

ALTER TABLE findings ALTER COLUMN affected_target SET DEFAULT '[]'::jsonb;
