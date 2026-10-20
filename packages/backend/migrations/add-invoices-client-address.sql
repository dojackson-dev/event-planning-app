ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_address TEXT;

NOTIFY pgrst, 'reload schema';
