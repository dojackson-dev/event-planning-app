-- Allows a client to add other people (by phone number) who can also access
-- and help manage a specific event in the client portal, in addition to the
-- original client contact. Team members log in via the same phone-based OTP
-- flow already used by clients — no separate invite/accept flow needed.

CREATE TABLE IF NOT EXISTS event_team_members (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id        UUID        NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  phone           TEXT        NOT NULL,
  name            TEXT,
  added_by_phone  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_event_team_members_event ON event_team_members(event_id);
CREATE INDEX IF NOT EXISTS idx_event_team_members_phone ON event_team_members(phone);

ALTER TABLE event_team_members ENABLE ROW LEVEL SECURITY;

-- All access to this table goes through the backend's admin client (client
-- portal auth is phone/OTP based, not Supabase auth), so no public policies
-- are defined here — the service role bypasses RLS as usual.
