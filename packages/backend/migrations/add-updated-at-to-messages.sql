-- Fix: messages table is missing updated_at column
-- The update_updated_at_column trigger fires on every UPDATE but the column
-- doesn't exist, causing all UPDATEs (status → sent/failed) to silently fail.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill existing rows
UPDATE messages SET updated_at = created_at WHERE updated_at IS NULL;
