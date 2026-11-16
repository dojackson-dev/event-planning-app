-- Staff pay, phase 2: pay approved shifts to workers' own Stripe accounts.
-- The venue pays once (card or bank) for a batch of approved shifts; when that payment succeeds, EventEcos
-- transfers each worker's amount to their connected Stripe account. Stripe collects the worker's tax ID
-- and bank details and can file their 1099 (turn on tax reporting for Connect in the Stripe dashboard).
-- Run after create-staff-pay.sql. Safe to run more than once.

-- Where each worker gets paid, and the secret link they use to set it up.
ALTER TABLE public.staff_members
  ADD COLUMN IF NOT EXISTS stripe_account_id  text,
  ADD COLUMN IF NOT EXISTS payout_status      text NOT NULL DEFAULT 'not_connected'
    CHECK (payout_status IN ('not_connected', 'pending', 'ready')),
  ADD COLUMN IF NOT EXISTS payout_setup_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS payout_setup_sent_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS staff_members_stripe_account_idx
  ON public.staff_members (stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- One row per payment the venue makes.
CREATE TABLE IF NOT EXISTS public.staff_payouts (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- pending_payment: waiting on the venue's checkout; processing: bank debit in flight;
  -- transferring/completed: workers being paid / paid; needs_attention: a transfer failed;
  -- cancelled: checkout abandoned, expired or failed.
  status                     text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'processing', 'transferring', 'completed', 'needs_attention', 'cancelled')),
  pay_method                 text NOT NULL DEFAULT 'card' CHECK (pay_method IN ('card', 'bank')),
  payroll_cents              integer NOT NULL CHECK (payroll_cents > 0),
  service_fee_cents          integer NOT NULL DEFAULT 0 CHECK (service_fee_cents >= 0),
  processing_fee_cents       integer NOT NULL DEFAULT 0 CHECK (processing_fee_cents >= 0),
  total_cents                integer NOT NULL CHECK (total_cents > 0),
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id   text,
  stripe_charge_id           text,
  paid_in_at                 timestamptz,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_payouts_owner_idx ON public.staff_payouts (owner_id, created_at DESC);

-- One row per worker's shift inside a payment, each with its own Stripe transfer.
CREATE TABLE IF NOT EXISTS public.staff_payout_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id          uuid NOT NULL REFERENCES public.staff_payouts(id) ON DELETE CASCADE,
  shift_id           uuid NOT NULL REFERENCES public.staff_shifts(id) ON DELETE RESTRICT,
  staff_member_id    uuid NOT NULL REFERENCES public.staff_members(id) ON DELETE RESTRICT,
  amount_cents       integer NOT NULL CHECK (amount_cents > 0),
  status             text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'transferred', 'failed')),
  stripe_transfer_id text,
  -- Each try uses a fresh idempotency key (Stripe replays a failed result for a repeated key).
  attempts           integer NOT NULL DEFAULT 0,
  error              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_payout_items_payout_idx ON public.staff_payout_items (payout_id);

-- A shift joins at most one payment at a time. Released (set to null) if the payment is cancelled.
ALTER TABLE public.staff_shifts
  ADD COLUMN IF NOT EXISTS payout_id uuid REFERENCES public.staff_payouts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS staff_shifts_payout_idx ON public.staff_shifts (payout_id);

ALTER TABLE public.staff_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_payout_items ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
