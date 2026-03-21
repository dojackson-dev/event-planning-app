-- Add client contact fields to vendor_bookings
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS client_name   VARCHAR(255);
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS client_email  VARCHAR(255);
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS client_phone  VARCHAR(50);
