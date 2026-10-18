import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SupabaseModule } from '../../supabase/supabase.module';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuctionBiddingModule } from './auction-bidding.module';
import { BidderAuthService } from './bidder-auth.service';
import { AUCTION_ID, makeBiddingDb } from './fake-supabase.testutil';
import type { Row } from './fake-supabase.testutil';

// messaging.module imports `.js` specifiers jest cannot resolve; swap in a module exposing the real TwilioService.
jest.mock('../../messaging/messaging.module', () => {
  const { Module } = jest.requireActual('@nestjs/common');
  const { ConfigModule } = jest.requireActual('@nestjs/config');
  const { TwilioService } = jest.requireActual(
    '../../messaging/twilio.service',
  );
  class MessagingModule {}
  Module({
    imports: [ConfigModule],
    providers: [TwilioService],
    exports: [TwilioService],
  })(MessagingModule);
  return { MessagingModule };
});

const ITEM_ID = '44444444-4444-4444-8444-444444444444';
const RESERVE = 123_457;

function item(): Row {
  return {
    id: ITEM_ID,
    auction_id: AUCTION_ID,
    lot_number: 1,
    sale_mode: 'auction',
    title: 'Weekend Getaway',
    description: null,
    category: null,
    donor_name: null,
    image_urls: [],
    fair_market_value_cents: 80_000,
    sort_order: 1,
    starting_bid_cents: 10_000,
    reserve_cents: RESERVE,
    increment_cents: null,
    buy_now_cents: null,
    buy_now_available: false,
    fixed_price_cents: null,
    quantity: 1,
    quantity_sold: 0,
    per_bidder_limit: null,
    status: 'open',
    current_price_cents: 20_000,
    leader_bidder_id: 'leader-secret-id',
    bid_count: 4,
    ends_at: null,
  };
}

