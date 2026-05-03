-- ADD zip_code COLUMN TO public_events
-- Run this in Supabase SQL editor

ALTER TABLE public_events ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_public_events_zip_code ON public_events(zip_code);
