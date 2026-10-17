-- ================================================================
-- AUCTION CENTER — tables (Slice A)
-- ================================================================
-- Non-profit silent/live auctions. All money is integer cents. All
-- timestamps are server-side (DEFAULT now()). Backend-only access via the
-- service role: RLS is enabled with NO policies, so anon/authenticated
-- clients can read or write nothing directly.
--
-- Orders, order items, outbox and audit rows are financial/notification
-- records: their links to auctions/bidders/items are SET NULL (with
-- snapshots on the row) so deleting an auction never erases them. Bidding
-- data (items, bidders, bids, proxy bids, OTPs) CASCADEs from the auction.
--
-- Run BEFORE create-auction-functions.sql. Safe to run multiple times.
-- ================================================================

CREATE TABLE IF NOT EXISTS auctions (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_account_id           UUID REFERENCES promoter_accounts(id) ON DELETE SET NULL,
  public_event_id               UUID REFERENCES public_events(id) ON DELETE SET NULL,
  created_by_user_id            UUID REFERENCES users(id) ON DELETE SET NULL,

  title                         TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description                   TEXT,
  status                        TEXT NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft', 'scheduled', 'live', 'closed', 'settled', 'cancelled')),

  starts_at                     TIMESTAMPTZ,
  ends_at                       TIMESTAMPTZ,
  hard_close_at                 TIMESTAMPTZ,
  anti_snipe_window_seconds     INTEGER NOT NULL DEFAULT 300 CHECK (anti_snipe_window_seconds >= 0),
  anti_snipe_extension_seconds  INTEGER NOT NULL DEFAULT 300 CHECK (anti_snipe_extension_seconds >= 0),
  payment_grace_hours           INTEGER NOT NULL DEFAULT 72 CHECK (payment_grace_hours BETWEEN 1 AND 720),
  default_exposure_limit_cents  INTEGER NOT NULL DEFAULT 500000 CHECK (default_exposure_limit_cents > 0),

  -- snapshots of the organization/event at creation time
  org_name                      TEXT,
  org_ein                       TEXT,
  event_title                   TEXT,
  event_date                    DATE,

  closed_at                     TIMESTAMPTZ,
  settled_at                    TIMESTAMPTZ,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT auctions_schedule_chk CHECK (status = 'draft' OR ends_at IS NOT NULL),
  CONSTRAINT auctions_window_chk CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at),
  CONSTRAINT auctions_hard_close_chk CHECK (hard_close_at IS NULL OR ends_at IS NULL OR hard_close_at >= ends_at)
);

