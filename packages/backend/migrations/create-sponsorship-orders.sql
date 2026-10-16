-- ================================================================
-- SPONSORSHIP ORDERS (buyer side)
-- ================================================================
-- One row per sponsorship purchase. Money and organization details are
-- snapshotted so records survive edits to (or deletion of) the level, event
-- or promoter account; those links are SET NULL, never CASCADE.
--
-- Flow: checkout creates a 'pending' row -> Stripe webhook calls
-- mark_sponsorship_paid(), which flips it to 'paid' exactly once and bumps
-- sponsorship_levels.quantity_sold (safe against webhook retries).
-- Safe to run multiple times.
-- ================================================================

CREATE TABLE IF NOT EXISTS sponsorship_orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsorship_level_id      UUID REFERENCES sponsorship_levels(id) ON DELETE SET NULL,
  public_event_id           UUID REFERENCES public_events(id) ON DELETE SET NULL,
  promoter_account_id       UUID REFERENCES promoter_accounts(id) ON DELETE SET NULL,

  -- buyer
  buyer_name                TEXT NOT NULL,
  buyer_email               TEXT NOT NULL,
  buyer_phone               TEXT,
  company_name              TEXT,

  -- snapshots
  event_title               TEXT NOT NULL,
  event_date                DATE,
  level_name                TEXT NOT NULL,
  org_name                  TEXT,
  org_ein                   TEXT,
  tables_included           INTEGER NOT NULL DEFAULT 0,
  seats_per_table           INTEGER NOT NULL DEFAULT 0,
  tickets_included          INTEGER NOT NULL DEFAULT 0,

  -- money (USD)
  price                     NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  fair_market_value         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  deductible_amount         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  service_fee               NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_charged             NUMERIC(10, 2) NOT NULL DEFAULT 0,

  status                    TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'paid', 'refunded')),
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id  TEXT,
  paid_at                   TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsorship_orders_level ON sponsorship_orders (sponsorship_level_id);
CREATE INDEX IF NOT EXISTS idx_sponsorship_orders_event ON sponsorship_orders (public_event_id, status);
CREATE INDEX IF NOT EXISTS idx_sponsorship_orders_email_created
  ON sponsorship_orders (buyer_email, created_at DESC);

-- Backend-only (service role); no policies means no direct client access.
ALTER TABLE sponsorship_orders ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION mark_sponsorship_paid(p_order_id UUID, p_payment_intent TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level UUID;
  v_found BOOLEAN;
BEGIN
  UPDATE sponsorship_orders
     SET status = 'paid',
         paid_at = NOW(),
         stripe_payment_intent_id = p_payment_intent
   WHERE id = p_order_id AND status = 'pending'
  RETURNING sponsorship_level_id, TRUE INTO v_level, v_found;

  -- Already paid (webhook retry) or unknown order.
  IF v_found IS NOT TRUE THEN
    RETURN FALSE;
  END IF;

  IF v_level IS NOT NULL THEN
    UPDATE sponsorship_levels
       SET quantity_sold = quantity_sold + 1, updated_at = NOW()
     WHERE id = v_level;
  END IF;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION mark_sponsorship_paid(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_sponsorship_paid(UUID, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
