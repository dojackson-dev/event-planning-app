-- ================================================================
-- TICKET EVOLUTION ORDER TRACKING (revenue)
-- ================================================================
-- One row per Ticket Evolution order delivered by the order webhook
-- (order_created / order_updated / order_canceled / order_rejected /
-- fraud_response_received). Stores money + status only; no buyer PII.
--
-- environment = 'production' rows are re-fetched from the TEvo API
-- before being stored (webhooks are unsigned). 'sandbox' rows come from
-- the webhook payload and are NEVER counted in revenue.
-- ================================================================

CREATE TABLE IF NOT EXISTS ticket_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment         TEXT NOT NULL CHECK (environment IN ('production', 'sandbox')),
  order_id            TEXT NOT NULL,
  oid                 TEXT,
  tevo_event_id       BIGINT,
  event_name          TEXT,
  state               TEXT,
  fraud_check_status  TEXT,
  buyer_type          TEXT,
  currency            TEXT,
  quantity            INTEGER,
  subtotal            NUMERIC(12, 2),
  service_fee         NUMERIC(12, 2),
  fees                NUMERIC(12, 2),
  tax                 NUMERIC(12, 2),
  total               NUMERIC(12, 2),
  wholesale_price     NUMERIC(12, 2),
  commission          NUMERIC(12, 2),
  refunded            NUMERIC(12, 2),
  verified            BOOLEAN NOT NULL DEFAULT FALSE,
  ordered_at          TIMESTAMPTZ,
  last_event_type     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (environment, order_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_orders_ordered_at ON ticket_orders (ordered_at DESC);

-- Service-role only: the backend writes with the admin client. No policies
-- means anon/authenticated users cannot read or write.
ALTER TABLE ticket_orders ENABLE ROW LEVEL SECURITY;

-- Revenue = production, verified, not canceled/rejected, and not failing
-- fraud review. Sales to Clients count only once fraud check is approved
-- (or not applicable).
CREATE OR REPLACE VIEW ticket_order_revenue
WITH (security_invoker = true) AS
SELECT *
FROM ticket_orders
WHERE environment = 'production'
  AND verified = TRUE
  AND COALESCE(state, '') NOT IN ('canceled', 'cancelled', 'rejected')
  AND (fraud_check_status IS NULL OR fraud_check_status = 'approved');
