-- Up Migration

-- Add admin role and role request system
-- Update users table to support role requests
ALTER TABLE users ADD COLUMN IF NOT EXISTS requested_role VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_request_status VARCHAR(50) DEFAULT NULL CHECK (role_request_status IN ('pending', 'approved', 'rejected', NULL));
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_request_date TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_approved_date TIMESTAMP;

-- Create role_requests table for tracking history
CREATE TABLE IF NOT EXISTS role_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  requested_role VARCHAR(50) NOT NULL CHECK (requested_role IN ('analyst', 'reviewer')),
  previous_role VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  request_reason TEXT,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_role_requests_user ON role_requests(user_id);
CREATE INDEX idx_role_requests_status ON role_requests(status);
CREATE INDEX idx_users_role_request_status ON users(role_request_status);

-- Down Migration
-- DROP TABLE IF EXISTS role_requests;
-- ALTER TABLE users DROP COLUMN IF EXISTS requested_role;
-- ALTER TABLE users DROP COLUMN IF EXISTS role_request_status;
-- ALTER TABLE users DROP COLUMN IF EXISTS role_request_date;
-- ALTER TABLE users DROP COLUMN IF EXISTS role_approved_by;
-- ALTER TABLE users DROP COLUMN IF EXISTS role_approved_date;
