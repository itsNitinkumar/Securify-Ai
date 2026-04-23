-- Up Migration
-- Change remediation from TEXT to JSONB to store array of bullet points
ALTER TABLE findings ALTER COLUMN remediation TYPE JSONB USING 
  CASE 
    WHEN remediation IS NULL THEN NULL
    ELSE jsonb_build_array(remediation)
  END;

ALTER TABLE finding_versions ALTER COLUMN remediation TYPE JSONB USING 
  CASE 
    WHEN remediation IS NULL THEN NULL
    ELSE jsonb_build_array(remediation)
  END;

-- Down Migration
-- ALTER TABLE findings ALTER COLUMN remediation TYPE TEXT;
-- ALTER TABLE finding_versions ALTER COLUMN remediation TYPE TEXT;
