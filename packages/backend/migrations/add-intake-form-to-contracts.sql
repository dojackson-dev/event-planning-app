-- Migration: Add intake_form_id to contracts table
-- This allows contracts created from intake forms to be linked back to the client
-- Run this in Supabase SQL Editor

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS intake_form_id UUID REFERENCES intake_forms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_intake_form_id ON contracts(intake_form_id);
