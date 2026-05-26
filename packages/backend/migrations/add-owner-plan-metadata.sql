-- ============================================================================
-- Add plan metadata columns to owner_accounts
-- Tracks the canonical plan name and enforced limits per subscription tier.
-- ============================================================================

ALTER TABLE owner_accounts
  ADD COLUMN IF NOT EXISTS plan_name         VARCHAR(50)   DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS venue_limit       INT           DEFAULT 1,
  ADD COLUMN IF NOT EXISTS team_member_limit INT           DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_member_price DECIMAL(10,2) DEFAULT 15.00;

-- Back-fill existing active/trialing rows to 'free' defaults (safe no-op on new installs)
UPDATE owner_accounts
SET plan_name = 'free'
WHERE plan_name IS NULL;

-- Index for plan-based queries
CREATE INDEX IF NOT EXISTS idx_owner_accounts_plan_name
  ON owner_accounts (plan_name);

-- ── Plan reference ──────────────────────────────────────────────────────────
-- free:       venue_limit=1,  team_member_limit=0,  extra_member_price=15.00
-- pro:        venue_limit=3,  team_member_limit=3,  extra_member_price=NULL
-- premium:    venue_limit=5,  team_member_limit=5,  extra_member_price=NULL
-- enterprise: venue_limit=NULL (custom), team_member_limit=NULL (custom)
