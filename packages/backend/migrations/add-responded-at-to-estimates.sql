-- Migration: Add responded_at column to estimates table
-- Track when a client approves or rejects an estimate

ALTER TABLE estimates ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- Create index for querying by responded_at
CREATE INDEX IF NOT EXISTS idx_estimates_responded_at ON estimates(responded_at);
