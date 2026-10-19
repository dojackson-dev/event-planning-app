-- Fixed-dollar deposits and a separate balance due date on artist, promoter and vendor invoices.
-- Existing invoices keep NULL here and behave exactly as before (single full payment).
-- pending_credit_cents records how much the in-flight Stripe checkout will credit to the invoice.

ALTER TABLE artist_invoices
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS balance_due_date DATE,
  ADD COLUMN IF NOT EXISTS pending_credit_cents INTEGER;

ALTER TABLE promoter_invoices
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS balance_due_date DATE,
  ADD COLUMN IF NOT EXISTS pending_credit_cents INTEGER;

ALTER TABLE vendor_invoices
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS balance_due_date DATE,
  ADD COLUMN IF NOT EXISTS pending_credit_cents INTEGER;

NOTIFY pgrst, 'reload schema';
