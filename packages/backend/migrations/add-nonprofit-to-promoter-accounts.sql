-- ================================================================
-- NON-PROFIT PROMOTERS
-- ================================================================
-- Lets a promoter account declare itself a non-profit and be checked
-- against IRS exempt-organization data (via ProPublica Nonprofit Explorer).
--
-- nonprofit_status:
--   unverified  declared, not yet checked (or EIN changed)
--   verified    IRS data shows an active 501(c)(3)
--   rejected    not found, or not an active 501(c)(3)
--
-- "verified" proves the EIN is a real 501(c)(3); it does NOT prove the
-- promoter represents that organization. Stripe Connect onboarding (identity
-- + business verification) is the second check before payouts.
-- Safe to run multiple times.
-- ================================================================

ALTER TABLE promoter_accounts
  ADD COLUMN IF NOT EXISTS is_nonprofit BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nonprofit_ein TEXT,
  ADD COLUMN IF NOT EXISTS nonprofit_legal_name TEXT,
  ADD COLUMN IF NOT EXISTS nonprofit_status TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS nonprofit_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nonprofit_check JSONB;

ALTER TABLE promoter_accounts
  DROP CONSTRAINT IF EXISTS promoter_accounts_nonprofit_status_check;
ALTER TABLE promoter_accounts
  ADD CONSTRAINT promoter_accounts_nonprofit_status_check
  CHECK (nonprofit_status IN ('unverified', 'verified', 'rejected'));

ALTER TABLE promoter_accounts
  DROP CONSTRAINT IF EXISTS promoter_accounts_nonprofit_ein_format_check;
ALTER TABLE promoter_accounts
  ADD CONSTRAINT promoter_accounts_nonprofit_ein_format_check
  CHECK (nonprofit_ein IS NULL OR nonprofit_ein ~ '^[0-9]{9}$');

-- One verified account per EIN, so an EIN can't be claimed twice.
CREATE UNIQUE INDEX IF NOT EXISTS promoter_accounts_verified_ein_idx
  ON promoter_accounts (nonprofit_ein)
  WHERE nonprofit_status = 'verified';

NOTIFY pgrst, 'reload schema';
