-- ================================================================
-- ADD STRIPE CONNECT COLUMNS TO artist_accounts
-- ================================================================
-- Run this in Supabase SQL Editor:
-- https://app.supabase.com/project/unzfkcmmakyyjgruexpy/sql/new
-- ================================================================

ALTER TABLE artist_accounts
  ADD COLUMN IF NOT EXISTS stripe_account_id    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_connect_status VARCHAR(50) DEFAULT 'not_connected';
  -- stripe_connect_status: not_connected | pending | active

CREATE INDEX IF NOT EXISTS idx_artist_accounts_stripe_account_id ON artist_accounts(stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;
