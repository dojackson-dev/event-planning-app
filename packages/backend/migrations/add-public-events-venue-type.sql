-- ================================================================
-- ADD venue_type COLUMN TO public_events
-- ================================================================
-- Run this in Supabase SQL Editor:
-- https://app.supabase.com/project/unzfkcmmakyyjgruexpy/sql/new
-- ================================================================

ALTER TABLE public_events ADD COLUMN IF NOT EXISTS venue_type VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_public_events_venue_type ON public_events(venue_type);
