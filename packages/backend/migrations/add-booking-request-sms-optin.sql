-- Add SMS opt-in flag to vendor_booking_requests
-- Clients submitted through public booking links can opt in to receive
-- text (SMS) notifications when their request is confirmed or declined.

ALTER TABLE vendor_booking_requests
  ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN NOT NULL DEFAULT false;
