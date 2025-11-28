-- Add missing columns to intake_forms table
-- Run this in Supabase SQL Editor

ALTER TABLE public.intake_forms 
  ADD COLUMN IF NOT EXISTS venue_preference VARCHAR(255),
  ADD COLUMN IF NOT EXISTS catering_requirements TEXT,
  ADD COLUMN IF NOT EXISTS equipment_needs TEXT,
  ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT,
  ADD COLUMN IF NOT EXISTS accessibility_requirements TEXT;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'intake_forms'
ORDER BY ordinal_position;
