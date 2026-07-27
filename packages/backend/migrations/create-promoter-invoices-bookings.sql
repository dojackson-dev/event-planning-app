-- ================================================================
-- CREATE PROMOTER INVOICES, INVOICE ITEMS, AND BOOKINGS TABLES
-- ================================================================
-- Run this in Supabase SQL Editor:
-- https://app.supabase.com/project/unzfkcmmakyyjgruexpy/sql/new
-- ================================================================

-- ================================================================
-- promoter_invoices TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS promoter_invoices (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_account_id         UUID NOT NULL REFERENCES promoter_accounts(id) ON DELETE CASCADE,
  invoice_number              VARCHAR(50) UNIQUE NOT NULL,

  -- Client info
  client_name                 VARCHAR(255) NOT NULL,
  client_email                VARCHAR(255) NOT NULL,
  client_phone                VARCHAR(50),

  -- Dates
  issue_date                  DATE NOT NULL,
  due_date                    DATE NOT NULL,

  -- Financials
  subtotal                    DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate                    DECIMAL(5,2) NOT NULL DEFAULT 0,
  tax_amount                  DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount             DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount                DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_due                  DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_paid                 DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Status
  status                      VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- draft | sent | viewed | paid | cancelled

  -- Notes / Terms
  notes                       TEXT,
  terms                       TEXT,

  -- Stripe / Payment tracking
  public_token                VARCHAR(100) UNIQUE DEFAULT gen_random_uuid()::text,
  stripe_checkout_session_id  VARCHAR(255),
  stripe_payment_intent_id    VARCHAR(255),

  -- Timestamps
  created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promoter_invoices_promoter_account_id ON promoter_invoices(promoter_account_id);
CREATE INDEX IF NOT EXISTS idx_promoter_invoices_status ON promoter_invoices(status);
CREATE INDEX IF NOT EXISTS idx_promoter_invoices_public_token ON promoter_invoices(public_token);
CREATE INDEX IF NOT EXISTS idx_promoter_invoices_created_at ON promoter_invoices(created_at DESC);

-- ================================================================
-- promoter_invoice_items TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS promoter_invoice_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_invoice_id  UUID NOT NULL REFERENCES promoter_invoices(id) ON DELETE CASCADE,
  description          TEXT NOT NULL,
  quantity             DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price           DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount               DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promoter_invoice_items_invoice_id ON promoter_invoice_items(promoter_invoice_id);

-- ================================================================
-- promoter_bookings TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS promoter_bookings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_account_id   UUID NOT NULL REFERENCES promoter_accounts(id) ON DELETE CASCADE,

  -- Event details
  event_name            VARCHAR(255) NOT NULL,
  event_date            DATE,
  event_start_time      TIME,
  event_end_time        TIME,
  venue_name            VARCHAR(255),
  venue_address         TEXT,

  -- Client info (who hired the promoter / event contact)
  client_name           VARCHAR(255) NOT NULL,
  client_email          VARCHAR(255) NOT NULL,
  client_phone          VARCHAR(50),

  -- Financials
  agreed_amount         DECIMAL(10,2),
  deposit_amount        DECIMAL(10,2),

  -- Status
  status                VARCHAR(50) NOT NULL DEFAULT 'inquiry',
  -- inquiry | estimate_sent | deposit_paid | confirmed | completed | cancelled

  -- Notes
  notes                 TEXT,

  -- Invoice link
  promoter_invoice_id   UUID REFERENCES promoter_invoices(id) ON DELETE SET NULL,

  -- Artist link (for "Promoter Books Artist" feature)
  artist_account_id     UUID REFERENCES artist_accounts(id) ON DELETE SET NULL,
  artist_name           VARCHAR(255),

  -- Timestamps
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promoter_bookings_promoter_account_id ON promoter_bookings(promoter_account_id);
CREATE INDEX IF NOT EXISTS idx_promoter_bookings_event_date ON promoter_bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_promoter_bookings_status ON promoter_bookings(status);
CREATE INDEX IF NOT EXISTS idx_promoter_bookings_artist_account_id ON promoter_bookings(artist_account_id);

-- ================================================================
-- RLS POLICIES
-- ================================================================

-- Enable RLS
ALTER TABLE promoter_invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_bookings      ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (backend uses service role key — policies below are for direct client access)

-- promoter_invoices: promoter can manage their own invoices
DROP POLICY IF EXISTS "promoter_invoices_owner_policy" ON promoter_invoices;
CREATE POLICY "promoter_invoices_owner_policy"
  ON promoter_invoices
  FOR ALL
  USING (
    promoter_account_id IN (
      SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
    )
  );

-- promoter_invoice_items: accessible if parent invoice is accessible
DROP POLICY IF EXISTS "promoter_invoice_items_owner_policy" ON promoter_invoice_items;
CREATE POLICY "promoter_invoice_items_owner_policy"
  ON promoter_invoice_items
  FOR ALL
  USING (
    promoter_invoice_id IN (
      SELECT pi.id FROM promoter_invoices pi
      JOIN promoter_accounts pa ON pi.promoter_account_id = pa.id
      WHERE pa.user_id = auth.uid()
    )
  );

-- promoter_bookings: promoter can manage their own bookings
DROP POLICY IF EXISTS "promoter_bookings_owner_policy" ON promoter_bookings;
CREATE POLICY "promoter_bookings_owner_policy"
  ON promoter_bookings
  FOR ALL
  USING (
    promoter_account_id IN (
      SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
    )
  );
