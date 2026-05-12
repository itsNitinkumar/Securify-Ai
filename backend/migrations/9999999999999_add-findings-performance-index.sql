-- Add composite index for report generation queries
-- This speeds up: SELECT * FROM findings WHERE project_id = X AND status = 'approved' ORDER BY created_at DESC

CREATE INDEX IF NOT EXISTS idx_findings_project_status_created 
ON findings(project_id, status, created_at DESC);