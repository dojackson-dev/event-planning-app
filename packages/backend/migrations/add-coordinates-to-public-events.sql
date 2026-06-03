-- ADD lat/lng COORDINATES TO public_events
-- Run this in Supabase SQL editor after add-zip-code-to-public-events.sql

ALTER TABLE public_events ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION;
ALTER TABLE public_events ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_public_events_coords ON public_events(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ─── RPC: search_events_by_location ────────────────────────────────────────
-- Returns published, upcoming public events within `radius_miles` of a point.
-- Haversine formula — no PostGIS required.
CREATE OR REPLACE FUNCTION search_events_by_location(
  search_lat      DOUBLE PRECISION,
  search_lng      DOUBLE PRECISION,
  radius_miles    DOUBLE PRECISION DEFAULT 30,
  filter_category TEXT             DEFAULT NULL
)
RETURNS TABLE (
  id                   UUID,
  promoter_account_id  UUID,
  title                VARCHAR,
  description          TEXT,
  event_date           DATE,
  start_time           TIME,
  end_time             TIME,
  venue_name           VARCHAR,
  venue_address        TEXT,
  city                 VARCHAR,
  state                VARCHAR,
  zip_code             VARCHAR,
  category             VARCHAR,
  venue_type           VARCHAR,
  image_url            TEXT,
  age_restriction      VARCHAR,
  status               TEXT,
  latitude             DOUBLE PRECISION,
  longitude            DOUBLE PRECISION,
  distance_miles       DOUBLE PRECISION,
  created_at           TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.promoter_account_id,
    e.title,
    e.description,
    e.event_date,
    e.start_time,
    e.end_time,
    e.venue_name,
    e.venue_address,
    e.city,
    e.state,
    e.zip_code,
    e.category,
    e.venue_type,
    e.image_url,
    e.age_restriction,
    e.status::TEXT,
    e.latitude,
    e.longitude,
    (
      3958.8 * acos(
        LEAST(1.0,
          cos(radians(search_lat)) * cos(radians(e.latitude))
          * cos(radians(e.longitude) - radians(search_lng))
          + sin(radians(search_lat)) * sin(radians(e.latitude))
        )
      )
    ) AS distance_miles,
    e.created_at,
    e.updated_at
  FROM public_events e
  WHERE
    e.status = 'published'
    AND e.event_date >= CURRENT_DATE
    AND e.latitude  IS NOT NULL
    AND e.longitude IS NOT NULL
    AND (filter_category IS NULL OR e.category = filter_category)
    AND (
      3958.8 * acos(
        LEAST(1.0,
          cos(radians(search_lat)) * cos(radians(e.latitude))
          * cos(radians(e.longitude) - radians(search_lng))
          + sin(radians(search_lat)) * sin(radians(e.latitude))
        )
      )
    ) <= radius_miles
  ORDER BY distance_miles ASC;
$$;

GRANT EXECUTE ON FUNCTION search_events_by_location(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) TO anon, authenticated, service_role;
