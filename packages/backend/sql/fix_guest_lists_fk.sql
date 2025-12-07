-- Fix guest_lists foreign key to reference correct event table

-- Drop the incorrect foreign key constraint
ALTER TABLE guest_lists 
DROP CONSTRAINT IF EXISTS guest_lists_event_id_fkey;

-- Add the correct foreign key constraint pointing to 'event' table (singular)
ALTER TABLE guest_lists
ADD CONSTRAINT guest_lists_event_id_fkey 
FOREIGN KEY (event_id) 
REFERENCES event(id) 
ON DELETE CASCADE;
