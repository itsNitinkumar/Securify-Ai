-- Fix findings status constraint to include 'changes_requested'
ALTER TABLE findings DROP CONSTRAINT IF EXISTS findings_status_check;
ALTER TABLE findings ADD CONSTRAINT findings_status_check 
  CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'changes_requested'));
