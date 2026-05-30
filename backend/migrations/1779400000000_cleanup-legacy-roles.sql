-- Up Migration
-- Clean up legacy analyst/reviewer roles; final RBAC = admin, manager, reporter, client

-- 1. Drop BOTH old constraints first (to allow data updates)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE role_requests DROP CONSTRAINT IF EXISTS role_requests_requested_role_check;

-- 2. Fix backfill: users with role = 'reviewer' should map to manager, not reporter
UPDATE users
SET role = 'manager',
    role_id = (SELECT id FROM roles WHERE slug = 'manager')
WHERE role = 'reviewer';

-- 3. Users with role = 'analyst' → reporter (legacy column update)
UPDATE users
SET role = 'reporter'
WHERE role = 'analyst';

-- 4. Fix role_requests with legacy roles
UPDATE role_requests
SET requested_role = 'reporter'
WHERE requested_role IN ('analyst', 'reviewer');

-- 5. Add new constraints with only 4 final roles
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'manager', 'reporter', 'client'));

ALTER TABLE role_requests ADD CONSTRAINT role_requests_requested_role_check
  CHECK (requested_role IN ('reporter'));

-- Down Migration
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
-- ALTER TABLE users ADD CONSTRAINT users_role_check
--   CHECK (role IN ('admin', 'manager', 'analyst', 'reviewer', 'client'));
-- ALTER TABLE role_requests DROP CONSTRAINT IF EXISTS role_requests_requested_role_check;
-- ALTER TABLE role_requests ADD CONSTRAINT role_requests_requested_role_check
--   CHECK (requested_role IN ('analyst', 'reviewer'));
