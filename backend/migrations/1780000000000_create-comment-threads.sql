-- migrate:up

-- Create comment_threads table
CREATE TABLE IF NOT EXISTS comment_threads (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  finding_id INTEGER REFERENCES findings(id) ON DELETE CASCADE,
  section_type VARCHAR(100) NOT NULL,
  section_key VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'REOPENED')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create comment_thread_replies table
CREATE TABLE IF NOT EXISTS comment_thread_replies (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES comment_threads(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_threads_project ON comment_threads(project_id);
CREATE INDEX IF NOT EXISTS idx_comment_threads_finding ON comment_threads(finding_id);
CREATE INDEX IF NOT EXISTS idx_comment_threads_section ON comment_threads(project_id, section_type, section_key);
CREATE INDEX IF NOT EXISTS idx_comment_threads_status ON comment_threads(project_id, status);
CREATE INDEX IF NOT EXISTS idx_comment_thread_replies_thread ON comment_thread_replies(thread_id);

-- migrate:down

DROP TABLE IF EXISTS comment_thread_replies;
DROP TABLE IF EXISTS comment_threads;
