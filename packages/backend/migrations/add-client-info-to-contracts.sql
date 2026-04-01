-- Migration: Add client contact info columns to contracts table
-- Allows sendContract() to SMS the client directly from the contract record,
-- and lets the client portal look up contracts by phone number.
-- Run this in the Supabase SQL Editor.

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS client_name  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS client_email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_contracts_client_phone ON contracts(client_phone)
  WHERE client_phone IS NOT NULL;

-- Backfill from linked intake forms
UPDATE contracts c
SET
  client_name  = COALESCE(c.client_name,  f.contact_name),
  client_phone = COALESCE(c.client_phone, f.contact_phone),
  client_email = COALESCE(c.client_email, f.contact_email)
FROM intake_forms f
WHERE c.intake_form_id = f.id
  AND (c.client_phone IS NULL OR c.client_name IS NULL);
