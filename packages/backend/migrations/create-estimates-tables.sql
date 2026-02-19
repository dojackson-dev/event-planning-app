-- Migration: Create estimates and estimate_items tables
-- Run this in Supabase SQL Editor

DO $$ BEGIN
  CREATE TYPE estimate_status AS ENUM ('draft', 'sent', 'approved', 'rejected', 'expired', 'converted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Estimates table
CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  estimate_number VARCHAR(50) UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES booking(id) ON DELETE SET NULL,
  intake_form_id UUID REFERENCES intake_forms(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Financials
  subtotal DECIMAL(10, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) DEFAULT 0,

  status estimate_status DEFAULT 'draft',

  issue_date DATE NOT NULL,
  expiration_date DATE NOT NULL,

  -- Approval tracking
  approved_date DATE,
  rejected_date DATE,

  -- Conversion tracking
  converted_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,

  notes TEXT,
  terms TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimates_owner_id ON estimates(owner_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_booking_id ON estimates(booking_id);
CREATE INDEX IF NOT EXISTS idx_estimates_expiration_date ON estimates(expiration_date);

DROP TRIGGER IF EXISTS update_estimates_updated_at ON estimates;
CREATE TRIGGER update_estimates_updated_at
  BEFORE UPDATE ON estimates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage their estimates" ON estimates;
CREATE POLICY "Owners can manage their estimates"
  ON estimates
  FOR ALL
  USING (auth.uid() = owner_id);

-- Estimate items table
CREATE TABLE IF NOT EXISTS estimate_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  service_item_id UUID REFERENCES service_items(id) ON DELETE SET NULL,

  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) DEFAULT 1,
  standard_price DECIMAL(10, 2) DEFAULT 0,
  unit_price DECIMAL(10, 2) DEFAULT 0,
  subtotal DECIMAL(10, 2) DEFAULT 0,

  discount_type VARCHAR(20) DEFAULT 'none' CHECK (discount_type IN ('none', 'percentage', 'fixed')),
  discount_value DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,

  amount DECIMAL(10, 2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id ON estimate_items(estimate_id);

ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage estimate items via estimate" ON estimate_items;
CREATE POLICY "Owners can manage estimate items via estimate"
  ON estimate_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = estimate_items.estimate_id
        AND estimates.owner_id = auth.uid()
    )
  );
