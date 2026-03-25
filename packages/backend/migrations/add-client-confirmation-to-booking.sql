-- Migration: Add client_confirmation_status to booking table
-- Run in Supabase SQL Editor
-- Allows tracking whether a client has confirmed a booking linked to them via intake form phone match

ALTER TABLE booking
  ADD COLUMN IF NOT EXISTS client_confirmation_status VARCHAR(20);
-- Values: NULL = not applicable (client booked directly)
--         'pending'   = linked via intake form phone, awaiting client confirmation
--         'confirmed' = client confirmed this is their event
--         'rejected'  = client said this is not their booking

CREATE INDEX IF NOT EXISTS idx_booking_client_confirmation
  ON booking(client_confirmation_status)
  WHERE client_confirmation_status IS NOT NULL;
