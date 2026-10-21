import { HttpException } from '@nestjs/common';
import type { AuctionOrderCharger } from '../auction-ports';
import {
  AuctionBiddingService,
  BID_RATE_LIMIT_PER_MINUTE,
  largeBidThresholdCents,
} from './auction-bidding.service';
import type { BidderContext } from './bidder.guard';
import { parsePlaceBid } from './dto/bid.dto';
import { AUCTION_ID, makeBiddingDb } from './fake-supabase.testutil';
import type { Row } from './fake-supabase.testutil';

const BIDDER: BidderContext = {
  bidderId: '22222222-2222-4222-8222-222222222222',
  auctionId: AUCTION_ID,
};
const ITEM_ID = '44444444-4444-4444-8444-444444444444';
const ORDER_ID = '88888888-8888-4888-8888-888888888888';

const okBid = {
  ok: true,
  outcome: 'leading',
  current_price_cents: 11_000,
  leader_bidder_id: BIDDER.bidderId,
  your_max_cents: 11_000,
  you_are_leading: true,
  min_next_bid_cents: 12_000,
  bid_count: 1,
  ends_at: '2026-10-18T00:00:00.000Z',
  extended: false,
  reserve_met: true,
  buy_now_available: false,
};

function item(overrides: Row = {}): Row {
  return {
    id: ITEM_ID,
    auction_id: AUCTION_ID,
    sale_mode: 'auction',
    status: 'open',
    current_price_cents: 10_000,
    starting_bid_cents: 10_000,
    bid_count: 0,
    ...overrides,
  };
}

