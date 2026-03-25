-- Allow 'paid' as a valid vendor_booking status
-- First find and drop the existing check constraint, then recreate with 'paid' included

DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT constraint_name
    INTO v_constraint_name
    FROM information_schema.table_constraints
   WHERE table_name = 'vendor_bookings'
     AND constraint_type = 'CHECK'
     AND constraint_name ILIKE '%status%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE vendor_bookings DROP CONSTRAINT %I', v_constraint_name);
    RAISE NOTICE 'Dropped constraint: %', v_constraint_name;
  END IF;
END $$;

ALTER TABLE vendor_bookings
  ADD CONSTRAINT vendor_bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled', 'completed', 'paid'));
