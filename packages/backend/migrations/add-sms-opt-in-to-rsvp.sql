-- Migration: Add sms_opt_in to rsvp_guests
-- Guests can opt in to receive SMS event reminders when they RSVP.
-- Run this in the Supabase SQL Editor.

ALTER TABLE rsvp_guests
  ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT FALSE;

UPDATE rsvp_guests SET sms_opt_in = FALSE WHERE sms_opt_in IS NULL;

ALTER TABLE rsvp_guests
  ALTER COLUMN sms_opt_in SET DEFAULT FALSE,
  ALTER COLUMN sms_opt_in SET NOT NULL;
