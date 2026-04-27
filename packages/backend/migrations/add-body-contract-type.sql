-- Migration: Add body, contract_type, and vendor_account_id to contracts table
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/unzfkcmmakyyjgruexpy/editor

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS body              TEXT,
  ADD COLUMN IF NOT EXISTS contract_type     TEXT DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS vendor_account_id UUID REFERENCES vendor_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_contract_type ON contracts(contract_type)
  WHERE contract_type IS NOT NULL;

-- Allow vendors to read contracts assigned to their account
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contracts' AND policyname = 'Vendors can read their own contracts'
  ) THEN
    CREATE POLICY "Vendors can read their own contracts"
      ON contracts FOR SELECT
      USING (vendor_account_id IN (SELECT id FROM vendor_accounts WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Allow vendors to update (sign) contracts assigned to their account
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contracts' AND policyname = 'Vendors can update their own contracts'
  ) THEN
    CREATE POLICY "Vendors can update their own contracts"
      ON contracts FOR UPDATE
      USING (vendor_account_id IN (SELECT id FROM vendor_accounts WHERE user_id = auth.uid()));
  END IF;
END $$;
