-- Up Migration
-- Add admin role and change default to client
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'manager', 'analyst', 'reviewer', 'client'));

-- Change default role to client
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'client';

-- Update existing users (optional - comment out if you want to keep existing roles)
-- UPDATE users SET role = 'client' WHERE role = 'analyst' AND id != 1;

-- Down Migration
-- ALTER TABLE users ALTER COLUMN role SET DEFAULT 'analyst';
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
-- ALTER TABLE users ADD CONSTRAINT users_role_check 
--   CHECK (role IN ('analyst', 'reviewer', 'manager', 'client'));