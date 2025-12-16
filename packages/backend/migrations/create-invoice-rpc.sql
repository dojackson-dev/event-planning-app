-- Create an RPC function to insert invoices, bypassing PostgREST schema cache
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION create_invoice(
  p_invoice_number TEXT,
  p_owner_id UUID,
  p_created_by UUID,
  p_subtotal DECIMAL,
  p_tax_amount DECIMAL,
  p_tax_rate DECIMAL,
  p_discount_amount DECIMAL,
  p_total_amount DECIMAL,
  p_amount_paid DECIMAL,
  p_amount_due DECIMAL,
  p_status TEXT,
  p_issue_date DATE,
  p_due_date DATE,
  p_booking_id UUID DEFAULT NULL,
  p_intake_form_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_terms TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  invoice_number TEXT,
  owner_id UUID,
  booking_id UUID,
  intake_form_id UUID,
  created_by UUID,
  subtotal DECIMAL,
  tax_amount DECIMAL,
  tax_rate DECIMAL,
  discount_amount DECIMAL,
  total_amount DECIMAL,
  amount_paid DECIMAL,
  amount_due DECIMAL,
  status TEXT,
  issue_date DATE,
  due_date DATE,
  paid_date TIMESTAMP,
  notes TEXT,
  terms TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO invoices (
    invoice_number,
    owner_id,
    booking_id,
    intake_form_id,
    created_by,
    subtotal,
    tax_amount,
    tax_rate,
    discount_amount,
    total_amount,
    amount_paid,
    amount_due,
    status,
    issue_date,
    due_date,
    notes,
    terms
  )
  VALUES (
    p_invoice_number,
    p_owner_id,
    p_booking_id,
    p_intake_form_id,
    p_created_by,
    p_subtotal,
    p_tax_amount,
    p_tax_rate,
    p_discount_amount,
    p_total_amount,
    p_amount_paid,
    p_amount_due,
    p_status,
    p_issue_date,
    p_due_date,
    p_notes,
    p_terms
  )
  RETURNING *;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_invoice TO authenticated;
