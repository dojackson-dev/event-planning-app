-- Fix invoices table foreign key to reference 'booking' instead of 'bookings'

-- Drop the existing foreign key constraint
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_booking_id_fkey;

-- Add the correct foreign key constraint pointing to 'booking' table
ALTER TABLE invoices ADD CONSTRAINT invoices_booking_id_fkey 
  FOREIGN KEY (booking_id) REFERENCES booking(id) ON DELETE SET NULL;
