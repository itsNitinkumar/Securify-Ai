-- Up Migration
-- Fix role constraint to include admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'manager', 'reviewer', 'analyst', 'client'));

-- Ensure default role is client
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'client';

-- Down Migration
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
