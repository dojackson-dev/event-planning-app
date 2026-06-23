-- ================================================================
-- ADD zip_code AND venue_type TO public_events
-- ================================================================
-- Run this in the Supabase SQL Editor (dashboard.supabase.com)

ALTER TABLE public_events
  ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS venue_type VARCHAR(100);
