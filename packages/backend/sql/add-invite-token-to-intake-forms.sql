-- Add invite token fields to intake_forms table
-- Run this in the Supabase SQL Editor

ALTER TABLE intake_forms
  ADD COLUMN IF NOT EXISTS invite_token UUID DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_status TEXT DEFAULT 'pending';

-- Ensure every existing row has a unique invite_token
UPDATE intake_forms SET invite_token = gen_random_uuid() WHERE invite_token IS NULL;

-- Add an index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_intake_forms_invite_token ON intake_forms(invite_token);
