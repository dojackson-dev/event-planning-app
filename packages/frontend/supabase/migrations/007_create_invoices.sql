-- Create Invoice and InvoiceItem tables
-- Migration: 007_create_invoices.sql

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE discount_type AS ENUM ('none', 'percentage', 'fixed');
CREATE TYPE service_item_category AS ENUM (
  'facility_rental',
  'security_deposit',
  'sound_system',
  'av_equipment',
  'planning_services',
  'additional_time',
  'hosting_services',
  'catering',
  'bar_services',
  'security_services',
  'decorations',
  'sales_tax',
  'items',
  'misc'
);

-- ============================================
-- SERVICE ITEMS TABLE (predefined invoice items)
-- ============================================

CREATE TABLE service_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category service_item_category NOT NULL,
  default_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVOICES TABLE
-- ============================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Amounts
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
  amount_due DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Status and dates
  status invoice_status DEFAULT 'draft',
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  
  -- Additional info
  notes TEXT,
  terms TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVOICE ITEMS TABLE
-- ============================================

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  
  description VARCHAR(500) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  
  -- Pricing with flexibility
  standard_price DECIMAL(10, 2) NOT NULL DEFAULT 0,  -- Original/standard price
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,      -- Actual price charged (can be adjusted)
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,        -- quantity × unit_price (before discount)
  
  -- Per-item discount
  discount_type discount_type DEFAULT 'none',
  discount_value DECIMAL(10, 2) NOT NULL DEFAULT 0,  -- Percentage or dollar amount
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Calculated discount
  
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,          -- Final amount (subtotal - discount_amount)
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_invoices_owner ON invoices(owner_id);
CREATE INDEX idx_invoices_booking ON invoices(booking_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_service_items_category ON service_items(category);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_items ENABLE ROW LEVEL SECURITY;

-- Invoices: Owners can see their own invoices
CREATE POLICY "Owners can view their own invoices"
ON invoices
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Invoices: Owners can create invoices
CREATE POLICY "Owners can create invoices"
ON invoices
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Invoices: Owners can update their own invoices
CREATE POLICY "Owners can update their own invoices"
ON invoices
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Invoices: Owners can delete their own invoices
CREATE POLICY "Owners can delete their own invoices"
ON invoices
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Invoice Items: Users can view items of invoices they can see
CREATE POLICY "Users can view invoice items"
ON invoice_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.owner_id = auth.uid()
  )
);

-- Invoice Items: Users can manage items of their invoices
CREATE POLICY "Users can manage invoice items"
ON invoice_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.owner_id = auth.uid()
  )
);

-- Service Items: All authenticated users can view
CREATE POLICY "Authenticated users can view service items"
ON service_items
FOR SELECT
TO authenticated
USING (is_active = true);

-- Service Items: Only owners can manage
CREATE POLICY "Owners can manage service items"
ON service_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'owner'
  )
);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_items_updated_at
  BEFORE UPDATE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_items_updated_at
  BEFORE UPDATE ON service_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DEFAULT SERVICE ITEMS
-- ============================================

INSERT INTO service_items (name, description, category, default_price, sort_order) VALUES
  ('Facility Rental', 'Venue rental fee for event space', 'facility_rental', 2500.00, 1),
  ('Security Deposit', 'Refundable security deposit', 'security_deposit', 500.00, 2),
  ('Sound System', 'Professional sound system rental', 'sound_system', 500.00, 3),
  ('A/V Equipment', 'Audio/visual equipment rental', 'av_equipment', 750.00, 4),
  ('Planning Services', 'Event planning and coordination', 'planning_services', 1000.00, 5),
  ('Additional Time', 'Extended rental time per hour', 'additional_time', 250.00, 6),
  ('Hosting Services', 'Professional event hosting', 'hosting_services', 500.00, 7),
  ('Catering', 'Food and beverage services', 'catering', 0.00, 8),
  ('Bar Services', 'Bar setup and service', 'bar_services', 0.00, 9),
  ('Security Services', 'Professional security personnel', 'security_services', 0.00, 10),
  ('Decorations', 'Event decorations and setup', 'decorations', 0.00, 11),
  ('Sales Tax', 'Applicable sales tax', 'sales_tax', 0.00, 12),
  ('Items', 'Miscellaneous items', 'items', 0.00, 13),
  ('Miscellaneous', 'Other charges', 'misc', 0.00, 14);
