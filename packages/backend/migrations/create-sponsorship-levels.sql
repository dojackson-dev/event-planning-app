-- ================================================================
-- NON-PROFIT SPONSORSHIP LEVELS
-- ================================================================
-- A verified non-profit promoter defines sponsorship levels per public event
-- (e.g. "Title Sponsor"). Each level bundles tables and/or individual tickets,
-- an optional quantity cap, and a benefits list. Seating is table-based only.
--
-- deductible amount shown on receipts = price - fair_market_value.
-- Safe to run multiple times.
-- ================================================================

CREATE TABLE IF NOT EXISTS sponsorship_levels (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_event_id    UUID NOT NULL REFERENCES public_events(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  description        TEXT,
  price              NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  fair_market_value  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  quantity_available INTEGER CHECK (quantity_available IS NULL OR quantity_available > 0),
  quantity_sold      INTEGER NOT NULL DEFAULT 0 CHECK (quantity_sold >= 0),
  tables_included    INTEGER NOT NULL DEFAULT 0 CHECK (tables_included >= 0),
  seats_per_table    INTEGER NOT NULL DEFAULT 0 CHECK (seats_per_table >= 0),
  tickets_included   INTEGER NOT NULL DEFAULT 0 CHECK (tickets_included >= 0),
  benefits           TEXT[] NOT NULL DEFAULT '{}',
  sort_order         INTEGER NOT NULL DEFAULT 0,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sponsorship_levels_fmv_le_price CHECK (fair_market_value <= price),
  CONSTRAINT sponsorship_levels_tables_need_seats
    CHECK (tables_included = 0 OR seats_per_table > 0)
);

CREATE INDEX IF NOT EXISTS idx_sponsorship_levels_event
  ON sponsorship_levels (public_event_id, sort_order);

-- Backend-only (service role); no policies means anon/authenticated users
-- cannot read or write directly.
ALTER TABLE sponsorship_levels ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
