-- Create guest_lists and guests tables
-- Safe to run multiple times (idempotent)

-- guest_lists: one guest list per event (managed by the venue owner)
CREATE TABLE IF NOT EXISTS guest_lists (
  id            BIGSERIAL PRIMARY KEY,
  client_id     TEXT,                                -- Supabase auth user ID (UUID stored as text)
  event_id      BIGINT,                              -- references event.id (integer in production)
  max_guests_per_person INTEGER NOT NULL DEFAULT 0,
  access_code   VARCHAR(10) UNIQUE,                  -- short alphanumeric code for clients
  share_token   TEXT UNIQUE,                          -- long random token for share link
  arrival_token TEXT UNIQUE,                          -- long random token for arrival/door-list link
  is_locked     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- guests: individual guest rows inside a guest_list
CREATE TABLE IF NOT EXISTS guests (
  id              BIGSERIAL PRIMARY KEY,
  guest_list_id   BIGINT REFERENCES guest_lists(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT,
  plus_one_count  INTEGER NOT NULL DEFAULT 0,
  has_arrived     BOOLEAN NOT NULL DEFAULT false,
  arrived_at      TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS guest_lists_event_id_idx ON guest_lists(event_id);
CREATE INDEX IF NOT EXISTS guest_lists_client_id_idx ON guest_lists(client_id);
CREATE INDEX IF NOT EXISTS guests_guest_list_id_idx ON guests(guest_list_id);

-- Enable Row Level Security
ALTER TABLE guest_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Drop any stale policies to allow idempotent reruns
DROP POLICY IF EXISTS "guest_lists_owner_full_access" ON guest_lists;
DROP POLICY IF EXISTS "guests_owner_full_access" ON guests;
DROP POLICY IF EXISTS "guest_lists_client_view" ON guest_lists;
DROP POLICY IF EXISTS "guest_lists_anonymous_access_with_code" ON guest_lists;
DROP POLICY IF EXISTS "guest_lists_owner_view" ON guest_lists;
DROP POLICY IF EXISTS "guest_lists_security_view" ON guest_lists;
DROP POLICY IF EXISTS "guest_lists_client_update" ON guest_lists;
DROP POLICY IF EXISTS "guests_anonymous_access" ON guests;
DROP POLICY IF EXISTS "guests_anonymous_insert" ON guests;
DROP POLICY IF EXISTS "guests_anonymous_update" ON guests;
DROP POLICY IF EXISTS "guests_authenticated_client_view" ON guests;
DROP POLICY IF EXISTS "guests_authenticated_client_insert" ON guests;
DROP POLICY IF EXISTS "guests_authenticated_client_update" ON guests;
DROP POLICY IF EXISTS "guests_authenticated_client_delete" ON guests;
DROP POLICY IF EXISTS "guests_security_view" ON guests;
DROP POLICY IF EXISTS "guests_security_update_arrival" ON guests;

-- Owners can manage all guest lists (backend uses service role and bypasses RLS)
CREATE POLICY "guest_lists_owner_full_access" ON guest_lists
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('owner', 'admin')
    )
  );

-- Clients can view their own guest lists
CREATE POLICY "guest_lists_client_view" ON guest_lists
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid()::text);

-- Anonymous users can view guest lists (access code validated in app layer)
CREATE POLICY "guest_lists_anonymous_access_with_code" ON guest_lists
  FOR SELECT
  TO anon
  USING (true);

-- Owners can manage all guests
CREATE POLICY "guests_owner_full_access" ON guests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('owner', 'admin')
    )
  );

-- Anonymous users can view/update guests (for door list app)
CREATE POLICY "guests_anonymous_access" ON guests
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "guests_anonymous_update" ON guests
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
