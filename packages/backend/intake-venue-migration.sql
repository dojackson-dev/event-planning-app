-- Add venue_id to intake_forms table
-- Run this in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/unzfkcmmakyyjgruexpy/editor

ALTER TABLE intake_forms
  ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES venues(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_intake_forms_venue_id ON intake_forms(venue_id);
