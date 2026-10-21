-- ================================================================
-- AUCTION CENTER — RPCs (Slice A)
-- ================================================================
-- Run AFTER create-auctions.sql. Safe to run multiple times.
-- Every function is SECURITY DEFINER with a pinned search_path and is
-- callable by the service role only.
--
-- Lock order (to avoid deadlocks): bidder -> items -> auction -> orders.
--
-- ----------------------------------------------------------------
-- PROXY (MAX) BIDDING — used by place_auction_bid
-- ----------------------------------------------------------------
-- Every bid a bidder makes is stored as that bidder's standing maximum
-- in auction_proxy_bids (one row per item+bidder). A bidder may RAISE a
-- max but never lower or cancel it. The system keeps the visible price at
-- the minimum needed for the highest max to lead. Increments come from
-- auction_bid_increment() (tiers, or the item's own override).
--
-- Modes:
--   'manual' : an explicit bid of exactly p_amount_cents. If it takes the
--              lead, the price becomes that amount.
--   'max'    : a ceiling. If it takes the lead, the price is only one
--              increment above the previous leader's max (capped at the new max).
--
-- Let P = current price, L = leader, ML = L's max, C = challenger, A = C's amount.
--   0. A must exceed C's own previous max, else 'max_not_raised'.
--   1. C already leads: only C's max is raised. Price, bids and leader are
--      unchanged; nothing is written to auction_bids or the outbox.
--   2. Otherwise A must be >= the minimum next bid (the starting bid when
--      there are no bids, else P + increment(P)), else 'bid_too_low'.
--   3. No leader yet: C leads. Price = A (manual) or the starting bid (max).
--   4. A > ML (C wins): if ML > P a 'proxy_auto' row records L's bid up to
--      ML first. Price = A (manual) or min(A, ML + increment(ML)) (max).
--      C's row is 'manual'. The leader changed, so L gets an 'outbid' outbox row.
--   5. A <= ML (L holds): C's bid is recorded ('manual', amount A), then L's
--      proxy answers with a 'proxy_auto' row at min(ML, A + increment(A)).
--      The leader is unchanged, so there is no outbox row. A == ML is a tie:
--      the incumbent leader holds the earlier max, so the earliest max wins.
--   Anti-sniping: any price change within the auction's window before the
--   item's end pushes the end to now() + extension, never past hard_close_at.
--   Any bid removes buy-it-now for that item.
-- ================================================================

CREATE OR REPLACE FUNCTION auction_bid_increment(p_price INTEGER, p_override INTEGER DEFAULT NULL)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Keep in sync with BID_INCREMENT_TIERS in src/auction/auction-money.ts
  SELECT CASE
    WHEN p_override IS NOT NULL AND p_override > 0 THEN p_override
    WHEN p_price < 2500 THEN 100
    WHEN p_price < 5000 THEN 250
    WHEN p_price < 10000 THEN 500
    WHEN p_price < 25000 THEN 1000
    WHEN p_price < 50000 THEN 2500
    WHEN p_price < 100000 THEN 5000
    ELSE 10000
  END
$$;

REVOKE ALL ON FUNCTION auction_bid_increment(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION auction_bid_increment(INTEGER, INTEGER) TO service_role;

-- ----------------------------------------------------------------
-- place_auction_bid: manual bid or max bid with proxy resolution
-- Returns JSONB: {ok:true, outcome:'leading'|'outbid'|'max_raised', ...} or {ok:false, code, ...}
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION place_auction_bid(
  p_item_id      UUID,
  p_bidder_id    UUID,
  p_amount_cents INTEGER,
  p_mode         TEXT DEFAULT 'manual'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now        TIMESTAMPTZ := now();
  v_bidder     auction_bidders%ROWTYPE;
  v_item       auction_items%ROWTYPE;
  v_auction    auctions%ROWTYPE;
  v_end        TIMESTAMPTZ;
  v_new_end    TIMESTAMPTZ;
  v_extended   BOOLEAN := FALSE;
  v_min_next   INTEGER;
  v_own_max    INTEGER;
  v_leader     UUID;
  v_leader_max INTEGER;
  v_exposure   BIGINT;
  v_price      INTEGER;
  v_new_leader UUID;
  v_added      INTEGER := 0;
  v_outcome    TEXT;
BEGIN
  IF p_mode IS NULL OR p_mode NOT IN ('manual', 'max')
     OR p_amount_cents IS NULL OR p_amount_cents <= 0 OR p_amount_cents > 10000000 THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_request');
  END IF;

  SELECT * INTO v_bidder FROM auction_bidders WHERE id = p_bidder_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'bidder_not_found');
  END IF;

  SELECT * INTO v_item FROM auction_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND OR v_item.auction_id <> v_bidder.auction_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'item_not_found');
  END IF;

  SELECT * INTO v_auction FROM auctions WHERE id = v_item.auction_id;
  IF v_auction.status <> 'live' OR (v_auction.starts_at IS NOT NULL AND v_auction.starts_at > v_now) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'auction_not_live');
  END IF;

  v_end := COALESCE(v_item.ends_at, v_auction.ends_at);
  IF v_item.status <> 'open' OR v_end IS NULL OR v_end <= v_now THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'item_closed');
  END IF;

  IF v_bidder.blocked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'bidder_blocked');
  END IF;
  IF v_bidder.email_verified_at IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'email_not_verified');
  END IF;
  IF v_bidder.phone_verified_at IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'phone_not_verified');
  END IF;
  IF v_bidder.card_status <> 'ready' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'card_not_ready');
  END IF;

  IF v_item.sale_mode <> 'auction' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_an_auction_item');
  END IF;

  SELECT max_amount_cents INTO v_own_max
    FROM auction_proxy_bids WHERE item_id = p_item_id AND bidder_id = p_bidder_id;
  IF p_amount_cents <= COALESCE(v_own_max, 0) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'max_not_raised', 'your_max_cents', v_own_max);
  END IF;

  v_leader := v_item.leader_bidder_id;
  IF v_leader IS DISTINCT FROM p_bidder_id THEN
    v_min_next := CASE
      WHEN v_item.bid_count = 0 THEN v_item.starting_bid_cents
      ELSE v_item.current_price_cents + auction_bid_increment(v_item.current_price_cents, v_item.increment_cents)
    END;
    IF p_amount_cents < v_min_next THEN
      RETURN jsonb_build_object('ok', FALSE, 'code', 'bid_too_low', 'min_next_bid_cents', v_min_next);
    END IF;
  END IF;

  -- Open commitments elsewhere (standing maxes, plus won items not yet paid) plus this bid.
  SELECT COALESCE(SUM(pb.max_amount_cents), 0) INTO v_exposure
    FROM auction_proxy_bids pb
    JOIN auction_items i ON i.id = pb.item_id
   WHERE pb.bidder_id = p_bidder_id AND i.status = 'open' AND i.id <> p_item_id;
  v_exposure := v_exposure + COALESCE((
    SELECT SUM(i.final_price_cents)
      FROM auction_items i
     WHERE i.winning_bidder_id = p_bidder_id
       AND i.status = 'sold'
       AND NOT EXISTS (
         SELECT 1 FROM auction_order_items oi
           JOIN auction_orders o ON o.id = oi.order_id
          WHERE oi.item_id = i.id AND o.status = 'paid')
  ), 0);
  IF v_exposure + p_amount_cents > v_bidder.exposure_limit_cents THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'exposure_limit',
                              'exposure_limit_cents', v_bidder.exposure_limit_cents);
  END IF;

  IF v_leader IS NOT NULL AND v_leader <> p_bidder_id THEN
    SELECT max_amount_cents INTO v_leader_max
      FROM auction_proxy_bids WHERE item_id = p_item_id AND bidder_id = v_leader;
    v_leader_max := COALESCE(v_leader_max, v_item.current_price_cents);
  END IF;

  INSERT INTO auction_proxy_bids (item_id, bidder_id, max_amount_cents)
  VALUES (p_item_id, p_bidder_id, p_amount_cents)
  ON CONFLICT (item_id, bidder_id)
  DO UPDATE SET max_amount_cents = EXCLUDED.max_amount_cents, updated_at = v_now;

  IF v_leader = p_bidder_id THEN
    -- Leader raising own max: no price change.
    v_price := v_item.current_price_cents;
    v_new_leader := p_bidder_id;
    v_outcome := 'max_raised';

  ELSIF v_leader IS NULL THEN
    v_price := CASE WHEN p_mode = 'manual' THEN p_amount_cents ELSE v_item.starting_bid_cents END;
    v_new_leader := p_bidder_id;
    v_outcome := 'leading';
    INSERT INTO auction_bids (item_id, bidder_id, amount_cents, max_amount_cents, kind)
    VALUES (p_item_id, p_bidder_id, v_price, p_amount_cents, 'manual');
    v_added := 1;

  ELSIF p_amount_cents > v_leader_max THEN
    IF v_leader_max > v_item.current_price_cents THEN
      INSERT INTO auction_bids (item_id, bidder_id, amount_cents, max_amount_cents, kind)
      VALUES (p_item_id, v_leader, v_leader_max, v_leader_max, 'proxy_auto');
      v_added := v_added + 1;
    END IF;
    v_price := CASE
      WHEN p_mode = 'manual' THEN p_amount_cents
      ELSE LEAST(p_amount_cents, v_leader_max + auction_bid_increment(v_leader_max, v_item.increment_cents))
    END;
    v_new_leader := p_bidder_id;
    v_outcome := 'leading';
    INSERT INTO auction_bids (item_id, bidder_id, amount_cents, max_amount_cents, kind)
    VALUES (p_item_id, p_bidder_id, v_price, p_amount_cents, 'manual');
    v_added := v_added + 1;

    INSERT INTO auction_outbox (auction_id, item_id, bidder_id, kind, payload)
    VALUES (v_item.auction_id, p_item_id, v_leader, 'outbid',
            jsonb_build_object('item_title', v_item.title, 'price_cents', v_price));

  ELSE
    v_new_leader := v_leader;
    v_outcome := 'outbid';
    INSERT INTO auction_bids (item_id, bidder_id, amount_cents, max_amount_cents, kind)
    VALUES (p_item_id, p_bidder_id, p_amount_cents, p_amount_cents, 'manual');
    v_price := LEAST(v_leader_max, p_amount_cents + auction_bid_increment(p_amount_cents, v_item.increment_cents));
    INSERT INTO auction_bids (item_id, bidder_id, amount_cents, max_amount_cents, kind)
    VALUES (p_item_id, v_leader, v_price, v_leader_max, 'proxy_auto');
    v_added := 2;
  END IF;

  v_new_end := v_end;
  IF v_added > 0
     AND v_auction.anti_snipe_extension_seconds > 0
     AND v_now >= v_end - make_interval(secs => v_auction.anti_snipe_window_seconds) THEN
    v_new_end := GREATEST(
      v_end,
      LEAST(
        v_now + make_interval(secs => v_auction.anti_snipe_extension_seconds),
        COALESCE(v_auction.hard_close_at, 'infinity'::timestamptz)
      )
    );
    v_extended := v_new_end > v_end;
  END IF;

  IF v_added > 0 THEN
    UPDATE auction_items
       SET current_price_cents = v_price,
           leader_bidder_id    = v_new_leader,
           bid_count           = bid_count + v_added,
           buy_now_available   = FALSE,
           ends_at             = CASE WHEN v_extended THEN v_new_end ELSE ends_at END,
           updated_at          = v_now
     WHERE id = p_item_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'outcome', v_outcome,
    'current_price_cents', v_price,
    'leader_bidder_id', v_new_leader,
    'your_max_cents', p_amount_cents,
    'you_are_leading', v_new_leader = p_bidder_id,
    'min_next_bid_cents', v_price + auction_bid_increment(v_price, v_item.increment_cents),
    'bid_count', v_item.bid_count + v_added,
    'ends_at', v_new_end,
    'extended', v_extended,
    'reserve_met', (v_item.reserve_cents IS NULL OR v_price >= v_item.reserve_cents),
    'buy_now_available', CASE WHEN v_added > 0 THEN FALSE ELSE v_item.buy_now_available END
  );
