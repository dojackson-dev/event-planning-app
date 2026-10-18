-- ================================================================
-- Auction Center: payments / notifications additions (Slice D)
-- Run AFTER create-auctions.sql and create-auction-functions.sql. Idempotent.
-- ================================================================

-- Pay link (random 32-byte token; only its SHA-256 hash is stored; expiry = pay_by_at)
ALTER TABLE auction_orders ADD COLUMN IF NOT EXISTS pay_token_hash TEXT;
ALTER TABLE auction_orders ADD COLUMN IF NOT EXISTS pay_token_expires_at TIMESTAMPTZ;
ALTER TABLE auction_orders ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- Latest PaymentIntent we created for the order (cancelled before a pay-link checkout)
ALTER TABLE auction_orders ADD COLUMN IF NOT EXISTS last_payment_intent_id TEXT;

-- Receipt is emailed once
ALTER TABLE auction_orders ADD COLUMN IF NOT EXISTS receipt_sent_at TIMESTAMPTZ;

-- Refund / dispute flag set by webhooks (no automatic refunds)
ALTER TABLE auction_orders ADD COLUMN IF NOT EXISTS flag_reason TEXT;
ALTER TABLE auction_orders ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_auction_orders_pay_token_hash
  ON auction_orders (pay_token_hash) WHERE pay_token_hash IS NOT NULL;

-- Saved-card retention and SMS consent
ALTER TABLE auction_bidders ADD COLUMN IF NOT EXISTS card_detached_at TIMESTAMPTZ;
ALTER TABLE auction_bidders ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN NOT NULL DEFAULT false;

-- Outbid SMS throttle (1 per item per bidder per 5 minutes)
ALTER TABLE auction_outbox ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_auction_outbox_sms_throttle
  ON auction_outbox (item_id, bidder_id, sms_sent_at) WHERE sms_sent_at IS NOT NULL;

NOTIFY pgrst, 'reload schema';
