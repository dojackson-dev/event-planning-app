-- ================================================================
-- EXTERNAL EVENT AGGREGATION PLATFORM
-- ================================================================
-- Adds the tables needed to automatically discover, ingest, and
-- deduplicate events from third-party sources (REST/JSON APIs, RSS,
-- ICS/iCalendar, XML, and partner CSV feeds), separate from the
-- existing native `event` table and the live Ticketmaster/SeatGeek/
-- PredictHQ proxy integrations.
--
-- Flow:
--   event_source_discovery_candidates (crawler/manual finds)
--     -> reviewed by a human, promoted to ->
--   event_sources (registry: DISCOVERED -> REVIEW_TERMS -> APPROVED -> ACTIVE)
--     -> scheduled connector jobs pull from the source's endpoint_url ->
--   external_events (normalized, deduplicated, quality-scored)
--     -> merged into the public /events page alongside native + Ticketmaster/SeatGeek events
-- ================================================================

DO $$
BEGIN
  CREATE TYPE event_source_type AS ENUM ('rest_json', 'rss', 'ics', 'xml', 'csv');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE event_source_status AS ENUM (
    'discovered', 'review_terms', 'approved', 'active', 'rejected', 'paused'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE external_event_dedupe_status AS ENUM ('unique', 'possible_duplicate', 'duplicate');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE discovery_candidate_status AS ENUM ('new', 'promoted', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ================================================================
-- event_sources TABLE (the "source registry")
-- ================================================================
CREATE TABLE IF NOT EXISTS event_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),

  source_type event_source_type NOT NULL,
  endpoint_url TEXT NOT NULL,

  -- Scheduling
  active BOOLEAN NOT NULL DEFAULT false,
  sync_frequency_hours INTEGER NOT NULL DEFAULT 24,
  last_sync_at TIMESTAMPTZ,
  last_sync_status VARCHAR(50),
  last_sync_error TEXT,

  -- Approval workflow: discovered -> review_terms -> approved -> active (or rejected / paused)
  status event_source_status NOT NULL DEFAULT 'discovered',
  terms_status VARCHAR(50) NOT NULL DEFAULT 'not_reviewed',
  attribution_required BOOLEAN NOT NULL DEFAULT false,
  attribution_text TEXT,

  -- Connector-specific config: field mappings, JSON/XML record paths, CSV column map, etc.
  connector_config JSONB NOT NULL DEFAULT '{}'::jsonb,

  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_sources_status ON event_sources(status);
CREATE INDEX IF NOT EXISTS idx_event_sources_active ON event_sources(active);
CREATE INDEX IF NOT EXISTS idx_event_sources_city_state ON event_sources(city, state);

-- ================================================================
-- external_events TABLE (normalized, deduplicated ingest output)
-- ================================================================
CREATE TABLE IF NOT EXISTS external_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source_id UUID NOT NULL REFERENCES event_sources(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL, -- id/guid/url from the source feed itself

  title VARCHAR(500) NOT NULL,
  description TEXT,
  event_date DATE,
  start_time TIME,
  end_time TIME,

  venue_name VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),

  category VARCHAR(100),
  image_url TEXT,
  event_url TEXT,
  price_min DECIMAL(10, 2),
  price_max DECIMAL(10, 2),
  organizer VARCHAR(255),

  raw_data JSONB,

  confidence_score NUMERIC(4, 3) NOT NULL DEFAULT 0,
  dedupe_status external_event_dedupe_status NOT NULL DEFAULT 'unique',
  duplicate_of_external_event_id UUID REFERENCES external_events(id),

  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expired_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(source_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_external_events_source_id ON external_events(source_id);
CREATE INDEX IF NOT EXISTS idx_external_events_event_date ON external_events(event_date);
CREATE INDEX IF NOT EXISTS idx_external_events_city ON external_events(city);
CREATE INDEX IF NOT EXISTS idx_external_events_category ON external_events(category);
CREATE INDEX IF NOT EXISTS idx_external_events_dedupe_status ON external_events(dedupe_status);
CREATE INDEX IF NOT EXISTS idx_external_events_expired_at ON external_events(expired_at);

-- ================================================================
-- event_source_discovery_candidates TABLE (crawler/manual finds queue)
-- ================================================================
CREATE TABLE IF NOT EXISTS event_source_discovery_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  query TEXT,
  suggested_name VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  candidate_url TEXT NOT NULL,
  suggested_source_type event_source_type,

  status discovery_candidate_status NOT NULL DEFAULT 'new',
  notes TEXT,

  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  promoted_to_source_id UUID REFERENCES event_sources(id)
);

CREATE INDEX IF NOT EXISTS idx_discovery_candidates_status ON event_source_discovery_candidates(status);

-- ================================================================
-- RLS: these tables are only ever accessed via the backend's admin
-- (service-role) Supabase client, never directly by end users, so
-- RLS is enabled with no permissive policies (deny-all for the
-- anon/authenticated roles; service role bypasses RLS by design).
-- ================================================================
ALTER TABLE event_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_source_discovery_candidates ENABLE ROW LEVEL SECURITY;
