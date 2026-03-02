-- ============================================================================
-- Add Stripe subscription columns to owner_accounts (idempotent)
-- Run this if owner_accounts was created before the Stripe integration.
-- The create-auth-architecture.sql already includes these columns, so
-- this migration is a safe no-op if already applied.
-- ============================================================================

ALTER TABLE owner_accounts
  ADD COLUMN IF NOT EXISTS stripe_customer_id    VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subscription_status   VARCHAR(50) DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS plan_id               VARCHAR(100);

-- Indexes for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_owner_accounts_stripe_customer
  ON owner_accounts (stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_owner_accounts_subscription_status
  ON owner_accounts (subscription_status);

-- Valid subscription_status values:
--   inactive  - No subscription started
--   trialing  - Free trial period
--   active    - Paid subscription active
--   past_due  - Payment failed, grace period
--   canceled  - Subscription ended
