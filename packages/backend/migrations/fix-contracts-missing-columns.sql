-- Fix for POST /contracts 500 error
-- The contracts table is missing intake_form_id, client_name, client_phone, and client_email
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/unzfkcmmakyyjgruexpy/editor

-- 1. Add intake_form_id column
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS intake_form_id UUID REFERENCES intake_forms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_intake_form_id ON contracts(intake_form_id);

-- 2. Add client contact info columns
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS client_name  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS client_email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_contracts_client_phone ON contracts(client_phone)
  WHERE client_phone IS NOT NULL;

-- 3. Backfill existing contracts from linked intake forms (optional, safe to run)
UPDATE contracts c
SET
  client_name  = COALESCE(c.client_name,  f.contact_name),
  client_phone = COALESCE(c.client_phone, f.contact_phone),
  client_email = COALESCE(c.client_email, f.contact_email)
FROM intake_forms f
WHERE c.intake_form_id = f.id
  AND (c.client_phone IS NULL OR c.client_name IS NULL);
