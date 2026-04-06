-- Up Migration
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Down Migration
ALTER TABLE users DROP COLUMN IF EXISTS password;
