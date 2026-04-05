-- migrate:up

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

INSERT INTO users (email, name) VALUES
  ('john@example.com', 'John Doe'),
  ('jane@example.com', 'Jane Smith')
ON CONFLICT DO NOTHING;


-- -- migrate:down

-- DROP TABLE IF EXISTS users;