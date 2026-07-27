-- Migration: Ensure plus_ones column exists on rsvp_guests with correct default
-- Safe to run even if the column already exists.
-- Run in Supabase SQL Editor.

-- 1. Add column if it doesn't exist yet (no-op if it does)
ALTER TABLE rsvp_guests
  ADD COLUMN IF NOT EXISTS plus_ones INTEGER DEFAULT 0;

-- 2. Back-fill any existing rows that have NULL (from before default was set)
UPDATE rsvp_guests
  SET plus_ones = 0
  WHERE plus_ones IS NULL;

-- 3. Enforce NOT NULL + default going forward
ALTER TABLE rsvp_guests
  ALTER COLUMN plus_ones SET DEFAULT 0,
  ALTER COLUMN plus_ones SET NOT NULL;
