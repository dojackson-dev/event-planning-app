-- Create Contracts table
-- Migration: 008_create_contracts.sql

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE contract_status AS ENUM ('draft', 'sent', 'signed', 'cancelled');

-- ============================================
-- CONTRACTS TABLE
-- ============================================

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_number VARCHAR(50) UNIQUE NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- File information
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER, -- in bytes
  
  -- Status and dates
  status contract_status DEFAULT 'draft',
  sent_date TIMESTAMPTZ,
  signed_date TIMESTAMPTZ,
  
  -- Signature data
  signature_data TEXT, -- Base64 encoded signature image
  signer_name VARCHAR(255),
  signer_ip_address VARCHAR(45),
  
  -- Additional info
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_contracts_owner ON contracts(owner_id);
CREATE INDEX idx_contracts_client ON contracts(client_id);
CREATE INDEX idx_contracts_booking ON contracts(booking_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_sent_date ON contracts(sent_date);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Owners can view their own contracts
CREATE POLICY "Owners can view their own contracts"
ON contracts
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Clients can view contracts assigned to them
CREATE POLICY "Clients can view their contracts"
ON contracts
FOR SELECT
TO authenticated
USING (client_id = auth.uid());

-- Owners can create contracts
CREATE POLICY "Owners can create contracts"
ON contracts
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Owners can update their own contracts
CREATE POLICY "Owners can update their own contracts"
ON contracts
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Clients can update contracts to sign them
CREATE POLICY "Clients can sign contracts"
ON contracts
FOR UPDATE
TO authenticated
USING (client_id = auth.uid() AND status = 'sent')
WITH CHECK (client_id = auth.uid());

-- Owners can delete their own contracts
CREATE POLICY "Owners can delete their own contracts"
ON contracts
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE contracts IS 'Contracts for events with electronic signature support';
COMMENT ON COLUMN contracts.file_url IS 'Path to the uploaded contract document';
COMMENT ON COLUMN contracts.signature_data IS 'Base64 encoded image of the electronic signature';
COMMENT ON COLUMN contracts.signer_ip_address IS 'IP address of the person who signed the contract';
