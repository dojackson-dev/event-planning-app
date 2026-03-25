-- ─────────────────────────────────────────────────────────────
-- Owner Booking Invoice Support
-- Extends vendor_invoices to handle invoices generated when
-- an owner books a vendor.  These invoices are paid by the owner
-- (not the client) and carry a 1.5% platform fee above Stripe.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE vendor_invoices
  ADD COLUMN IF NOT EXISTS owner_account_id   UUID,
  ADD COLUMN IF NOT EXISTS vendor_booking_id  UUID REFERENCES vendor_bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_type       TEXT NOT NULL DEFAULT 'client';

-- Enforce the two allowed values
ALTER TABLE vendor_invoices
  DROP CONSTRAINT IF EXISTS vendor_invoices_invoice_type_check;

ALTER TABLE vendor_invoices
  ADD CONSTRAINT vendor_invoices_invoice_type_check
    CHECK (invoice_type IN ('client', 'owner_booking'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_owner_account
  ON vendor_invoices(owner_account_id)
  WHERE owner_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_vendor_booking
  ON vendor_invoices(vendor_booking_id)
  WHERE vendor_booking_id IS NOT NULL;

-- RLS: owner can view invoices where owner_account_id matches their account
-- (service role bypasses RLS, so backend admin client is unaffected)
DROP POLICY IF EXISTS vendor_invoices_owner_view ON vendor_invoices;
CREATE POLICY vendor_invoices_owner_view ON vendor_invoices
  FOR SELECT
  TO authenticated
  USING (
    invoice_type = 'owner_booking'
    AND owner_account_id IN (
      SELECT id FROM owner_accounts WHERE primary_owner_id = auth.uid()
    )
  );
