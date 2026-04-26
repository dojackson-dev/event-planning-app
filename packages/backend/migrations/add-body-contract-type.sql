-- Migration: add body, contract_type, and vendor_account_id to contracts table
-- Run this in the Supabase SQL Editor

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'upload';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS vendor_account_id UUID REFERENCES vendor_accounts(id) ON DELETE SET NULL;

-- Allow vendors to read contracts assigned to their account
CREATE POLICY IF NOT EXISTS "Vendors can read their own contracts"
  ON contracts FOR SELECT
  USING (
    vendor_account_id IN (
      SELECT id FROM vendor_accounts WHERE user_id = auth.uid()
    )
  );

-- Allow vendors to update (sign) contracts assigned to their account
CREATE POLICY IF NOT EXISTS "Vendors can update their own contracts"
  ON contracts FOR UPDATE
  USING (
    vendor_account_id IN (
      SELECT id FROM vendor_accounts WHERE user_id = auth.uid()
    )
  );
