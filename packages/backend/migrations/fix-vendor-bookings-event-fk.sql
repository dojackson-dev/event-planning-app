-- Fix vendor_bookings.event_id foreign key to point at the correct "event" table
-- The original migration referenced "events" but the actual table is "event".

-- Drop the incorrect FK constraint
ALTER TABLE vendor_bookings
  DROP CONSTRAINT IF EXISTS vendor_bookings_event_id_fkey;

-- Re-add it pointing at the correct table
ALTER TABLE vendor_bookings
  ADD CONSTRAINT vendor_bookings_event_id_fkey
    FOREIGN KEY (event_id)
    REFERENCES event(id)
    ON DELETE SET NULL;
