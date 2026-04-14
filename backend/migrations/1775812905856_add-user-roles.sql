-- Up Migration
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'analyst' CHECK (role IN ('analyst', 'reviewer', 'manager', 'client'));

-- Update existing users to have analyst role
UPDATE users SET role = 'analyst' WHERE role IS NULL;

-- Down Migration
ALTER TABLE users DROP COLUMN IF EXISTS role;