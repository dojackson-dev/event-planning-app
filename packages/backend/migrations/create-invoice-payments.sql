-- Manual payments recorded against invoices (cash, check, Zelle, bank transfer, and so on).
-- One table serves owner, vendor, artist and promoter invoices; invoice_type says which invoice table
-- invoice_id points to. The backend checks ownership, so RLS is enabled with no public policies.
-- A voided payment is kept for the audit trail and no longer counts toward the invoice.

CREATE TABLE IF NOT EXISTS invoice_payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_type   TEXT NOT NULL CHECK (invoice_type IN ('owner', 'vendor', 'artist', 'promoter')),
  invoice_id     UUID NOT NULL,
  amount         NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  method         TEXT NOT NULL CHECK (method IN ('cash', 'check', 'zelle', 'bank_transfer', 'card_in_person', 'other')),
  paid_on        DATE NOT NULL,
  reference      TEXT,
  notes          TEXT,
  recorded_by    UUID,
  voided_at      TIMESTAMPTZ,
  voided_by      UUID,
  void_reason    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments (invoice_type, invoice_id);

ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
