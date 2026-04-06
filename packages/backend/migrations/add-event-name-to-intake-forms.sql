-- Add event_name column to intake_forms
-- This stores the event title/name submitted on the client intake form
-- e.g. "Sarah's 30th Birthday Celebration"

ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS event_name VARCHAR(255);
