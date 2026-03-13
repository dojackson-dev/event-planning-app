-- ─────────────────────────────────────────────────────────────
-- Vendor-Invoice Integration Migration
-- Adds vendor cost tracking to invoice_items:
--   • vendor_booking_id  — traces which vendor booking the expense came from
--   • item_type          — 'revenue' (default, billed to client)
--                          'expense' (vendor cost, internal margin tracking)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS vendor_booking_id UUID REFERENCES vendor_bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'revenue';

-- Enforce the two allowed values
ALTER TABLE invoice_items
  DROP CONSTRAINT IF EXISTS invoice_items_item_type_check;

ALTER TABLE invoice_items
  ADD CONSTRAINT invoice_items_item_type_check
    CHECK (item_type IN ('revenue', 'expense'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_items_vendor_booking
  ON invoice_items(vendor_booking_id)
  WHERE vendor_booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_items_item_type
  ON invoice_items(item_type);
