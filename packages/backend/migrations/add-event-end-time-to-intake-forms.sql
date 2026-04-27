-- Add event_end_time and event_name columns to intake_forms so the end time
-- entered on the intake form is preserved and used in emails / auto-created events.

ALTER TABLE intake_forms
  ADD COLUMN IF NOT EXISTS event_end_time TIME,
  ADD COLUMN IF NOT EXISTS event_name TEXT;
