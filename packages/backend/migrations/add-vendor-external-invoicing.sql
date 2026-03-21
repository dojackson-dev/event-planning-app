-- ============================================================
-- Vendor External Invoicing, Booking Links & Payment (1.5% fee)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. vendor_invoices
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_invoices (
  id                        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_account_id         UUID        NOT NULL REFERENCES vendor_accounts(id) ON DELETE CASCADE,
  invoice_number            TEXT        UNIQUE NOT NULL,
  client_name               TEXT        NOT NULL,
  client_email              TEXT        NOT NULL,
  client_phone              TEXT,
  issue_date                DATE        NOT NULL DEFAULT CURRENT_DATE,
  due_date                  DATE        NOT NULL,
  status                    TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','sent','viewed','paid','overdue','cancelled')),
  subtotal                  NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate                  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  tax_amount                NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount           NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount              NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid               NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_due                NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes                     TEXT,
  terms                     TEXT,
  -- secure random token used in the public payment URL
  public_token              TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id   TEXT,
  paid_at                   TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_vendor ON vendor_invoices(vendor_account_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_token  ON vendor_invoices(public_token);

-- ────────────────────────────────────────────────────────────
-- 2. vendor_invoice_items
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_invoice_items (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_invoice_id   UUID        NOT NULL REFERENCES vendor_invoices(id) ON DELETE CASCADE,
  description         TEXT        NOT NULL,
  quantity            NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price          NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount              NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_invoice_items_invoice ON vendor_invoice_items(vendor_invoice_id);

-- ────────────────────────────────────────────────────────────
-- 3. vendor_booking_links
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_booking_links (
  id                          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_account_id           UUID    NOT NULL REFERENCES vendor_accounts(id) ON DELETE CASCADE,
  -- URL-safe slug, e.g. "dj-mike-events"
  slug                        TEXT    UNIQUE NOT NULL,
  is_active                   BOOLEAN DEFAULT true,
  custom_message              TEXT,
  default_deposit_percentage  NUMERIC(5,2),   -- e.g. 25 = 25%
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_booking_links_vendor ON vendor_booking_links(vendor_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_booking_links_slug ON vendor_booking_links(slug);

-- ────────────────────────────────────────────────────────────
-- 4. vendor_booking_requests
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_booking_requests (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_account_id   UUID    NOT NULL REFERENCES vendor_accounts(id) ON DELETE CASCADE,
  booking_link_id     UUID    REFERENCES vendor_booking_links(id) ON DELETE SET NULL,
  client_name         TEXT    NOT NULL,
  client_email        TEXT    NOT NULL,
  client_phone        TEXT,
  event_name          TEXT,
  event_date          DATE,
  start_time          TIME,
  end_time            TIME,
  venue_name          TEXT,
  venue_address       TEXT,
  notes               TEXT,
  status              TEXT    NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','confirmed','declined','cancelled')),
  quoted_amount       NUMERIC(10,2),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_booking_requests_vendor ON vendor_booking_requests(vendor_account_id);
CREATE INDEX IF NOT EXISTS idx_vendor_booking_requests_link   ON vendor_booking_requests(booking_link_id);

-- ────────────────────────────────────────────────────────────
-- 5. RLS Policies
-- ────────────────────────────────────────────────────────────

ALTER TABLE vendor_invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_invoice_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_booking_links    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_booking_requests ENABLE ROW LEVEL SECURITY;

-- vendor_invoices: vendor can manage their own; service role bypasses RLS
CREATE POLICY vendor_invoices_vendor_all ON vendor_invoices
  FOR ALL TO authenticated
  USING (
    vendor_account_id IN (
      SELECT id FROM vendor_accounts WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    vendor_account_id IN (
      SELECT id FROM vendor_accounts WHERE user_id = auth.uid()
    )
  );

-- vendor_invoice_items: same scoping through parent invoice
CREATE POLICY vendor_invoice_items_vendor_all ON vendor_invoice_items
  FOR ALL TO authenticated
  USING (
    vendor_invoice_id IN (
      SELECT vi.id FROM vendor_invoices vi
      JOIN vendor_accounts va ON va.id = vi.vendor_account_id
      WHERE va.user_id = auth.uid()
    )
  )
  WITH CHECK (
    vendor_invoice_id IN (
      SELECT vi.id FROM vendor_invoices vi
      JOIN vendor_accounts va ON va.id = vi.vendor_account_id
      WHERE va.user_id = auth.uid()
    )
  );

-- vendor_booking_links: vendor manages their own
CREATE POLICY vendor_booking_links_vendor_all ON vendor_booking_links
  FOR ALL TO authenticated
  USING (
    vendor_account_id IN (
      SELECT id FROM vendor_accounts WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    vendor_account_id IN (
      SELECT id FROM vendor_accounts WHERE user_id = auth.uid()
    )
  );

-- vendor_booking_requests: vendor reads/updates their own
CREATE POLICY vendor_booking_requests_vendor_all ON vendor_booking_requests
  FOR ALL TO authenticated
  USING (
    vendor_account_id IN (
      SELECT id FROM vendor_accounts WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    vendor_account_id IN (
      SELECT id FROM vendor_accounts WHERE user_id = auth.uid()
    )
  );
