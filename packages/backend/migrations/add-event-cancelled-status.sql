-- Lets owners cancel an event (reason is stored as an event note).
-- Run once in the Supabase SQL editor. Safe to re-run.
ALTER TYPE event_status ADD VALUE IF NOT EXISTS 'cancelled';
