-- Migration: Add reminder fields to event_notes table
-- Allows each note to optionally carry an SMS reminder.

ALTER TABLE event_notes
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_enabled   BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_type      VARCHAR(20),          -- 'days' | 'weeks' | 'date'
  ADD COLUMN IF NOT EXISTS reminder_value     INTEGER,              -- number of days or weeks before event
  ADD COLUMN IF NOT EXISTS reminder_date      TIMESTAMPTZ,          -- specific send datetime (when type='date')
  ADD COLUMN IF NOT EXISTS reminder_send_at   TIMESTAMPTZ,          -- computed absolute send datetime
  ADD COLUMN IF NOT EXISTS reminder_message   TEXT,                 -- custom SMS message
  ADD COLUMN IF NOT EXISTS reminder_phone     VARCHAR(30),          -- destination phone number
  ADD COLUMN IF NOT EXISTS reminder_sent_at   TIMESTAMPTZ;          -- set when SMS was dispatched

CREATE INDEX IF NOT EXISTS idx_event_notes_reminder_send_at
  ON event_notes(reminder_send_at)
  WHERE reminder_enabled = TRUE AND reminder_sent_at IS NULL;
