-- Migration: Add default payment schedule to owner_accounts (configured once in Settings → Billing)
-- Also stores the snapshot on each invoice so the schedule is preserved even if settings change later.

-- 1. Owner-level defaults (set in Settings → Billing)
ALTER TABLE owner_accounts
  ADD COLUMN IF NOT EXISTS default_deposit_percentage         NUMERIC(5,2),  -- e.g. 30 = 30%
  ADD COLUMN IF NOT EXISTS default_deposit_due_days_before    INTEGER,        -- e.g. 45 → deposit due 45 days before event
  ADD COLUMN IF NOT EXISTS default_final_payment_due_days_before INTEGER;     -- e.g. 20 → final payment due 20 days before event

COMMENT ON COLUMN owner_accounts.default_deposit_percentage          IS 'Default deposit % required to confirm a booking (0-100). Applied to new invoices.';
COMMENT ON COLUMN owner_accounts.default_deposit_due_days_before     IS 'Default: days before event that the deposit is due.';
COMMENT ON COLUMN owner_accounts.default_final_payment_due_days_before IS 'Default: days before event that the final payment is due.';

-- 2. Per-invoice snapshot (auto-copied from owner settings when invoice is created)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS deposit_percentage              NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS deposit_due_days_before         INTEGER,
  ADD COLUMN IF NOT EXISTS final_payment_due_days_before   INTEGER;

COMMENT ON COLUMN invoices.deposit_percentage          IS 'Snapshot of deposit % at time of invoice creation.';
COMMENT ON COLUMN invoices.deposit_due_days_before     IS 'Snapshot: days before event the deposit is due.';
COMMENT ON COLUMN invoices.final_payment_due_days_before IS 'Snapshot: days before event the final payment is due.';
