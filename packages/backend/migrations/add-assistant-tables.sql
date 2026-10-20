-- Dashboard assistant: per-user snoozed / handled items and the optional daily email digest.
-- The API uses the service role and always filters by user_id; RLS stays on with no policies so
-- nothing else can read these tables.

CREATE TABLE IF NOT EXISTS assistant_dismissals (
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key    TEXT        NOT NULL,
  kind        TEXT        NOT NULL CHECK (kind IN ('snooze', 'handled')),
  until       DATE,
  -- "handled" only hides the line while its contents are unchanged.
  fingerprint TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, item_key)
);

CREATE TABLE IF NOT EXISTS assistant_preferences (
  user_id        UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_enabled BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE assistant_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_preferences ENABLE ROW LEVEL SECURITY;
