-- Migration: Create event_notes table
-- Timestamped notes that staff/vendors can attach to an event.
-- Run this in the Supabase SQL Editor (or via run-event-notes-migration.js).

CREATE TABLE IF NOT EXISTS event_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,

  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name VARCHAR(255),
  author_role VARCHAR(50),

  content TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_notes_event_id ON event_notes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_notes_author_id ON event_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_event_notes_created_at ON event_notes(created_at DESC);

-- Row Level Security — application (NestJS) enforces the real access checks
-- via the service-role client, these policies are defense-in-depth for any
-- direct client-side Supabase access.
ALTER TABLE event_notes ENABLE ROW LEVEL SECURITY;

-- Event owner can see/manage all notes on their own events
DROP POLICY IF EXISTS event_notes_owner_select ON event_notes;
CREATE POLICY event_notes_owner_select ON event_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event WHERE event.id = event_notes.event_id AND event.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS event_notes_owner_delete ON event_notes;
CREATE POLICY event_notes_owner_delete ON event_notes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM event WHERE event.id = event_notes.event_id AND event.owner_id = auth.uid()
    )
  );

-- Authors can see/delete their own notes
DROP POLICY IF EXISTS event_notes_author_select ON event_notes;
CREATE POLICY event_notes_author_select ON event_notes
  FOR SELECT
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS event_notes_author_delete ON event_notes;
CREATE POLICY event_notes_author_delete ON event_notes
  FOR DELETE
  USING (author_id = auth.uid());

-- Any authenticated user can insert a note as themselves
-- (the NestJS layer validates the user actually has access to the event first)
DROP POLICY IF EXISTS event_notes_insert ON event_notes;
CREATE POLICY event_notes_insert ON event_notes
  FOR INSERT
  WITH CHECK (author_id = auth.uid());