END;
$$;

REVOKE ALL ON FUNCTION place_auction_bid(UUID, UUID, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION place_auction_bid(UUID, UUID, INTEGER, TEXT) TO service_role;

-- ----------------------------------------------------------------
-- claim_item_now: buy-it-now. Only while the item has no bids. Sells the
-- item and creates its own immediate order (kind 'buy_now'). Fee/tax
-- amounts are filled in by set_auction_order_amounts before the charge.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_item_now(
  p_item_id           UUID,
  p_bidder_id         UUID,
  p_platform_fee_rate NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now      TIMESTAMPTZ := now();
  v_bidder   auction_bidders%ROWTYPE;
  v_item     auction_items%ROWTYPE;
  v_auction  auctions%ROWTYPE;
  v_end      TIMESTAMPTZ;
  v_exposure BIGINT;
  v_order_id UUID;
BEGIN
  IF p_platform_fee_rate IS NULL OR p_platform_fee_rate < 0 OR p_platform_fee_rate > 0.2 THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_rate');
  END IF;

  SELECT * INTO v_bidder FROM auction_bidders WHERE id = p_bidder_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'bidder_not_found');
  END IF;

  SELECT * INTO v_item FROM auction_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND OR v_item.auction_id <> v_bidder.auction_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'item_not_found');
  END IF;

  SELECT * INTO v_auction FROM auctions WHERE id = v_item.auction_id;
  IF v_auction.status <> 'live' OR (v_auction.starts_at IS NOT NULL AND v_auction.starts_at > v_now) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'auction_not_live');
  END IF;

  v_end := COALESCE(v_item.ends_at, v_auction.ends_at);
  IF v_item.status <> 'open' OR v_end IS NULL OR v_end <= v_now THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'item_closed');
  END IF;

  IF v_bidder.blocked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'bidder_blocked');
  END IF;
  IF v_bidder.email_verified_at IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'email_not_verified');
  END IF;
  IF v_bidder.phone_verified_at IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'phone_not_verified');
  END IF;
  IF v_bidder.card_status <> 'ready' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'card_not_ready');
  END IF;

  IF v_item.sale_mode <> 'auction' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_an_auction_item');
  END IF;
  IF v_item.bid_count > 0 OR v_item.leader_bidder_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'bidding_started');
  END IF;
  IF NOT v_item.buy_now_available OR v_item.buy_now_cents IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'buy_now_unavailable');
  END IF;

  SELECT COALESCE(SUM(pb.max_amount_cents), 0) INTO v_exposure
    FROM auction_proxy_bids pb
    JOIN auction_items i ON i.id = pb.item_id
   WHERE pb.bidder_id = p_bidder_id AND i.status = 'open';
  v_exposure := v_exposure + COALESCE((
    SELECT SUM(i.final_price_cents)
      FROM auction_items i
     WHERE i.winning_bidder_id = p_bidder_id
       AND i.status = 'sold'
       AND NOT EXISTS (
         SELECT 1 FROM auction_order_items oi
           JOIN auction_orders o ON o.id = oi.order_id
          WHERE oi.item_id = i.id AND o.status = 'paid')
  ), 0);
  IF v_exposure + v_item.buy_now_cents > v_bidder.exposure_limit_cents THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'exposure_limit',
                              'exposure_limit_cents', v_bidder.exposure_limit_cents);
  END IF;

  UPDATE auction_items
     SET status              = 'sold',
         winning_bidder_id   = p_bidder_id,
         leader_bidder_id    = p_bidder_id,
         current_price_cents = v_item.buy_now_cents,
         final_price_cents   = v_item.buy_now_cents,
         sold_via            = 'buy_now',
         buy_now_available   = FALSE,
         closed_at           = v_now,
         updated_at          = v_now
   WHERE id = p_item_id;

  INSERT INTO auction_orders (
    auction_id, public_event_id, promoter_account_id, bidder_id, kind, status,
    buyer_name, buyer_email, buyer_phone, auction_title, event_title, org_name, org_ein,
    subtotal_cents, platform_fee_rate, pay_by_at, next_charge_at
  ) VALUES (
    v_auction.id, v_auction.public_event_id, v_auction.promoter_account_id, p_bidder_id, 'buy_now', 'pending',
    v_bidder.display_name, v_bidder.email, v_bidder.phone_e164, v_auction.title,
    v_auction.event_title, v_auction.org_name, v_auction.org_ein,
    v_item.buy_now_cents, p_platform_fee_rate,
    v_now + make_interval(hours => v_auction.payment_grace_hours), v_now
  )
  RETURNING id INTO v_order_id;

  INSERT INTO auction_order_items (order_id, item_id, title, lot_number, price_cents, fair_market_value_cents, tax_code)
  VALUES (v_order_id, p_item_id, v_item.title, v_item.lot_number, v_item.buy_now_cents,
          v_item.fair_market_value_cents, v_item.tax_code);

  INSERT INTO auction_outbox (auction_id, item_id, order_id, bidder_id, kind, payload)
  VALUES (v_auction.id, p_item_id, v_order_id, p_bidder_id, 'order_created',
          jsonb_build_object('kind', 'buy_now', 'subtotal_cents', v_item.buy_now_cents));

  INSERT INTO auction_audit (auction_id, actor_type, actor_id, action, entity_type, entity_id, details)
  VALUES (v_auction.id, 'bidder', p_bidder_id::text, 'buy_now_claimed', 'item', p_item_id::text,
          jsonb_build_object('order_id', v_order_id, 'price_cents', v_item.buy_now_cents));

  RETURN jsonb_build_object('ok', TRUE, 'order_id', v_order_id, 'item_id', p_item_id,
                            'price_cents', v_item.buy_now_cents);
