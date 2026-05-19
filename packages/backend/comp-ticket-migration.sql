-- Comp ticket migration
-- Run this in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/unzfkcmmakyyjgruexpy/editor

-- Add is_comp flag and comp_note to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS is_comp boolean DEFAULT false;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS comp_note text;

-- Index for querying comp tickets
CREATE INDEX IF NOT EXISTS idx_tickets_is_comp ON tickets(is_comp) WHERE is_comp = true;
