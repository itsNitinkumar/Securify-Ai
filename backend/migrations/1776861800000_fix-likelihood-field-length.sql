-- Up Migration
-- Change likelihood from VARCHAR(50) to TEXT to allow longer descriptions
ALTER TABLE findings ALTER COLUMN likelihood TYPE TEXT;

-- Down Migration
-- ALTER TABLE findings ALTER COLUMN likelihood TYPE VARCHAR(50);
