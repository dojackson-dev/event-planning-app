-- ============================================================
-- client_messages: bidirectional in-app chat between clients
-- and owners, scoped per event (one thread per owner-client-event).
-- Separate from the 'messages' table which is Twilio SMS only.
-- ============================================================

CREATE TABLE IF NOT EXISTS client_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID        NOT NULL,
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- client_id may be a users.id UUID or a phone-derived UUID (no FK)
  client_id   UUID        NOT NULL,
  sender_type TEXT        NOT NULL CHECK (sender_type IN ('owner', 'client')),
  content     TEXT        NOT NULL,
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_messages_event    ON client_messages(event_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_owner    ON client_messages(owner_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_client   ON client_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_owner_ev ON client_messages(owner_id, event_id);

-- RLS: owners can read and write only their own threads
ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select_client_messages" ON client_messages
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "owner_insert_client_messages" ON client_messages
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owner_update_client_messages" ON client_messages
  FOR UPDATE USING (owner_id = auth.uid());

-- Client access is enforced at the application layer via x-client-token
-- (clients do not have a Supabase auth session); the backend uses the
-- service-role admin client for all client-portal DB operations.
