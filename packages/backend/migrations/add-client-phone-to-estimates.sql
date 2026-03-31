-- Migration: Add client_phone and client_email to estimates table
-- This allows estimates to be directly discoverable by the client's phone number
-- in the client portal regardless of how the booking was created.
-- Run this in Supabase SQL Editor

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS client_email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_estimates_client_phone ON estimates(client_phone);

-- Backfill client_phone and client_email from linked bookings for existing estimates
UPDATE estimates e
SET
  client_phone = b.contact_phone,
  client_email = b.contact_email
FROM booking b
WHERE e.booking_id = b.id
  AND e.client_phone IS NULL
  AND b.contact_phone IS NOT NULL;

-- Backfill from intake_forms for estimates linked via intake_form_id
UPDATE estimates e
SET
  client_phone = COALESCE(e.client_phone, f.contact_phone),
  client_email = COALESCE(e.client_email, f.contact_email)
FROM intake_forms f
WHERE e.intake_form_id = f.id
  AND (e.client_phone IS NULL OR e.client_email IS NULL)
  AND f.contact_phone IS NOT NULL;
