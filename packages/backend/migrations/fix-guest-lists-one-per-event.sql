-- Enforce one guest list per event at the database level
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/unzfkcmmakyyjgruexpy/editor

-- Remove any duplicate rows first (keep the oldest one per event)
DELETE FROM guest_lists
WHERE id NOT IN (
  SELECT MIN(id)
  FROM guest_lists
  WHERE event_id IS NOT NULL
  GROUP BY event_id
)
AND event_id IS NOT NULL;

-- Add unique constraint
ALTER TABLE guest_lists
  ADD CONSTRAINT guest_lists_event_id_unique UNIQUE (event_id);
