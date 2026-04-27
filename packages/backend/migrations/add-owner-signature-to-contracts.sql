-- Add owner counter-signature fields to the contracts table
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/unzfkcmmakyyjgruexpy/editor

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS owner_signature_data  TEXT,
  ADD COLUMN IF NOT EXISTS owner_signer_name     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS owner_signed_date     TIMESTAMPTZ;
