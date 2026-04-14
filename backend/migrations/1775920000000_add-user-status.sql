-- Up Migration
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended'));

-- Update existing users to have active status
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Down Migration
-- ALTER TABLE users DROP COLUMN IF EXISTS status;
