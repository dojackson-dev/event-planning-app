-- Add Stripe billing columns to promoter_accounts
-- Also adds plan column if the previous migration was not yet run.
ALTER TABLE promoter_accounts
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'premium')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
