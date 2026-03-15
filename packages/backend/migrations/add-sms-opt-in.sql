-- Migration: Add SMS opt-in tracking to users
-- Required for campaign compliance: only message users who have given express consent

-- Add sms_opt_in column (false by default — explicit opt-in required)
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_opt_in_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_opt_out_at TIMESTAMPTZ;

-- Update existing users: opt-in defaults to false (must re-consent)
-- Owners can mark clients as opted-in after collecting consent via registration form
UPDATE users SET sms_opt_in = FALSE WHERE sms_opt_in IS NULL;
