-- Migration: Allow promoters to manage their own contracts
-- Promoters are users with role = 'promoter'. They can create contracts as owner_id.
-- The existing "Owners can manage their contracts" policy already covers any user
-- where auth.uid() = owner_id, so promoters already have full CRUD access.
--
-- This migration also adds a 'promoter_template' contract_type value for contracts
-- generated from the promoter Artist Performance Agreement template.
--
-- Run this in the Supabase SQL Editor.

-- No schema change needed — the existing contracts table supports promoters as owners.
-- The existing RLS policy "Owners can manage their contracts" (auth.uid() = owner_id)
-- already allows promoters to create, read, update, and delete their own contracts.
--
-- However, we add an explicit index on contract_type to speed up future filtering:
CREATE INDEX IF NOT EXISTS idx_contracts_owner_id_type
  ON contracts(owner_id, contract_type)
  WHERE contract_type IS NOT NULL;

-- Allow promoters to read contracts where they are the client (artist side)
-- e.g., if a promoter was sent a contract as an artist for a different event.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contracts'
      AND policyname = 'Promoters can read contracts sent to them'
  ) THEN
    CREATE POLICY "Promoters can read contracts sent to them"
      ON contracts FOR SELECT
      USING (auth.uid() = client_id);
  END IF;
END $$;
