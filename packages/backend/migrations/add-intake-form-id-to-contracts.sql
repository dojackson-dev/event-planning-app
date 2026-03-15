-- Add intake_form_id to contracts table so contracts can be linked to intake form clients
-- Run this in the Supabase SQL editor

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS intake_form_id UUID REFERENCES intake_forms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_intake_form_id ON contracts(intake_form_id);
