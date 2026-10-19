ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS contact_address TEXT;

NOTIFY pgrst, 'reload schema';