CREATE INDEX IF NOT EXISTS idx_auctions_promoter_status ON auctions (promoter_account_id, status);
CREATE INDEX IF NOT EXISTS idx_auctions_event ON auctions (public_event_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status_ends ON auctions (status, ends_at);

-- ----------------------------------------------------------------
-- Bidders: one registration per person per auction
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_bidders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id                UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id                   UUID REFERENCES users(id) ON DELETE SET NULL,

  display_name              TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  paddle_number             INTEGER CHECK (paddle_number IS NULL OR paddle_number > 0),
  email                     TEXT NOT NULL CHECK (email = lower(email)),
  phone_e164                TEXT NOT NULL CHECK (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  email_verified_at         TIMESTAMPTZ,
  phone_verified_at         TIMESTAMPTZ,

  stripe_customer_id        TEXT,
  stripe_payment_method_id  TEXT,
  card_status               TEXT NOT NULL DEFAULT 'none'
                              CHECK (card_status IN ('none', 'pending', 'ready', 'failed')),
  card_brand                TEXT,
  card_last4                TEXT,

  exposure_limit_cents      INTEGER NOT NULL DEFAULT 500000 CHECK (exposure_limit_cents > 0),
  blocked_at                TIMESTAMPTZ,
  blocked_reason            TEXT,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_auction_bidders_email ON auction_bidders (auction_id, email);
CREATE UNIQUE INDEX IF NOT EXISTS uq_auction_bidders_phone ON auction_bidders (auction_id, phone_e164);
CREATE UNIQUE INDEX IF NOT EXISTS uq_auction_bidders_paddle
  ON auction_bidders (auction_id, paddle_number) WHERE paddle_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auction_bidders_user ON auction_bidders (user_id);

-- ----------------------------------------------------------------
-- Items (lots)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_items (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id                UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,

  lot_number                INTEGER,
  sale_mode                 TEXT NOT NULL DEFAULT 'auction' CHECK (sale_mode IN ('auction', 'fixed')),
  title                     TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description               TEXT,
  category                  TEXT,
  donor_name                TEXT,
  image_urls                TEXT[] NOT NULL DEFAULT '{}',
  fair_market_value_cents   INTEGER NOT NULL DEFAULT 0 CHECK (fair_market_value_cents >= 0),
  tax_code                  TEXT,
  sort_order                INTEGER NOT NULL DEFAULT 0,

  -- auction items
  starting_bid_cents        INTEGER CHECK (starting_bid_cents IS NULL OR starting_bid_cents > 0),
  reserve_cents             INTEGER CHECK (reserve_cents IS NULL OR reserve_cents > 0),
  increment_cents           INTEGER CHECK (increment_cents IS NULL OR increment_cents > 0),
  buy_now_cents             INTEGER CHECK (buy_now_cents IS NULL OR buy_now_cents > 0),
  buy_now_available         BOOLEAN NOT NULL DEFAULT false,

  -- fixed-price items (sold at a set price, up to quantity)
  fixed_price_cents         INTEGER CHECK (fixed_price_cents IS NULL OR fixed_price_cents > 0),
  quantity                  INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  quantity_sold             INTEGER NOT NULL DEFAULT 0 CHECK (quantity_sold >= 0),
  per_bidder_limit          INTEGER CHECK (per_bidder_limit IS NULL OR per_bidder_limit > 0),

  status                    TEXT NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open', 'sold', 'unsold', 'reserve_not_met', 'withdrawn')),
  current_price_cents       INTEGER NOT NULL DEFAULT 0 CHECK (current_price_cents >= 0),
  leader_bidder_id          UUID REFERENCES auction_bidders(id) ON DELETE SET NULL,
  bid_count                 INTEGER NOT NULL DEFAULT 0 CHECK (bid_count >= 0),
  ends_at                   TIMESTAMPTZ,

  winning_bidder_id         UUID REFERENCES auction_bidders(id) ON DELETE SET NULL,
  final_price_cents         INTEGER CHECK (final_price_cents IS NULL OR final_price_cents > 0),
  sold_via                  TEXT CHECK (sold_via IS NULL OR sold_via IN ('auction', 'buy_now')),
  closed_at                 TIMESTAMPTZ,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT auction_items_buy_now_chk CHECK (buy_now_available = false OR buy_now_cents IS NOT NULL),
  CONSTRAINT auction_items_mode_chk CHECK (
    (sale_mode = 'auction' AND starting_bid_cents IS NOT NULL)
    OR (sale_mode = 'fixed' AND fixed_price_cents IS NOT NULL AND reserve_cents IS NULL AND buy_now_cents IS NULL)
  ),
  CONSTRAINT auction_items_reserve_chk CHECK (reserve_cents IS NULL OR starting_bid_cents IS NULL OR reserve_cents >= starting_bid_cents),
  CONSTRAINT auction_items_qty_chk CHECK (quantity_sold <= quantity)
);

CREATE INDEX IF NOT EXISTS idx_auction_items_auction_status ON auction_items (auction_id, status);
CREATE INDEX IF NOT EXISTS idx_auction_items_open_ends ON auction_items (ends_at) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_auction_items_winner ON auction_items (winning_bidder_id) WHERE winning_bidder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auction_items_leader ON auction_items (leader_bidder_id) WHERE leader_bidder_id IS NOT NULL;

-- ----------------------------------------------------------------
-- Bid history (every visible price change)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_bids (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_id           UUID NOT NULL REFERENCES auction_items(id) ON DELETE CASCADE,
  bidder_id         UUID NOT NULL REFERENCES auction_bidders(id) ON DELETE CASCADE,
  amount_cents      INTEGER NOT NULL CHECK (amount_cents > 0),
  max_amount_cents  INTEGER,
  kind              TEXT NOT NULL CHECK (kind IN ('manual', 'proxy_auto')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT auction_bids_max_chk CHECK (max_amount_cents IS NULL OR max_amount_cents >= amount_cents)
);

CREATE INDEX IF NOT EXISTS idx_auction_bids_item ON auction_bids (item_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_auction_bids_bidder ON auction_bids (bidder_id, created_at DESC);

-- ----------------------------------------------------------------
-- Proxy (max) bids: one standing maximum per bidder per item
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_proxy_bids (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id           UUID NOT NULL REFERENCES auction_items(id) ON DELETE CASCADE,
  bidder_id         UUID NOT NULL REFERENCES auction_bidders(id) ON DELETE CASCADE,
  max_amount_cents  INTEGER NOT NULL CHECK (max_amount_cents > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_auction_proxy_bids_item_bidder UNIQUE (item_id, bidder_id)
);

CREATE INDEX IF NOT EXISTS idx_auction_proxy_bids_bidder ON auction_proxy_bids (bidder_id);

-- ----------------------------------------------------------------
-- Orders: one settlement order per bidder per auction + separate buy-now orders
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id                UUID REFERENCES auctions(id) ON DELETE SET NULL,
  public_event_id           UUID REFERENCES public_events(id) ON DELETE SET NULL,
  promoter_account_id       UUID REFERENCES promoter_accounts(id) ON DELETE SET NULL,
  bidder_id                 UUID REFERENCES auction_bidders(id) ON DELETE SET NULL,

  kind                      TEXT NOT NULL DEFAULT 'settlement' CHECK (kind IN ('settlement', 'buy_now')),
  status                    TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'charging', 'requires_action', 'failed',
                                                'paid', 'defaulted', 'cancelled', 'refunded')),

  -- snapshots
  buyer_name                TEXT NOT NULL,
  buyer_email               TEXT NOT NULL,
  buyer_phone               TEXT,
  auction_title             TEXT NOT NULL,
  event_title               TEXT,
  org_name                  TEXT,
  org_ein                   TEXT,

  -- money (integer cents); total = subtotal + tax + processing + platform fee
  subtotal_cents            INTEGER NOT NULL CHECK (subtotal_cents > 0),
  tax_cents                 INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  processing_fee_cents      INTEGER NOT NULL DEFAULT 0 CHECK (processing_fee_cents >= 0),
  platform_fee_cents        INTEGER NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),
  total_cents               INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  application_fee_cents     INTEGER NOT NULL DEFAULT 0 CHECK (application_fee_cents >= 0),
  platform_fee_rate         NUMERIC(6, 5) NOT NULL CHECK (platform_fee_rate >= 0 AND platform_fee_rate <= 0.2),
  tax_calculation_id        TEXT,
  tax_transaction_id        TEXT,
  tax_jurisdiction          JSONB,

  stripe_payment_intent_id  TEXT,
  amount_received_cents     INTEGER CHECK (amount_received_cents IS NULL OR amount_received_cents >= 0),
  paid_at                   TIMESTAMPTZ,

  pay_by_at                 TIMESTAMPTZ NOT NULL,
  charge_attempts           INTEGER NOT NULL DEFAULT 0 CHECK (charge_attempts >= 0),
  next_charge_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at                TIMESTAMPTZ,
  last_error_code           TEXT,
  last_error_message        TEXT,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT auction_orders_total_chk
    CHECK (total_cents = 0 OR total_cents = subtotal_cents + tax_cents + processing_fee_cents + platform_fee_cents),
  CONSTRAINT auction_orders_app_fee_chk
    CHECK (application_fee_cents = 0 OR application_fee_cents = platform_fee_cents + processing_fee_cents + tax_cents)
);

ALTER TABLE auction_orders ADD COLUMN IF NOT EXISTS tax_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE auction_orders ADD COLUMN IF NOT EXISTS tax_calculation_id TEXT;
ALTER TABLE auction_orders ADD COLUMN IF NOT EXISTS tax_transaction_id TEXT;
ALTER TABLE auction_orders ADD COLUMN IF NOT EXISTS tax_jurisdiction JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_auction_orders_settlement
  ON auction_orders (auction_id, bidder_id) WHERE kind = 'settlement';
CREATE UNIQUE INDEX IF NOT EXISTS uq_auction_orders_payment_intent
  ON auction_orders (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auction_orders_charge_queue
  ON auction_orders (next_charge_at) WHERE status IN ('pending', 'failed', 'charging');
CREATE INDEX IF NOT EXISTS idx_auction_orders_auction ON auction_orders (auction_id, status);
CREATE INDEX IF NOT EXISTS idx_auction_orders_bidder ON auction_orders (bidder_id);
CREATE INDEX IF NOT EXISTS idx_auction_orders_email_created ON auction_orders (buyer_email, created_at DESC);

CREATE TABLE IF NOT EXISTS auction_order_items (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                  UUID NOT NULL REFERENCES auction_orders(id) ON DELETE CASCADE,
  item_id                   UUID REFERENCES auction_items(id) ON DELETE SET NULL,
  title                     TEXT NOT NULL,
  lot_number                INTEGER,
  sale_mode                 TEXT NOT NULL DEFAULT 'auction' CHECK (sale_mode IN ('auction', 'fixed')),
  quantity                  INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_cents               INTEGER NOT NULL CHECK (price_cents > 0),
  fair_market_value_cents   INTEGER NOT NULL DEFAULT 0 CHECK (fair_market_value_cents >= 0),
  tax_code                  TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A single-lot (auction / buy-now) item can be billed once; fixed-price items repeat. NULL item_ids (deleted items) are allowed.
DROP INDEX IF EXISTS uq_auction_order_items_item;
CREATE UNIQUE INDEX IF NOT EXISTS uq_auction_order_items_item
  ON auction_order_items (item_id) WHERE sale_mode = 'auction';
CREATE INDEX IF NOT EXISTS idx_auction_order_items_order ON auction_order_items (order_id);

-- ----------------------------------------------------------------
-- One-time codes for bidder verification (store hashes only)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_otps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bidder_id     UUID NOT NULL REFERENCES auction_bidders(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  destination   TEXT NOT NULL,
  code_hash     TEXT NOT NULL,
  attempts      INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at    TIMESTAMPTZ NOT NULL,
  consumed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_otps_bidder_channel ON auction_otps (bidder_id, channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_otps_expires ON auction_otps (expires_at);

-- ----------------------------------------------------------------
-- Outbox: notifications written in the same transaction as the state change
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_outbox (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auction_id       UUID REFERENCES auctions(id) ON DELETE SET NULL,
  item_id          UUID REFERENCES auction_items(id) ON DELETE SET NULL,
  order_id         UUID REFERENCES auction_orders(id) ON DELETE SET NULL,
  bidder_id        UUID REFERENCES auction_bidders(id) ON DELETE SET NULL,
  kind             TEXT NOT NULL,
  payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts         INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at        TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ,
  last_error       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_outbox_queue
  ON auction_outbox (next_attempt_at) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_auction_outbox_auction ON auction_outbox (auction_id);

-- ----------------------------------------------------------------
-- Audit trail (append-only by convention)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_audit (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auction_id   UUID REFERENCES auctions(id) ON DELETE SET NULL,
  actor_type   TEXT NOT NULL DEFAULT 'system' CHECK (actor_type IN ('system', 'promoter', 'bidder', 'admin', 'webhook')),
  actor_id     TEXT,
  action       TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    TEXT,
  details      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_audit_auction ON auction_audit (auction_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_audit_entity ON auction_audit (entity_type, entity_id);

-- Backend-only (service role); no policies means no direct client access.
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_bidders ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_proxy_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_audit ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