END;
$$;

REVOKE ALL ON FUNCTION claim_item_now(UUID, UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_item_now(UUID, UUID, NUMERIC) TO service_role;

-- ----------------------------------------------------------------
-- close_due_auction_items: closes open items past their (extended) end in
-- live auctions. Winner -> 'sold' + 'won' outbox row; no bids -> 'unsold'.
-- Moves an auction to 'closed' once none of its items are open.
-- Returns the items it closed.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION close_due_auction_items(p_limit INTEGER DEFAULT 50)
RETURNS SETOF auction_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item     auction_items%ROWTYPE;
  v_closed   auction_items%ROWTYPE;
  v_auctions UUID[] := '{}';
BEGIN
  FOR v_item IN
    SELECT i.*
      FROM auction_items i
      JOIN auctions a ON a.id = i.auction_id
     WHERE i.status = 'open'
       AND a.status = 'live'
       AND COALESCE(i.ends_at, a.ends_at) <= now()
     ORDER BY COALESCE(i.ends_at, a.ends_at)
     LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 500))
     FOR UPDATE OF i SKIP LOCKED
  LOOP
    IF v_item.sale_mode = 'fixed' THEN
      UPDATE auction_items
         SET status            = CASE WHEN quantity_sold > 0 THEN 'sold' ELSE 'unsold' END,
             buy_now_available = FALSE,
             closed_at         = now(),
             updated_at        = now()
       WHERE id = v_item.id
      RETURNING * INTO v_closed;
    ELSIF v_item.leader_bidder_id IS NOT NULL
          AND (v_item.reserve_cents IS NULL OR v_item.current_price_cents >= v_item.reserve_cents) THEN
      UPDATE auction_items
         SET status            = 'sold',
             winning_bidder_id = leader_bidder_id,
             final_price_cents = current_price_cents,
             sold_via          = 'auction',
             buy_now_available = FALSE,
             closed_at         = now(),
             updated_at        = now()
       WHERE id = v_item.id
      RETURNING * INTO v_closed;

      INSERT INTO auction_outbox (auction_id, item_id, bidder_id, kind, payload)
      VALUES (v_closed.auction_id, v_closed.id, v_closed.winning_bidder_id, 'won',
              jsonb_build_object('item_title', v_closed.title, 'price_cents', v_closed.final_price_cents));
    ELSIF v_item.leader_bidder_id IS NOT NULL THEN
      -- Top bid is below the hidden reserve: the promoter decides (resolve_reserve_item).
      UPDATE auction_items
         SET status            = 'reserve_not_met',
             buy_now_available = FALSE,
             closed_at         = now(),
             updated_at        = now()
       WHERE id = v_item.id
      RETURNING * INTO v_closed;

      INSERT INTO auction_outbox (auction_id, item_id, kind, payload)
      VALUES (v_closed.auction_id, v_closed.id, 'reserve_not_met',
              jsonb_build_object('item_title', v_closed.title, 'top_bid_cents', v_closed.current_price_cents));
    ELSE
      UPDATE auction_items
         SET status            = 'unsold',
             buy_now_available = FALSE,
             closed_at         = now(),
             updated_at        = now()
       WHERE id = v_item.id
      RETURNING * INTO v_closed;
    END IF;

    v_auctions := array_append(v_auctions, v_item.auction_id);
    RETURN NEXT v_closed;
  END LOOP;

  IF cardinality(v_auctions) > 0 THEN
    UPDATE auctions a
       SET status = 'closed', closed_at = now(), updated_at = now()
     WHERE a.id = ANY (v_auctions)
       AND a.status = 'live'
       AND NOT EXISTS (SELECT 1 FROM auction_items i WHERE i.auction_id = a.id AND i.status = 'open');
  END IF;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION close_due_auction_items(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION close_due_auction_items(INTEGER) TO service_role;

-- ----------------------------------------------------------------
-- settle_auction: one combined order per winning bidder (idempotent).
-- Design: the platform fee RATE is passed in and snapshotted on each order;
-- the cent amounts (tax, processing fee, total, application fee) are
-- computed in the backend (Stripe Tax is needed) and stored with
-- set_auction_order_amounts() before the charge.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION settle_auction(
  p_auction_id           UUID,
  p_platform_fee_rate    NUMERIC,
  p_payment_grace_hours  INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now      TIMESTAMPTZ := now();
  v_auction  auctions%ROWTYPE;
  v_bidder   auction_bidders%ROWTYPE;
  v_winner   UUID;
  v_subtotal BIGINT;
  v_order_id UUID;
  v_grace    INTEGER;
  v_created  INTEGER := 0;
  v_skipped  INTEGER := 0;
  v_total    BIGINT := 0;
BEGIN
  IF p_platform_fee_rate IS NULL OR p_platform_fee_rate < 0 OR p_platform_fee_rate > 0.2 THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_rate');
  END IF;

  PERFORM 1 FROM auction_items WHERE auction_id = p_auction_id FOR UPDATE;
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'auction_not_found');
  END IF;
  IF v_auction.status NOT IN ('live', 'closed', 'settled') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'auction_not_settleable');
  END IF;
  IF EXISTS (SELECT 1 FROM auction_items WHERE auction_id = p_auction_id AND status = 'open') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'items_still_open');
  END IF;
  IF EXISTS (SELECT 1 FROM auction_items WHERE auction_id = p_auction_id AND status = 'reserve_not_met') THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'items_awaiting_decision');
  END IF;

  v_grace := COALESCE(p_payment_grace_hours, v_auction.payment_grace_hours);

  FOR v_winner IN
    SELECT DISTINCT i.winning_bidder_id
      FROM auction_items i
     WHERE i.auction_id = p_auction_id
       AND i.status = 'sold'
       AND i.winning_bidder_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM auction_order_items oi WHERE oi.item_id = i.id)
  LOOP
    SELECT * INTO v_bidder FROM auction_bidders WHERE id = v_winner;

    SELECT SUM(i.final_price_cents) INTO v_subtotal
      FROM auction_items i
     WHERE i.auction_id = p_auction_id
       AND i.status = 'sold'
       AND i.winning_bidder_id = v_winner
       AND NOT EXISTS (SELECT 1 FROM auction_order_items oi WHERE oi.item_id = i.id);

    v_order_id := NULL;
    INSERT INTO auction_orders (
      auction_id, public_event_id, promoter_account_id, bidder_id, kind, status,
      buyer_name, buyer_email, buyer_phone, auction_title, event_title, org_name, org_ein,
      subtotal_cents, platform_fee_rate, pay_by_at, next_charge_at
    ) VALUES (
      v_auction.id, v_auction.public_event_id, v_auction.promoter_account_id, v_winner, 'settlement', 'pending',
      v_bidder.display_name, v_bidder.email, v_bidder.phone_e164, v_auction.title,
      v_auction.event_title, v_auction.org_name, v_auction.org_ein,
      v_subtotal::INTEGER, p_platform_fee_rate, v_now + make_interval(hours => v_grace), v_now
    )
    ON CONFLICT (auction_id, bidder_id) WHERE kind = 'settlement' DO NOTHING
    RETURNING id INTO v_order_id;

    IF v_order_id IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO auction_order_items (order_id, item_id, title, lot_number, price_cents, fair_market_value_cents, tax_code)
    SELECT v_order_id, i.id, i.title, i.lot_number, i.final_price_cents, i.fair_market_value_cents, i.tax_code
      FROM auction_items i
     WHERE i.auction_id = p_auction_id
       AND i.status = 'sold'
       AND i.winning_bidder_id = v_winner
       AND NOT EXISTS (SELECT 1 FROM auction_order_items oi WHERE oi.item_id = i.id);

    INSERT INTO auction_outbox (auction_id, order_id, bidder_id, kind, payload)
    VALUES (v_auction.id, v_order_id, v_winner, 'order_created',
            jsonb_build_object('kind', 'settlement', 'subtotal_cents', v_subtotal));

    v_created := v_created + 1;
    v_total := v_total + v_subtotal;
  END LOOP;

  UPDATE auctions
     SET status     = 'settled',
         closed_at  = COALESCE(closed_at, v_now),
         settled_at = COALESCE(settled_at, v_now),
         updated_at = v_now
   WHERE id = p_auction_id;

  INSERT INTO auction_audit (auction_id, actor_type, action, entity_type, entity_id, details)
  VALUES (p_auction_id, 'system', 'auction_settled', 'auction', p_auction_id::text,
          jsonb_build_object('orders_created', v_created, 'bidders_skipped', v_skipped,
                             'subtotal_cents', v_total, 'platform_fee_rate', p_platform_fee_rate));

  RETURN jsonb_build_object('ok', TRUE, 'orders_created', v_created,
                            'bidders_skipped', v_skipped, 'subtotal_cents', v_total);
