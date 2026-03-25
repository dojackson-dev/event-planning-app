-- Add client_name to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Backfill from linked bookings where possible
UPDATE invoices i
SET client_name = b.contact_name
FROM booking b
WHERE i.booking_id = b.id
  AND b.contact_name IS NOT NULL
  AND i.client_name IS NULL;

-- Backfill from linked intake_forms where possible
UPDATE invoices i
SET client_name = f.contact_name
FROM intake_forms f
WHERE i.intake_form_id = f.id
  AND f.contact_name IS NOT NULL
  AND i.client_name IS NULL;
