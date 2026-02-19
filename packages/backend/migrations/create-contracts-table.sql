-- Migration: Create contracts table
-- Run this in Supabase SQL Editor

DO $$ BEGIN
  CREATE TYPE contract_status AS ENUM ('draft', 'sent', 'signed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  contract_number VARCHAR(50) UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES booking(id) ON DELETE SET NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  title VARCHAR(255) NOT NULL,
  description TEXT,

  file_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,

  status contract_status DEFAULT 'draft',

  sent_date TIMESTAMPTZ,
  signed_date TIMESTAMPTZ,
  signature_data TEXT,
  signer_name VARCHAR(255),
  signer_ip_address VARCHAR(50),

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_owner_id ON contracts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage their contracts" ON contracts;
CREATE POLICY "Owners can manage their contracts"
  ON contracts
  FOR ALL
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Clients can view contracts sent to them" ON contracts;
CREATE POLICY "Clients can view contracts sent to them"
  ON contracts
  FOR SELECT
  USING (auth.uid() = client_id);
