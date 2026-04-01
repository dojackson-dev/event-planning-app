-- Add client_phone to invoices so SMS can fire without a linked booking/intake form
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_phone TEXT;

-- Backfill from linked bookings
UPDATE invoices i
SET client_phone = b.contact_phone
FROM booking b
WHERE i.booking_id = b.id
  AND b.contact_phone IS NOT NULL
  AND i.client_phone IS NULL;

-- Backfill from linked intake_forms
UPDATE invoices i
SET client_phone = f.contact_phone
FROM intake_forms f
WHERE i.intake_form_id = f.id
  AND f.contact_phone IS NOT NULL
  AND i.client_phone IS NULL;

-- Add client_name + client_phone to estimates so SMS can fire without a linked booking
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS client_phone TEXT;

-- Backfill from linked bookings
UPDATE estimates e
SET client_name  = b.contact_name,
    client_phone = b.contact_phone
FROM booking b
WHERE e.booking_id = b.id
  AND (e.client_name IS NULL OR e.client_phone IS NULL);
