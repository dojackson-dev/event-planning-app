-- Migration: Update invoices to support quotes and intake forms
-- Run this in Supabase SQL Editor

-- 1. Add intake_form_id to invoices table (nullable for backward compatibility)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS intake_form_id UUID REFERENCES intake_forms(id) ON DELETE CASCADE;

-- 2. Make booking_id nullable since quotes for intake forms won't have bookings yet
ALTER TABLE invoices 
ALTER COLUMN booking_id DROP NOT NULL;

-- 3. Add service_item_id to invoice_items to track which predefined item was used
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS service_item_id UUID REFERENCES service_items(id) ON DELETE SET NULL;

-- 4. Add created_by field to track who created the invoice (owner or client)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 4a. Add amount_paid and amount_due columns if they don't exist
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0.00;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS amount_due DECIMAL(10, 2) DEFAULT 0.00;

-- 5. Create index for intake_form_id
CREATE INDEX IF NOT EXISTS idx_invoices_intake_form_id ON invoices(intake_form_id);

-- 6. Create index for service_item_id
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_item_id ON invoice_items(service_item_id);

-- 7. Update RLS policies for invoices

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
DROP POLICY IF EXISTS "Owners can view all invoices" ON invoices;
DROP POLICY IF EXISTS "Users can create invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update their invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete their invoices" ON invoices;
DROP POLICY IF EXISTS "Users can view relevant invoices" ON invoices;
DROP POLICY IF EXISTS "Owners can create invoices" ON invoices;
DROP POLICY IF EXISTS "Owners can delete draft invoices" ON invoices;

-- Allow users to view invoices they created, are the owner of, or are associated with their booking/intake form
CREATE POLICY "Users can view relevant invoices"
ON invoices FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() OR
  owner_id = auth.uid() OR
  booking_id IN (
    SELECT id FROM bookings WHERE user_id = auth.uid()
  )
);

-- Allow owners to create invoices
-- Note: Using auth.jwt() to avoid infinite recursion with users table RLS
CREATE POLICY "Owners can create invoices"
ON invoices FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt()->>'role' IN ('owner', 'admin', 'authenticated')
  OR owner_id = auth.uid()
);

-- Allow owners to update their invoices or drafts
CREATE POLICY "Users can update their invoices"
ON invoices FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid() OR 
  (created_by = auth.uid() AND status = 'draft')
)
WITH CHECK (
  owner_id = auth.uid() OR 
  (created_by = auth.uid() AND status = 'draft')
);

-- Allow owners to delete draft invoices
CREATE POLICY "Owners can delete draft invoices"
ON invoices FOR DELETE
TO authenticated
USING (
  owner_id = auth.uid() AND status = 'draft'
);

-- 8. Update RLS policies for invoice_items

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can manage invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Invoice items inherit invoice permissions" ON invoice_items;

-- Allow users to view invoice items if they can view the invoice
CREATE POLICY "Users can view invoice items"
ON invoice_items FOR SELECT
TO authenticated
USING (
  invoice_id IN (
    SELECT id FROM invoices WHERE
      created_by = auth.uid() OR
      owner_id = auth.uid() OR
      booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid())
  )
);

-- Allow users to manage invoice items for their invoices
CREATE POLICY "Users can manage invoice items"
ON invoice_items FOR ALL
TO authenticated
USING (
  invoice_id IN (
    SELECT id FROM invoices WHERE
      owner_id = auth.uid() OR 
      (created_by = auth.uid() AND status = 'draft')
  )
)
WITH CHECK (
  invoice_id IN (
    SELECT id FROM invoices WHERE
      owner_id = auth.uid() OR 
      (created_by = auth.uid() AND status = 'draft')
  )
);

-- 9. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON invoice_items TO authenticated;

-- Note:
-- - Draft invoices serve as "quotes" for clients in the intake process
-- - Both owners and clients can add service_items to invoices
-- - intake_form_id links quotes to intake forms before booking is created
-- - Once intake form is converted to booking, booking_id can be set
-- - service_item_id tracks which predefined service item was used (for reference/reporting)
