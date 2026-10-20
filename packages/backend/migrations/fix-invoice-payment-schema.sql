-- Owner invoices: partial/deposit payments and the sent/partial reminder queries fail without this enum value.
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'partial';

-- Promoter invoices: marking an invoice paid also writes paid_at, which this table never had.
ALTER TABLE promoter_invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
