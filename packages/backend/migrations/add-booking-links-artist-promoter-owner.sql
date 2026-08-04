-- ================================================================
-- Booking Links for Artists, Promoters, and Venue Owners
-- Mirrors vendor_booking_links / vendor_booking_requests pattern.
-- Safe to re-run (uses IF NOT EXISTS).
-- ================================================================


-- ────────────────────────────────────────────────────────────
-- ARTIST BOOKING LINKS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS artist_booking_links (
  id                          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_account_id           UUID    NOT NULL REFERENCES artist_accounts(id) ON DELETE CASCADE,
  slug                        TEXT    UNIQUE NOT NULL,
  short_code                  TEXT    UNIQUE,
  is_active                   BOOLEAN DEFAULT true,
  custom_message              TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artist_booking_links_artist
  ON artist_booking_links(artist_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_artist_booking_links_slug
  ON artist_booking_links(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_artist_booking_links_short_code
  ON artist_booking_links(short_code) WHERE short_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS artist_booking_requests (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_account_id   UUID    NOT NULL REFERENCES artist_accounts(id) ON DELETE CASCADE,
  booking_link_id     UUID    REFERENCES artist_booking_links(id) ON DELETE SET NULL,
  client_name         TEXT    NOT NULL,
  client_email        TEXT    NOT NULL,
  client_phone        TEXT,
  sms_opt_in          BOOLEAN DEFAULT false,
  event_name          TEXT,
  event_date          DATE,
  start_time          TIME,
  end_time            TIME,
  venue_name          TEXT,
  venue_address       TEXT,
  notes               TEXT,
  status              TEXT    DEFAULT 'pending'
                      CHECK (status IN ('pending','accepted','declined')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artist_booking_requests_artist
  ON artist_booking_requests(artist_account_id);
CREATE INDEX IF NOT EXISTS idx_artist_booking_requests_link
  ON artist_booking_requests(booking_link_id);

ALTER TABLE artist_booking_links   ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_booking_requests ENABLE ROW LEVEL SECURITY;

-- Artists manage their own links
DROP POLICY IF EXISTS artist_booking_links_artist_all ON artist_booking_links;
CREATE POLICY artist_booking_links_artist_all ON artist_booking_links
  FOR ALL
  USING (
    artist_account_id IN (
      SELECT id FROM artist_accounts WHERE user_id = auth.uid()
    )
  );

-- Public read of active links (needed for public booking page via service key)
DROP POLICY IF EXISTS artist_booking_links_public_read ON artist_booking_links;
CREATE POLICY artist_booking_links_public_read ON artist_booking_links
  FOR SELECT USING (is_active = true);

-- Artists manage requests for their account
DROP POLICY IF EXISTS artist_booking_requests_artist_all ON artist_booking_requests;
CREATE POLICY artist_booking_requests_artist_all ON artist_booking_requests
  FOR ALL
  USING (
    artist_account_id IN (
      SELECT id FROM artist_accounts WHERE user_id = auth.uid()
    )
  );

-- Anyone can insert a request (public booking form)
DROP POLICY IF EXISTS artist_booking_requests_public_insert ON artist_booking_requests;
CREATE POLICY artist_booking_requests_public_insert ON artist_booking_requests
  FOR INSERT WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- PROMOTER BOOKING LINKS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS promoter_booking_links (
  id                          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  promoter_account_id         UUID    NOT NULL REFERENCES promoter_accounts(id) ON DELETE CASCADE,
  slug                        TEXT    UNIQUE NOT NULL,
  short_code                  TEXT    UNIQUE,
  is_active                   BOOLEAN DEFAULT true,
  custom_message              TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promoter_booking_links_promoter
  ON promoter_booking_links(promoter_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_promoter_booking_links_slug
  ON promoter_booking_links(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_promoter_booking_links_short_code
  ON promoter_booking_links(short_code) WHERE short_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS promoter_booking_requests (
  id                    UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  promoter_account_id   UUID    NOT NULL REFERENCES promoter_accounts(id) ON DELETE CASCADE,
  booking_link_id       UUID    REFERENCES promoter_booking_links(id) ON DELETE SET NULL,
  client_name           TEXT    NOT NULL,
  client_email          TEXT    NOT NULL,
  client_phone          TEXT,
  sms_opt_in            BOOLEAN DEFAULT false,
  event_name            TEXT,
  event_date            DATE,
  start_time            TIME,
  end_time              TIME,
  venue_name            TEXT,
  venue_address         TEXT,
  notes                 TEXT,
  status                TEXT    DEFAULT 'pending'
                        CHECK (status IN ('pending','accepted','declined')),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promoter_booking_requests_promoter
  ON promoter_booking_requests(promoter_account_id);
CREATE INDEX IF NOT EXISTS idx_promoter_booking_requests_link
  ON promoter_booking_requests(booking_link_id);

ALTER TABLE promoter_booking_links    ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_booking_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS promoter_booking_links_promoter_all ON promoter_booking_links;
CREATE POLICY promoter_booking_links_promoter_all ON promoter_booking_links
  FOR ALL
  USING (
    promoter_account_id IN (
      SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS promoter_booking_links_public_read ON promoter_booking_links;
CREATE POLICY promoter_booking_links_public_read ON promoter_booking_links
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS promoter_booking_requests_promoter_all ON promoter_booking_requests;
CREATE POLICY promoter_booking_requests_promoter_all ON promoter_booking_requests
  FOR ALL
  USING (
    promoter_account_id IN (
      SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS promoter_booking_requests_public_insert ON promoter_booking_requests;
CREATE POLICY promoter_booking_requests_public_insert ON promoter_booking_requests
  FOR INSERT WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- OWNER (VENUE) BOOKING LINKS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS owner_booking_links (
  id                          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_account_id            INTEGER NOT NULL REFERENCES owner_accounts(id) ON DELETE CASCADE,
  slug                        TEXT    UNIQUE NOT NULL,
  short_code                  TEXT    UNIQUE,
  is_active                   BOOLEAN DEFAULT true,
  custom_message              TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_owner_booking_links_owner
  ON owner_booking_links(owner_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_booking_links_slug
  ON owner_booking_links(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_booking_links_short_code
  ON owner_booking_links(short_code) WHERE short_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS owner_booking_requests (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_account_id    INTEGER NOT NULL REFERENCES owner_accounts(id) ON DELETE CASCADE,
  booking_link_id     UUID    REFERENCES owner_booking_links(id) ON DELETE SET NULL,
  client_name         TEXT    NOT NULL,
  client_email        TEXT    NOT NULL,
  client_phone        TEXT,
  sms_opt_in          BOOLEAN DEFAULT false,
  event_name          TEXT,
  event_date          DATE,
  start_time          TIME,
  end_time            TIME,
  venue_name          TEXT,
  venue_address       TEXT,
  notes               TEXT,
  status              TEXT    DEFAULT 'pending'
                      CHECK (status IN ('pending','accepted','declined')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_owner_booking_requests_owner
  ON owner_booking_requests(owner_account_id);
CREATE INDEX IF NOT EXISTS idx_owner_booking_requests_link
  ON owner_booking_requests(booking_link_id);

ALTER TABLE owner_booking_links    ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_booking_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_booking_links_owner_all ON owner_booking_links;
CREATE POLICY owner_booking_links_owner_all ON owner_booking_links
  FOR ALL
  USING (
    owner_account_id IN (
      SELECT oa.id FROM owner_accounts oa
      JOIN memberships m ON m.owner_account_id = oa.id
      WHERE m.user_id = auth.uid()
      UNION
      SELECT id FROM owner_accounts WHERE primary_owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS owner_booking_links_public_read ON owner_booking_links;
CREATE POLICY owner_booking_links_public_read ON owner_booking_links
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS owner_booking_requests_owner_all ON owner_booking_requests;
CREATE POLICY owner_booking_requests_owner_all ON owner_booking_requests
  FOR ALL
  USING (
    owner_account_id IN (
      SELECT oa.id FROM owner_accounts oa
      JOIN memberships m ON m.owner_account_id = oa.id
      WHERE m.user_id = auth.uid()
      UNION
      SELECT id FROM owner_accounts WHERE primary_owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS owner_booking_requests_public_insert ON owner_booking_requests;
CREATE POLICY owner_booking_requests_public_insert ON owner_booking_requests
  FOR INSERT WITH CHECK (true);