END;
$$;

REVOKE ALL ON FUNCTION settle_auction(UUID, NUMERIC, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION settle_auction(UUID, NUMERIC, INTEGER) TO service_role;

-- ----------------------------------------------------------------
-- set_auction_order_amounts: stores the backend-computed tax/fee numbers.
-- Table CHECKs enforce total = subtotal + tax + processing + platform fee
-- and application fee = platform fee + processing + tax.
-- Returns FALSE when the order is unknown or no longer chargeable.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_auction_order_amounts(
  p_order_id              UUID,
  p_tax_cents             INTEGER,
  p_processing_fee_cents  INTEGER,
  p_platform_fee_cents    INTEGER,
  p_total_cents           INTEGER,
  p_application_fee_cents INTEGER,
  p_tax_calculation_id    TEXT DEFAULT NULL,
  p_tax_jurisdiction      JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auction_orders
     SET tax_cents             = p_tax_cents,
         processing_fee_cents  = p_processing_fee_cents,
         platform_fee_cents    = p_platform_fee_cents,
         total_cents           = p_total_cents,
         application_fee_cents = p_application_fee_cents,
         tax_calculation_id    = p_tax_calculation_id,
         tax_jurisdiction      = p_tax_jurisdiction,
         updated_at            = now()
   WHERE id = p_order_id
     AND status IN ('pending', 'charging', 'failed', 'requires_action');
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION set_auction_order_amounts(UUID, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION set_auction_order_amounts(UUID, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, JSONB)
  TO service_role;

-- ----------------------------------------------------------------
-- claim_orders_for_charge: first defaults orders past their pay-by time,
-- then claims due orders (SKIP LOCKED) for the charge worker. A claim
-- stuck in 'charging' for 15 minutes is handed out again WITHOUT bumping
-- charge_attempts, so a Stripe idempotency key built from
-- (order id, charge_attempts) stays stable across crash recovery.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_orders_for_charge(p_limit INTEGER DEFAULT 20)
RETURNS SETOF auction_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH overdue AS (
    UPDATE auction_orders
       SET status = 'defaulted', claimed_at = NULL, updated_at = now()
     WHERE status IN ('pending', 'failed', 'requires_action')
       AND pay_by_at <= now()
    RETURNING id, auction_id, bidder_id
  )
  INSERT INTO auction_outbox (auction_id, order_id, bidder_id, kind, payload)
  SELECT auction_id, id, bidder_id, 'payment_defaulted', '{}'::jsonb FROM overdue;

  RETURN QUERY
  WITH picked AS (
    SELECT o.id
      FROM auction_orders o
     WHERE (o.status IN ('pending', 'failed') AND o.next_charge_at <= now() AND o.pay_by_at > now())
        OR (o.status = 'charging' AND o.claimed_at < now() - interval '15 minutes')
     ORDER BY o.next_charge_at
     LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 100))
     FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE auction_orders o
       SET charge_attempts = o.charge_attempts + CASE WHEN o.status = 'charging' THEN 0 ELSE 1 END,
           status          = 'charging',
           claimed_at      = now(),
           updated_at      = now()
      FROM picked
     WHERE o.id = picked.id
    RETURNING o.*
  )
  SELECT * FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION claim_orders_for_charge(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_orders_for_charge(INTEGER) TO service_role;

-- ----------------------------------------------------------------
-- mark_auction_order_paid: idempotent; TRUE only for the call that flips
-- the order to 'paid' (webhook retries get FALSE). Model: mark_sponsorship_paid.
-- A late payment on a 'defaulted' order is still recorded.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_auction_order_paid(
  p_order_id              UUID,
  p_payment_intent        TEXT,
  p_amount_received_cents INTEGER,
  p_tax_transaction_id    TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order auction_orders%ROWTYPE;
BEGIN
  UPDATE auction_orders
     SET status                   = 'paid',
         paid_at                  = now(),
         stripe_payment_intent_id = p_payment_intent,
         amount_received_cents    = p_amount_received_cents,
         tax_transaction_id       = COALESCE(p_tax_transaction_id, tax_transaction_id),
         claimed_at               = NULL,
         last_error_code          = NULL,
         last_error_message       = NULL,
         updated_at               = now()
   WHERE id = p_order_id AND status NOT IN ('paid', 'refunded')
  RETURNING * INTO v_order;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF p_amount_received_cents IS DISTINCT FROM v_order.total_cents THEN
    INSERT INTO auction_audit (auction_id, actor_type, action, entity_type, entity_id, details)
    VALUES (v_order.auction_id, 'webhook', 'amount_mismatch', 'order', v_order.id::text,
            jsonb_build_object('expected_cents', v_order.total_cents, 'received_cents', p_amount_received_cents));
  END IF;

  INSERT INTO auction_outbox (auction_id, order_id, bidder_id, kind, payload)
  VALUES (v_order.auction_id, v_order.id, v_order.bidder_id, 'payment_succeeded',
          jsonb_build_object('total_cents', v_order.total_cents));

  INSERT INTO auction_audit (auction_id, actor_type, action, entity_type, entity_id, details)
  VALUES (v_order.auction_id, 'webhook', 'order_paid', 'order', v_order.id::text,
          jsonb_build_object('amount_received_cents', p_amount_received_cents));

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION mark_auction_order_paid(UUID, TEXT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_auction_order_paid(UUID, TEXT, INTEGER, TEXT) TO service_role;

-- ----------------------------------------------------------------
-- mark_auction_order_failed: records a failed charge attempt. Returns the
-- new status ('failed' | 'requires_action' | 'defaulted'), or NULL when
-- the order is unknown or not in a chargeable state.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_auction_order_failed(
  p_order_id            UUID,
  p_error_code          TEXT,
  p_error_message       TEXT,
  p_requires_action     BOOLEAN DEFAULT FALSE,
  p_retry_after_seconds INTEGER DEFAULT 21600
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order  auction_orders%ROWTYPE;
  v_status TEXT;
BEGIN
  SELECT * INTO v_order FROM auction_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.status NOT IN ('pending', 'charging', 'failed', 'requires_action') THEN
    RETURN NULL;
  END IF;

  v_status := CASE
    WHEN v_order.pay_by_at <= now() THEN 'defaulted'
    WHEN COALESCE(p_requires_action, FALSE) THEN 'requires_action'
    ELSE 'failed'
  END;

  UPDATE auction_orders
     SET status             = v_status,
         claimed_at         = NULL,
         last_error_code    = left(p_error_code, 100),
         last_error_message = left(p_error_message, 500),
         next_charge_at     = now() + make_interval(secs => GREATEST(COALESCE(p_retry_after_seconds, 21600), 60)),
         updated_at         = now()
   WHERE id = p_order_id;

  INSERT INTO auction_outbox (auction_id, order_id, bidder_id, kind, payload)
  VALUES (v_order.auction_id, v_order.id, v_order.bidder_id,
          CASE WHEN v_status = 'defaulted' THEN 'payment_defaulted' ELSE 'payment_failed' END,
          jsonb_build_object('status', v_status, 'requires_action', COALESCE(p_requires_action, FALSE)));

  INSERT INTO auction_audit (auction_id, actor_type, action, entity_type, entity_id, details)
  VALUES (v_order.auction_id, 'system', 'order_charge_failed', 'order', v_order.id::text,
          jsonb_build_object('status', v_status, 'code', left(p_error_code, 100),
                             'attempt', v_order.charge_attempts));

  RETURN v_status;
END;
$$;

REVOKE ALL ON FUNCTION mark_auction_order_failed(UUID, TEXT, TEXT, BOOLEAN, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_auction_order_failed(UUID, TEXT, TEXT, BOOLEAN, INTEGER) TO service_role;

-- ----------------------------------------------------------------
-- claim_auction_outbox: hands pending notifications to one worker at a
-- time (SKIP LOCKED). The worker then sets status 'sent' or 'failed'
-- (with next_attempt_at) on each row. A claim stuck in 'processing' for
-- 10 minutes is handed out again.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_auction_outbox(p_limit INTEGER DEFAULT 50)
RETURNS SETOF auction_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT o.id
      FROM auction_outbox o
     WHERE (o.status = 'pending' AND o.next_attempt_at <= now())
        OR (o.status = 'processing' AND o.locked_at < now() - interval '10 minutes')
     ORDER BY o.id
     LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200))
     FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE auction_outbox o
       SET status = 'processing', attempts = o.attempts + 1, locked_at = now()
      FROM picked
     WHERE o.id = picked.id
    RETURNING o.*
  )
  SELECT * FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION claim_auction_outbox(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_auction_outbox(INTEGER) TO service_role;

-- ----------------------------------------------------------------
-- resolve_reserve_item: the promoter accepts the top bid below reserve
-- (item becomes 'sold' to the leader) or declines it ('unsold').
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_reserve_item(p_item_id UUID, p_accept BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item auction_items%ROWTYPE;
BEGIN
  SELECT * INTO v_item FROM auction_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND OR v_item.status <> 'reserve_not_met' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_pending_decision');
  END IF;

  IF COALESCE(p_accept, FALSE) AND v_item.leader_bidder_id IS NOT NULL THEN
    UPDATE auction_items
       SET status = 'sold', winning_bidder_id = leader_bidder_id,
           final_price_cents = current_price_cents, sold_via = 'auction', updated_at = now()
     WHERE id = p_item_id;
    INSERT INTO auction_outbox (auction_id, item_id, bidder_id, kind, payload)
    VALUES (v_item.auction_id, p_item_id, v_item.leader_bidder_id, 'won',
            jsonb_build_object('item_title', v_item.title, 'price_cents', v_item.current_price_cents));
  ELSE
    UPDATE auction_items SET status = 'unsold', updated_at = now() WHERE id = p_item_id;
  END IF;

  INSERT INTO auction_audit (auction_id, actor_type, action, entity_type, entity_id, details)
  VALUES (v_item.auction_id, 'promoter', CASE WHEN COALESCE(p_accept, FALSE) THEN 'reserve_accepted' ELSE 'reserve_declined' END,
          'item', p_item_id::text, jsonb_build_object('top_bid_cents', v_item.current_price_cents));

  RETURN jsonb_build_object('ok', TRUE, 'accepted', COALESCE(p_accept, FALSE) AND v_item.leader_bidder_id IS NOT NULL);
END;
$$;

REVOKE ALL ON FUNCTION resolve_reserve_item(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION resolve_reserve_item(UUID, BOOLEAN) TO service_role;

-- ----------------------------------------------------------------
-- claim_fixed_item: buy a fixed-price item (quantity-limited). Creates its
-- own immediate order (kind 'buy_now'); amounts are filled by set_auction_order_amounts.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_fixed_item(
  p_item_id           UUID,
  p_bidder_id         UUID,
  p_quantity          INTEGER,
  p_platform_fee_rate NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now       TIMESTAMPTZ := now();
  v_bidder    auction_bidders%ROWTYPE;
  v_item      auction_items%ROWTYPE;
  v_auction   auctions%ROWTYPE;
  v_end       TIMESTAMPTZ;
  v_bought    INTEGER;
  v_subtotal  INTEGER;
  v_order_id  UUID;
BEGIN
  IF p_platform_fee_rate IS NULL OR p_platform_fee_rate < 0 OR p_platform_fee_rate > 0.2 THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_rate');
  END IF;
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 100 THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'invalid_request');
  END IF;

  SELECT * INTO v_bidder FROM auction_bidders WHERE id = p_bidder_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'bidder_not_found');
  END IF;

  SELECT * INTO v_item FROM auction_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND OR v_item.auction_id <> v_bidder.auction_id THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'item_not_found');
  END IF;
  IF v_item.sale_mode <> 'fixed' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'not_a_fixed_item');
  END IF;

  SELECT * INTO v_auction FROM auctions WHERE id = v_item.auction_id;
  IF v_auction.status <> 'live' OR (v_auction.starts_at IS NOT NULL AND v_auction.starts_at > v_now) THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'auction_not_live');
  END IF;

  v_end := COALESCE(v_item.ends_at, v_auction.ends_at);
  IF v_item.status <> 'open' OR v_end IS NULL OR v_end <= v_now THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'item_closed');
  END IF;

  IF v_bidder.blocked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'bidder_blocked');
  END IF;
  IF v_bidder.email_verified_at IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'email_not_verified');
  END IF;
  IF v_bidder.phone_verified_at IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'phone_not_verified');
  END IF;
  IF v_bidder.card_status <> 'ready' THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'card_not_ready');
  END IF;

  IF v_item.quantity - v_item.quantity_sold < p_quantity THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'insufficient_quantity',
                              'remaining', v_item.quantity - v_item.quantity_sold);
  END IF;

  IF v_item.per_bidder_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(oi.quantity), 0) INTO v_bought
      FROM auction_order_items oi
      JOIN auction_orders o ON o.id = oi.order_id
     WHERE oi.item_id = p_item_id AND o.bidder_id = p_bidder_id AND o.status <> 'cancelled';
    IF v_bought + p_quantity > v_item.per_bidder_limit THEN
      RETURN jsonb_build_object('ok', FALSE, 'code', 'per_bidder_limit', 'limit', v_item.per_bidder_limit);
    END IF;
  END IF;

  v_subtotal := v_item.fixed_price_cents * p_quantity;
  IF v_subtotal > v_bidder.exposure_limit_cents THEN
    RETURN jsonb_build_object('ok', FALSE, 'code', 'exposure_limit',
                              'exposure_limit_cents', v_bidder.exposure_limit_cents);
  END IF;

  UPDATE auction_items
     SET quantity_sold = quantity_sold + p_quantity,
         status        = CASE WHEN quantity_sold + p_quantity >= quantity THEN 'sold' ELSE status END,
         closed_at     = CASE WHEN quantity_sold + p_quantity >= quantity THEN v_now ELSE closed_at END,
         updated_at    = v_now
   WHERE id = p_item_id;

  INSERT INTO auction_orders (
    auction_id, public_event_id, promoter_account_id, bidder_id, kind, status,
    buyer_name, buyer_email, buyer_phone, auction_title, event_title, org_name, org_ein,
    subtotal_cents, platform_fee_rate, pay_by_at, next_charge_at
  ) VALUES (
    v_auction.id, v_auction.public_event_id, v_auction.promoter_account_id, p_bidder_id, 'buy_now', 'pending',
    v_bidder.display_name, v_bidder.email, v_bidder.phone_e164, v_auction.title,
    v_auction.event_title, v_auction.org_name, v_auction.org_ein,
    v_subtotal, p_platform_fee_rate,
    v_now + make_interval(hours => v_auction.payment_grace_hours), v_now
  )
  RETURNING id INTO v_order_id;

  INSERT INTO auction_order_items (order_id, item_id, title, lot_number, sale_mode, quantity, price_cents,
                                   fair_market_value_cents, tax_code)
  VALUES (v_order_id, p_item_id, v_item.title, v_item.lot_number, 'fixed', p_quantity, v_subtotal,
          v_item.fair_market_value_cents * p_quantity, v_item.tax_code);

  INSERT INTO auction_outbox (auction_id, item_id, order_id, bidder_id, kind, payload)
  VALUES (v_auction.id, p_item_id, v_order_id, p_bidder_id, 'order_created',
          jsonb_build_object('kind', 'fixed', 'subtotal_cents', v_subtotal, 'quantity', p_quantity));

  RETURN jsonb_build_object('ok', TRUE, 'order_id', v_order_id, 'item_id', p_item_id,
                            'subtotal_cents', v_subtotal, 'quantity', p_quantity);
END;
$$;

REVOKE ALL ON FUNCTION claim_fixed_item(UUID, UUID, INTEGER, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_fixed_item(UUID, UUID, INTEGER, NUMERIC) TO service_role;

NOTIFY pgrst, 'reload schema';
