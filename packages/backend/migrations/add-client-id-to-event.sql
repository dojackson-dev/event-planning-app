-- Add client_id to the event table
-- client_id stores the intake_forms.id (UUID as TEXT) so every event is linked to a client
-- This enables SMS to client, client portal, and other features to look up contact info

ALTER TABLE event
  ADD COLUMN IF NOT EXISTS client_id TEXT;

CREATE INDEX IF NOT EXISTS event_client_id_idx ON event(client_id);
