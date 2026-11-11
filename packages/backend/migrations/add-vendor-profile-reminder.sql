-- When a vendor was sent the "add your profile photo and banner" reminder (once per vendor).
-- Safe to run more than once. Run on the Supabase SQL editor for each environment.

ALTER TABLE public.vendor_accounts
  ADD COLUMN IF NOT EXISTS profile_reminder_sent_at timestamptz;
