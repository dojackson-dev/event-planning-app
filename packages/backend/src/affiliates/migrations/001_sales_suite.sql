-- ============================================================
-- SALES SUITE MIGRATION
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 0. ADD 'affiliate' TO user_role ENUM (required before inserting into users)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'affiliate'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'affiliate';
    RAISE NOTICE 'Added affiliate role to user_role enum';
  ELSE
    RAISE NOTICE 'Affiliate role already exists in user_role enum';
  END IF;
END;
$$;

-- 1. AFFILIATES TABLE
-- Stores affiliate/sales-rep accounts
CREATE TABLE IF NOT EXISTS public.affiliates (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name        TEXT        NOT NULL,
  last_name         TEXT        NOT NULL,
  email             TEXT        NOT NULL UNIQUE,
  phone             TEXT,
  referral_code     TEXT        NOT NULL UNIQUE,
  status            TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'inactive', 'pending')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ADD REFERRAL TRACKING TO OWNER_ACCOUNTS
ALTER TABLE public.owner_accounts
  ADD COLUMN IF NOT EXISTS referred_by_affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL;

-- 3. AFFILIATE REFERRALS TABLE
-- Tracks each owner recruited by an affiliate (one row per owner-affiliate pair)
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id          UUID        NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  owner_account_id      UUID        NOT NULL REFERENCES public.owner_accounts(id) ON DELETE CASCADE,
  status                TEXT        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'converted', 'churned')),
  converted_at          TIMESTAMPTZ,
  commission_expires_at TIMESTAMPTZ,  -- converted_at + 3 years
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(affiliate_id, owner_account_id)
);

-- 4. AFFILIATE COMMISSIONS TABLE
-- Tracks commission earned per payment event
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id            UUID          NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_id             UUID          NOT NULL REFERENCES public.affiliate_referrals(id) ON DELETE CASCADE,
  owner_account_id        UUID          NOT NULL REFERENCES public.owner_accounts(id) ON DELETE CASCADE,
  stripe_invoice_id       TEXT,
  stripe_subscription_id  TEXT,
  period_start            TIMESTAMPTZ,
  period_end              TIMESTAMPTZ,
  subscription_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,  -- Owner paid amount (dollars)
  commission_rate         NUMERIC(5,4)  NOT NULL DEFAULT 0,  -- e.g. 0.50 or 0.03
  commission_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,  -- Calculated commission
  commission_type         TEXT          NOT NULL DEFAULT 'recurring'
                                        CHECK (commission_type IN ('conversion', 'recurring')),
  status                  TEXT          NOT NULL DEFAULT 'pending'
                                        CHECK (status IN ('pending', 'paid', 'void')),
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id
  ON public.affiliates(user_id);

CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code
  ON public.affiliates(referral_code);

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_id
  ON public.affiliate_referrals(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_owner
  ON public.affiliate_referrals(owner_account_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_id
  ON public.affiliate_commissions(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_referral_id
  ON public.affiliate_commissions(referral_id);

CREATE INDEX IF NOT EXISTS idx_owner_accounts_referred_by
  ON public.owner_accounts(referred_by_affiliate_id);

-- 6. ROW LEVEL SECURITY
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- Affiliates can view and update their own record
CREATE POLICY "affiliates_select_own"
  ON public.affiliates FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "affiliates_update_own"
  ON public.affiliates FOR UPDATE
  USING (user_id = auth.uid());

-- Affiliates can view their own referrals
CREATE POLICY "affiliate_referrals_select_own"
  ON public.affiliate_referrals FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM public.affiliates WHERE user_id = auth.uid()
    )
  );

-- Affiliates can view their own commissions
CREATE POLICY "affiliate_commissions_select_own"
  ON public.affiliate_commissions FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM public.affiliates WHERE user_id = auth.uid()
    )
  );

-- 7. AUTO-UPDATE updated_at ON affiliates
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS affiliates_updated_at ON public.affiliates;
CREATE TRIGGER affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- DONE — Service role (backend) bypasses RLS for all writes.
-- Affiliates authenticate via Supabase Auth (role = 'affiliate'
-- in the users table) and read their own data via RLS.
-- ============================================================
