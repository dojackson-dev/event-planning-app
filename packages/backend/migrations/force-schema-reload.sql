-- Force PostgREST schema cache to completely reload
-- Run this in Supabase SQL Editor

-- Add a comment to the invoices table to trigger schema change detection
COMMENT ON TABLE invoices IS 'Invoice records for events and bookings - updated to force schema reload';

-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Verify the actual column names
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name LIKE '%amount%'
ORDER BY ordinal_position;