describe('AuctionPublicController (HTTP)', () => {
  const env = { ...process.env };
  let app: INestApplication;

  async function boot(
    tables: Record<string, Row[]> = {},
    rpc: Record<string, (args: Row) => unknown> = {},
  ) {
    const db = makeBiddingDb(
      { auction_items: [item()], ...tables },
      rpc as never,
    );
    const moduleRef = await Test.createTestingModule({
      imports: [SupabaseModule, AuctionBiddingModule],
    })
      .overrideProvider(SupabaseService)
      .useValue(db.asService())
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    return db;
  }

  beforeEach(() => {
    process.env.AUCTION_SESSION_SECRET = 'h'.repeat(40);
    process.env.AUCTIONS_ENABLED = 'true';
  });
  afterEach(async () => {
    process.env = { ...env };
    await app?.close();
  });

  describe('feature flag', () => {
    it.each([
      ['unset', undefined],
      ['false', 'false'],
      ['TRUE', 'TRUE'],
      ['1', '1'],
    ])(
      'answers 404 on every public route when AUCTIONS_ENABLED is %s',
      async (_n, value) => {
        if (value === undefined) delete process.env.AUCTIONS_ENABLED;
        else process.env.AUCTIONS_ENABLED = value;
        await boot();
        const http = request(app.getHttpServer());
        const id = AUCTION_ID;
        const gets = [
          '/auctions/public',
          `/auctions/public/${id}`,
          `/auctions/public/${id}/state`,
          `/auctions/public/items/${ITEM_ID}`,
          '/auctions/public/bidder/me',
          '/auctions/public/bidder/orders',
        ];
        for (const path of gets) {
          expect((await http.get(path)).status).toBe(404);
        }
        const posts = [
          `/auctions/public/${id}/register/start`,
          `/auctions/public/${id}/register/verify`,
          `/auctions/public/${id}/register/resend`,
          `/auctions/public/${id}/login/start`,
          `/auctions/public/${id}/login/verify`,
          `/auctions/public/items/${ITEM_ID}/bids`,
          `/auctions/public/items/${ITEM_ID}/buy-now`,
          `/auctions/public/items/${ITEM_ID}/purchase`,
        ];
        for (const path of posts) {
          expect((await http.post(path).send({})).status).toBe(404);
        }
      },
    );

    it('serves the routes when AUCTIONS_ENABLED=true', async () => {
      await boot();
      const res = await request(app.getHttpServer()).get('/auctions/public');
      expect(res.status).toBe(200);
      expect(res.body.auctions).toHaveLength(1);
    });
  });

  describe('public reads', () => {
    it('serves the polling state without leaking the reserve or leader', async () => {
      await boot();
      const res = await request(app.getHttpServer()).get(
        `/auctions/public/${AUCTION_ID}/state`,
      );
      expect(res.status).toBe(200);
      expect(res.body.now).toEqual(expect.any(String));
      expect(res.body.items[0]).toMatchObject({
        id: ITEM_ID,
        bid_count: 4,
        reserve_met: false,
      });
      expect(res.text).not.toContain('reserve_cents');
      expect(res.text).not.toContain(String(RESERVE));
      expect(res.text).not.toContain('leader-secret-id');
    });

    it('answers 404 for malformed ids', async () => {
      await boot();
      const res = await request(app.getHttpServer()).get(
        '/auctions/public/not-a-uuid/state',
      );
      expect(res.status).toBe(404);
    });

    it('ignores an invalid bidder token on the polling endpoint', async () => {
      await boot();
      const res = await request(app.getHttpServer())
        .get(`/auctions/public/${AUCTION_ID}/state`)
        .set('x-auction-token', 'garbage');
      expect(res.status).toBe(200);
      expect(res.body.items[0]).not.toHaveProperty('you_are_leading');
    });
  });

  describe('bidder routes', () => {
    it('require a valid bidder token', async () => {
      await boot();
      const http = request(app.getHttpServer());
      expect((await http.get('/auctions/public/bidder/me')).status).toBe(401);
      expect(
        (
          await http
            .post(`/auctions/public/items/${ITEM_ID}/bids`)
            .set('x-auction-token', 'garbage')
            .send({ amountCents: 11_000 })
        ).status,
      ).toBe(401);
    });
  });

  describe('bidding over HTTP', () => {
    const BIDDER_ID = '22222222-2222-4222-8222-222222222222';

    it('places a bid with a valid token and answers 200', async () => {
      const db = await boot(
        {
          auction_bidders: [
            {
              id: BIDDER_ID,
              auction_id: AUCTION_ID,
              token_version: 0,
              blocked_at: null,
            },
          ],
        },
        {
          place_auction_bid: () => ({
            ok: true,
            outcome: 'leading',
            current_price_cents: 21_000,
            leader_bidder_id: BIDDER_ID,
            your_max_cents: 21_000,
            you_are_leading: true,
            min_next_bid_cents: 22_000,
            bid_count: 5,
            ends_at: '2026-10-18T00:00:00.000Z',
            extended: false,
            reserve_met: false,
            buy_now_available: false,
          }),
        },
      );
      const { token } = await app
        .get(BidderAuthService)
        .issueToken(BIDDER_ID, AUCTION_ID);
      const res = await request(app.getHttpServer())
        .post(`/auctions/public/items/${ITEM_ID}/bids`)
        .set('x-auction-token', token)
        .send({ amountCents: 21_000, mode: 'manual' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true, you_are_leading: true });
      expect(res.body).not.toHaveProperty('leader_bidder_id');
      expect(db.rpcCalls).toHaveLength(1);

      const state = await request(app.getHttpServer())
        .get(`/auctions/public/${AUCTION_ID}/state`)
        .set('x-auction-token', token);
      expect(state.body.items[0]).toHaveProperty('you_are_leading', false);
    });

    it('maps a too-low bid to 409 with the minimum', async () => {
      await boot(
        {
          auction_bidders: [
            {
              id: BIDDER_ID,
              auction_id: AUCTION_ID,
              token_version: 0,
              blocked_at: null,
            },
          ],
        },
        {
          place_auction_bid: () => ({
            ok: false,
            code: 'bid_too_low',
            min_next_bid_cents: 21_000,
          }),
        },
      );
      const { token } = await app
        .get(BidderAuthService)
        .issueToken(BIDDER_ID, AUCTION_ID);
      const res = await request(app.getHttpServer())
        .post(`/auctions/public/items/${ITEM_ID}/bids`)
        .set('x-auction-token', token)
        .send({ amountCents: 100 });
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({
        code: 'bid_too_low',
        min_next_bid_cents: 21_000,
      });
    });
  });

  describe('input validation', () => {
    it('rejects registration without accepting the terms', async () => {
      await boot();
      const res = await request(app.getHttpServer())
        .post(`/auctions/public/${AUCTION_ID}/register/start`)
        .send({
          fullName: 'Pat',
          email: 'pat@example.com',
          phone: '4155550123',
          acceptTerms: false,
          smsConsent: false,
        });
      expect(res.status).toBe(400);
    });
  });

  describe('throttling', () => {
    it('applies the per-route IP limit from x-forwarded-for with 429', async () => {
      await boot();
      const http = request(app.getHttpServer());
      const path = `/auctions/public/${AUCTION_ID}/login/verify`;
      const statuses: number[] = [];
      for (let i = 0; i < 61; i++) {
        statuses.push(
          (
            await http
              .post(path)
              .set('x-forwarded-for', '198.51.100.20, 10.0.0.1')
              .send({ email: 'a@b.co', code: '123456' })
          ).status,
        );
      }
      expect(statuses.slice(0, 60).every((s) => s !== 429)).toBe(true);
      expect(statuses[60]).toBe(429);

      // Another client IP has its own budget.
      const other = await http
        .post(path)
        .set('x-forwarded-for', '198.51.100.21')
        .send({ email: 'a@b.co', code: '123456' });
      expect(other.status).not.toBe(429);
    });
  });
});
