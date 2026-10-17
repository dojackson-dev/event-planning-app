-- ================================================================
-- CLIENT PORTAL NOTIFICATIONS
-- ================================================================
-- The backend (client-portal, bookings) reads/writes `notifications` but the
-- table was never created, so every client-portal poll logged PGRST205.
--
-- user_id is intentionally NOT a foreign key: phone-only clients get a
-- UUID-format id derived from their phone number and have no users row.
-- Safe to run multiple times.
-- ================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  event_id    UUID REFERENCES event(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'general',
  title       TEXT,
  message     TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

-- Backend-only (service role); no policies means anon/authenticated users
-- cannot read or write other people's notifications.
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
