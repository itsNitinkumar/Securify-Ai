-- Create step_images table for S3-based image storage
CREATE TABLE IF NOT EXISTS step_images (
  id SERIAL PRIMARY KEY,
  finding_id INTEGER NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  step_id INTEGER NOT NULL,
  image_key TEXT NOT NULL,
  mime_type TEXT,
  original_name TEXT,
  caption TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_step_images_finding_id ON step_images(finding_id);
CREATE INDEX IF NOT EXISTS idx_step_images_step_id ON step_images(step_id);
