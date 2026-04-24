-- Migration: Add body and contract_type columns to contracts table
-- body        – inline contract content (rich text / plain text) as an alternative
--               to uploading a file. NULL when a file-based contract is used.
-- contract_type – categorises the contract (e.g. 'venue_rental', 'catering',
--               'service_agreement', 'entertainment'). NULL = uncategorised.
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/unzfkcmmakyyjgruexpy/editor

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS body          TEXT,
  ADD COLUMN IF NOT EXISTS contract_type VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_contracts_contract_type ON contracts(contract_type)
  WHERE contract_type IS NOT NULL;
