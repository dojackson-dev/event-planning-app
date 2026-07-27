-- Contract template data migration
-- Run this in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/unzfkcmmakyyjgruexpy/editor

-- Add template_data column to store original form field values for template-generated contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS template_data jsonb;