async function failure(promise: Promise<unknown>) {
  const err = await promise.then(
    () => {
      throw new Error('expected a rejection');
    },
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(HttpException);
  const http = err as HttpException;
  return { status: http.getStatus(), body: http.getResponse() as Row };
}

describe('AuctionBiddingService', () => {
  function setup(opts: {
    rpc?: Record<string, (args: Row) => unknown>;
    tables?: Record<string, Row[]>;
    charger?: AuctionOrderCharger;
  }) {
    const db = makeBiddingDb(
      { auction_items: [item()], ...(opts.tables ?? {}) },
      opts.rpc as never,
    );
    return {
      db,
      svc: new AuctionBiddingService(db.asService(), opts.charger),
    };
  }
  const bid = (amountCents: number, extra: Row = {}) =>
    parsePlaceBid({ amountCents, mode: 'manual', ...extra });

  describe('placeBid RPC result mapping', () => {
    it('returns the RPC JSON on success, without the leader id', async () => {
      const { svc, db } = setup({ rpc: { place_auction_bid: () => okBid } });
      const result = await svc.placeBid(BIDDER, ITEM_ID, bid(11_000));
      expect(result).toMatchObject({
        ok: true,
        outcome: 'leading',
        current_price_cents: 11_000,
        you_are_leading: true,
        min_next_bid_cents: 12_000,
        reserve_met: true,
        extended: false,
      });
      expect(result).not.toHaveProperty('leader_bidder_id');
      expect(db.rpcCalls[0]).toEqual({
        name: 'place_auction_bid',
        args: {
          p_item_id: ITEM_ID,
          p_bidder_id: BIDDER.bidderId,
          p_amount_cents: 11_000,
          p_mode: 'manual',
        },
      });
    });

    it('passes max mode through', async () => {
      const { svc, db } = setup({ rpc: { place_auction_bid: () => okBid } });
      await svc.placeBid(BIDDER, ITEM_ID, bid(50_000, { mode: 'max' }));
      expect(db.rpcCalls[0].args.p_mode).toBe('max');
    });

    it.each([
      ['bid_too_low', 409, { min_next_bid_cents: 12_000 }],
      ['max_not_raised', 409, { your_max_cents: 11_000 }],
      ['item_closed', 410, {}],
      ['auction_not_live', 410, {}],
      ['bidder_blocked', 403, {}],
      ['email_not_verified', 403, {}],
      ['phone_not_verified', 403, {}],
      ['card_not_ready', 403, {}],
      ['exposure_limit', 403, { exposure_limit_cents: 500_000 }],
      ['invalid_request', 400, {}],
      ['not_an_auction_item', 400, {}],
      ['item_not_found', 404, {}],
      ['bidder_not_found', 401, {}],
    ])('maps %s to HTTP %i', async (code, status, extras) => {
      const { svc } = setup({
        rpc: { place_auction_bid: () => ({ ok: false, code, ...extras }) },
      });
      const { status: got, body } = await failure(
        svc.placeBid(BIDDER, ITEM_ID, bid(11_000)),
      );
      expect(got).toBe(status);
      expect(body.code).toBe(code);
      for (const [key, value] of Object.entries(extras)) {
        expect(body[key]).toBe(value);
      }
    });

    it('turns unknown RPC codes into a generic 500 without leaking them', async () => {
      const { svc } = setup({
        rpc: {
          place_auction_bid: () => ({ ok: false, code: 'weird_db_state' }),
        },
      });
      const { status, body } = await failure(
        svc.placeBid(BIDDER, ITEM_ID, bid(11_000)),
      );
      expect(status).toBe(500);
      expect(JSON.stringify(body)).not.toContain('weird_db_state');
    });

    it('answers 503 when the RPC itself errors', async () => {
      const { svc } = setup({
        rpc: { place_auction_bid: () => ({ error: { message: 'db down' } }) },
      });
      const { status } = await failure(
        svc.placeBid(BIDDER, ITEM_ID, bid(11_000)),
      );
      expect(status).toBe(503);
    });
  });

  describe('safety checks', () => {
    it('computes the confirmation threshold as max($2,500, 2x price)', () => {
      expect(largeBidThresholdCents(10_000)).toBe(250_000);
      expect(largeBidThresholdCents(200_000)).toBe(400_000);
    });

    it('requires confirmLargeBid above $2,500 on a cheap item', async () => {
      const { svc, db } = setup({ rpc: { place_auction_bid: () => okBid } });
      const { status, body } = await failure(
        svc.placeBid(BIDDER, ITEM_ID, bid(250_001)),
      );
      expect(status).toBe(409);
      expect(body).toMatchObject({
        code: 'large_bid_confirmation_required',
        confirm_above_cents: 250_000,
      });
      expect(db.rpcCalls).toHaveLength(0);

      await expect(
        svc.placeBid(BIDDER, ITEM_ID, bid(250_001, { confirmLargeBid: true })),
      ).resolves.toMatchObject({ ok: true });
      expect(db.rpcCalls).toHaveLength(1);
    });

    it('allows up to the threshold without confirmation', async () => {
      const { svc } = setup({ rpc: { place_auction_bid: () => okBid } });
      await expect(
        svc.placeBid(BIDDER, ITEM_ID, bid(250_000)),
      ).resolves.toMatchObject({ ok: true });
    });

    it('uses 2x the current price when that is higher than $2,500', async () => {
      const { svc, db } = setup({
        rpc: { place_auction_bid: () => okBid },
        tables: {
          auction_items: [item({ current_price_cents: 200_000, bid_count: 3 })],
        },
      });
      await expect(
        svc.placeBid(BIDDER, ITEM_ID, bid(400_000)),
      ).resolves.toMatchObject({ ok: true });
      const { body } = await failure(
        svc.placeBid(BIDDER, ITEM_ID, bid(400_001)),
      );
      expect(body.confirm_above_cents).toBe(400_000);
      expect(db.rpcCalls).toHaveLength(1);
    });

    it('rejects an item from another auction as not found', async () => {
      const { svc, db } = setup({
        tables: { auction_items: [item({ auction_id: 'someone-elses' })] },
      });
      const { status } = await failure(
        svc.placeBid(BIDDER, ITEM_ID, bid(11_000)),
      );
      expect(status).toBe(404);
      expect(db.rpcCalls).toHaveLength(0);
    });

    it('rejects bids on fixed-price items', async () => {
      const { svc } = setup({
        tables: { auction_items: [item({ sale_mode: 'fixed' })] },
      });
      const { status, body } = await failure(
        svc.placeBid(BIDDER, ITEM_ID, bid(11_000)),
      );
      expect(status).toBe(400);
      expect(body.code).toBe('not_an_auction_item');
    });

    it('limits a bidder to 20 recorded manual bids per minute from the database', async () => {
      const recent = (i: number, kind = 'manual'): Row => ({
        id: i,
        bidder_id: BIDDER.bidderId,
        kind,
        created_at: new Date().toISOString(),
      });
      const manual = Array.from({ length: BID_RATE_LIMIT_PER_MINUTE }, (_, i) =>
        recent(i),
      );
      const { svc, db } = setup({
        rpc: { place_auction_bid: () => okBid },
        tables: { auction_bids: manual },
      });
      const { status, body } = await failure(
        svc.placeBid(BIDDER, ITEM_ID, bid(11_000)),
      );
      expect(status).toBe(429);
      expect(body.code).toBe('rate_limited');
      expect(db.rpcCalls).toHaveLength(0);
    });

    it('ignores proxy_auto rows, old rows and other bidders in the rate window', async () => {
      const rows: Row[] = [
        ...Array.from({ length: 25 }, (_, i) => ({
          id: i,
          bidder_id: BIDDER.bidderId,
          kind: 'proxy_auto',
          created_at: new Date().toISOString(),
        })),
        ...Array.from({ length: 25 }, (_, i) => ({
          id: 100 + i,
          bidder_id: BIDDER.bidderId,
          kind: 'manual',
          created_at: new Date(Date.now() - 120_000).toISOString(),
        })),
        ...Array.from({ length: 25 }, (_, i) => ({
          id: 200 + i,
          bidder_id: 'other',
          kind: 'manual',
          created_at: new Date().toISOString(),
        })),
      ];
      const { svc } = setup({
        rpc: { place_auction_bid: () => okBid },
        tables: { auction_bids: rows },
      });
      await expect(
        svc.placeBid(BIDDER, ITEM_ID, bid(11_000)),
      ).resolves.toMatchObject({ ok: true });
    });

    it('throttles a flood of rejected attempts in-process', async () => {
      const { svc } = setup({
        rpc: {
          place_auction_bid: () => ({ ok: false, code: 'bid_too_low' }),
        },
      });
      let limited = 0;
      for (let i = 0; i < 40; i++) {
        try {
          await svc.placeBid(BIDDER, ITEM_ID, bid(11_000));
        } catch (e) {
          if ((e as HttpException).getStatus() === 429) limited++;
        }
      }
      expect(limited).toBe(10);
    });
  });

  describe('bid input parsing', () => {
    it('defaults to manual mode and rejects bad input', () => {
      expect(parsePlaceBid({ amountCents: 500 })).toEqual({
        amountCents: 500,
        mode: 'manual',
        confirmLargeBid: false,
      });
      for (const bad of [
        {},
        { amountCents: 0 },
        { amountCents: -5 },
        { amountCents: 10.5 },
        { amountCents: '500' },
        { amountCents: 10_000_001 },
        { amountCents: 500, mode: 'proxy' },
        { amountCents: 500, confirmLargeBid: 'yes' },
        null,
        [],
      ]) {
        expect(() => parsePlaceBid(bad)).toThrow();
      }
    });
  });

  describe('buy now and fixed purchase', () => {
    const charger = (outcome: Row | Error): AuctionOrderCharger => ({
      chargeOrderNow: jest.fn(() =>
        outcome instanceof Error
          ? Promise.reject(outcome)
          : Promise.resolve(outcome as never),
      ),
      retryCharge: jest.fn(),
      sendPayLink: jest.fn(),
    });
    const claimed = {
      ok: true,
      order_id: ORDER_ID,
      item_id: ITEM_ID,
      price_cents: 50_000,
    };

    it('claims with the non-profit fee rate and returns the charge outcome', async () => {
      const c = charger({
        orderId: ORDER_ID,
        status: 'requires_action',
        payUrl: 'https://pay.example/x',
      });
      const { svc, db } = setup({
        rpc: { claim_item_now: () => claimed },
        charger: c,
      });
      const result = await svc.buyNow(BIDDER, ITEM_ID);
      expect(db.rpcCalls[0]).toEqual({
        name: 'claim_item_now',
        args: {
          p_item_id: ITEM_ID,
          p_bidder_id: BIDDER.bidderId,
          p_platform_fee_rate: 0.015,
        },
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(c.chargeOrderNow).toHaveBeenCalledWith(ORDER_ID);
      expect(result).toEqual({
        ok: true,
        order_id: ORDER_ID,
        item_id: ITEM_ID,
        price_cents: 50_000,
        charge: {
          orderId: ORDER_ID,
          status: 'requires_action',
          payUrl: 'https://pay.example/x',
        },
      });
    });

    it('still returns the created order when no charger is wired', async () => {
      const { svc } = setup({ rpc: { claim_item_now: () => claimed } });
      await expect(svc.buyNow(BIDDER, ITEM_ID)).resolves.toMatchObject({
        order_id: ORDER_ID,
        charge: null,
      });
    });

    it('keeps the order and reports pending when the charger throws', async () => {
      const { svc } = setup({
        rpc: { claim_item_now: () => claimed },
        charger: charger(new Error('stripe down')),
      });
      await expect(svc.buyNow(BIDDER, ITEM_ID)).resolves.toMatchObject({
        order_id: ORDER_ID,
        charge: { orderId: ORDER_ID, status: 'pending' },
      });
    });

    it.each([
      ['bidding_started', 409],
      ['buy_now_unavailable', 409],
      ['card_not_ready', 403],
      ['item_closed', 410],
      ['exposure_limit', 403],
    ])(
      'maps buy-now failure %s to %i and never charges',
      async (code, status) => {
        const c = charger({ orderId: ORDER_ID, status: 'paid' });
        const { svc } = setup({
          rpc: { claim_item_now: () => ({ ok: false, code }) },
          charger: c,
        });
        const { status: got } = await failure(svc.buyNow(BIDDER, ITEM_ID));
        expect(got).toBe(status);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(c.chargeOrderNow).not.toHaveBeenCalled();
      },
    );

    it('claims a fixed-price item with the quantity and charges', async () => {
      const c = charger({ orderId: ORDER_ID, status: 'paid' });
      const { svc, db } = setup({
        rpc: {
          claim_fixed_item: () => ({
            ok: true,
            order_id: ORDER_ID,
            item_id: ITEM_ID,
            subtotal_cents: 10_000,
            quantity: 2,
          }),
        },
        charger: c,
      });
      const result = await svc.purchase(BIDDER, ITEM_ID, 2);
      expect(db.rpcCalls[0].args).toEqual({
        p_item_id: ITEM_ID,
        p_bidder_id: BIDDER.bidderId,
        p_quantity: 2,
        p_platform_fee_rate: 0.015,
      });
      expect(result).toMatchObject({
        quantity: 2,
        subtotal_cents: 10_000,
        charge: { status: 'paid' },
      });
    });

    it.each([
      ['insufficient_quantity', 409, { remaining: 1 }],
      ['per_bidder_limit', 409, { limit: 2 }],
      ['not_a_fixed_item', 400, {}],
    ])('maps fixed purchase failure %s', async (code, status, extras) => {
      const { svc } = setup({
        rpc: { claim_fixed_item: () => ({ ok: false, code, ...extras }) },
      });
      const { status: got, body } = await failure(
        svc.purchase(BIDDER, ITEM_ID, 3),
      );
      expect(got).toBe(status);
      for (const [k, v] of Object.entries(extras)) expect(body[k]).toBe(v);
    });
  });

  describe('bidder reads', () => {
    it('returns only whitelisted order fields', async () => {
      const { svc } = setup({
        tables: {
          auction_orders: [
            {
              id: ORDER_ID,
              bidder_id: BIDDER.bidderId,
              kind: 'buy_now',
              status: 'paid',
              auction_title: 'Spring Gala',
              event_title: null,
              subtotal_cents: 50_000,
              tax_cents: 0,
              processing_fee_cents: 1_800,
              platform_fee_cents: 750,
              total_cents: 52_550,
              paid_at: '2026-10-17T10:00:00.000Z',
              pay_by_at: '2026-10-20T10:00:00.000Z',
              created_at: '2026-10-17T09:00:00.000Z',
              stripe_payment_intent_id: 'pi_secret',
              last_error_message: 'card_declined_secret',
              application_fee_cents: 2_550,
              pay_token_hash: 'hash_secret',
              buyer_email: 'me@example.com',
              items: [
                {
                  title: 'Getaway',
                  lot_number: 1,
                  quantity: 1,
                  price_cents: 50_000,
                  tax_code: 'secret',
                },
              ],
            },
            { id: 'not-mine', bidder_id: 'someone-else', created_at: 'x' },
          ],
        },
      });
      const { orders } = await svc.getOrders(BIDDER);
      expect(orders).toHaveLength(1);
      expect(orders[0].items).toEqual([
        { title: 'Getaway', lot_number: 1, quantity: 1, price_cents: 50_000 },
      ]);
      const json = JSON.stringify(orders);
      for (const secret of [
        'pi_secret',
        'card_declined_secret',
        'hash_secret',
        'me@example.com',
        'application_fee',
        'tax_code',
      ]) {
        expect(json).not.toContain(secret);
      }
    });

    it('reports status, paddle, card and exposure without contact details', async () => {
      const { svc } = setup({
        tables: {
          auction_bidders: [
            {
              id: BIDDER.bidderId,
              display_name: 'Pat',
              paddle_number: 47,
              email: 'pat@example.com',
              phone_e164: '+14155550123',
              email_verified_at: 'x',
              phone_verified_at: 'x',
              card_status: 'ready',
              card_brand: 'visa',
              card_last4: '4242',
              exposure_limit_cents: 500_000,
              blocked_at: null,
              sms_consent: true,
            },
          ],
          auction_proxy_bids: [
            {
              bidder_id: BIDDER.bidderId,
              max_amount_cents: 30_000,
              item: { status: 'open' },
            },
            {
              bidder_id: BIDDER.bidderId,
              max_amount_cents: 99_000,
              item: { status: 'sold' },
            },
          ],
          auction_items: [
            item({
              id: 'won-unpaid',
              status: 'sold',
              winning_bidder_id: BIDDER.bidderId,
              final_price_cents: 20_000,
            }),
            item({
              id: 'won-paid',
              status: 'sold',
              winning_bidder_id: BIDDER.bidderId,
              final_price_cents: 70_000,
            }),
            item({
              id: 'leading',
              leader_bidder_id: BIDDER.bidderId,
              current_price_cents: 12_000,
              ends_at: '2026-10-18T00:00:00.000Z',
            }),
          ],
          auction_order_items: [
            {
              item_id: 'won-paid',
              order: { status: 'paid', bidder_id: BIDDER.bidderId },
            },
          ],
        },
      });
      const me = await svc.getMe(BIDDER);
      expect(me.bidder).toMatchObject({
        paddle_number: 47,
        paddle_label: 'Bidder 47',
        email_verified: true,
        phone_verified: true,
        verified: true,
        card_status: 'ready',
        can_bid: true,
        blocked: false,
      });
      expect(me.exposure).toEqual({
        limit_cents: 500_000,
        standing_bids_cents: 30_000,
        unpaid_wins_cents: 20_000,
        remaining_cents: 450_000,
      });
      expect(me.leading_items).toEqual([
        {
          id: 'leading',
          current_price_cents: 12_000,
          ends_at: '2026-10-18T00:00:00.000Z',
        },
      ]);
      const json = JSON.stringify(me);
      expect(json).not.toContain('pat@example.com');
      expect(json).not.toContain('+14155550123');
    });

    it('cannot bid until the card is ready', async () => {
      const { svc } = setup({
        tables: {
          auction_bidders: [
            {
              id: BIDDER.bidderId,
              display_name: 'Pat',
              paddle_number: 1,
              email_verified_at: 'x',
              phone_verified_at: null,
              card_status: 'none',
              exposure_limit_cents: 500_000,
              blocked_at: null,
              sms_consent: false,
            },
          ],
        },
      });
      const me = await svc.getMe(BIDDER);
      expect(me.bidder.can_bid).toBe(false);
      expect(me.bidder.verified).toBe(false);
    });
  });
});
