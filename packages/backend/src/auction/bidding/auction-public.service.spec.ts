import { NotFoundException } from '@nestjs/common';
import { AuctionPublicService } from './auction-public.service';
import { toBidFeedEntry, toPublicItemState } from './dto/public-views';
import type { PublicItemSource } from './dto/public-views';
import {
  AUCTION_ID,
  liveAuctionRow,
  makeBiddingDb,
} from './fake-supabase.testutil';
import type { Row } from './fake-supabase.testutil';

const ITEM_ID = '44444444-4444-4444-8444-444444444444';
const LEADER_ID = '66666666-6666-4666-8666-666666666666';
const OTHER_ID = '77777777-7777-4777-8777-777777777777';
const RESERVE = 123_457;

const SECRETS = [
  'reserve_cents',
  String(RESERVE),
  LEADER_ID,
  'secret@bidder.com',
  'Secret Bidder Name',
  '+14155550999',
  'promoter-secret',
  'user-secret',
  'max_amount_cents',
  'tax-secret-code',
  '12-3456789',
];

function itemRow(overrides: Row = {}): Row {
  return {
    id: ITEM_ID,
    auction_id: AUCTION_ID,
    lot_number: 1,
    sale_mode: 'auction',
    title: 'Weekend Getaway',
    description: 'Two nights',
    category: 'Travel',
    donor_name: 'Acme Resorts',
    image_urls: ['https://img.example/a.webp'],
    fair_market_value_cents: 80_000,
    tax_code: 'tax-secret-code',
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
    leader_bidder_id: LEADER_ID,
    winning_bidder_id: LEADER_ID,
    bid_count: 4,
    ends_at: null,
    ...overrides,
  };
}

describe('AuctionPublicService', () => {
  function setup(tables: Record<string, Row[]> = {}) {
    const db = makeBiddingDb({
      auction_items: [itemRow()],
      ...tables,
    });
    return { db, svc: new AuctionPublicService(db.asService()) };
  }

  afterEach(() => jest.restoreAllMocks());

  describe('listAuctions', () => {
    it('lists only live/upcoming auctions of verified non-profits, without internals', async () => {
      const { svc } = setup({
        auctions: [
          liveAuctionRow(),
          liveAuctionRow({
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            title: 'Unverified org',
            promoter_accounts: {
              is_nonprofit: true,
              nonprofit_status: 'pending',
            },
          }),
          liveAuctionRow({
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            title: 'Draft',
            status: 'draft',
          }),
          liveAuctionRow({
            id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            title: 'Over',
            ends_at: new Date(Date.now() - 1000).toISOString(),
          }),
        ],
      });
      const result = await svc.listAuctions();
      expect(result.auctions.map((a) => a.title)).toEqual(['Spring Gala']);
      expect(result.auctions[0].item_count).toBe(1);
      const json = JSON.stringify(result);
      for (const secret of ['promoter-secret', 'user-secret', '12-3456789']) {
        expect(json).not.toContain(secret);
      }
    });
  });

  describe('getAuction', () => {
    it('returns the auction with item summaries and no reserve or leader', async () => {
      const { svc } = setup({
        auction_items: [
          itemRow(),
          itemRow({ id: 'withdrawn-1', status: 'withdrawn' }),
        ],
      });
      const result = await svc.getAuction(AUCTION_ID);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: ITEM_ID,
        current_price_cents: 20_000,
        bid_count: 4,
        min_next_bid_cents: 21_000,
        reserve_met: false,
        buy_now_available: false,
      });
      const json = JSON.stringify(result);
      for (const secret of SECRETS) expect(json).not.toContain(secret);
    });

    it('404s for a draft auction or one whose promoter is not a verified non-profit', async () => {
      await expect(
        setup({
          auctions: [liveAuctionRow({ status: 'draft' })],
        }).svc.getAuction(AUCTION_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        setup({
          auctions: [
            liveAuctionRow({
              promoter_accounts: {
                is_nonprofit: false,
                nonprofit_status: null,
              },
            }),
          ],
        }).svc.getAuction(AUCTION_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getState', () => {
    it('returns per-item state, server time, reserve_met only, and no leader', async () => {
      const { svc } = setup();
      const state = await svc.getState(AUCTION_ID, null);
      expect(new Date(state.now).getTime()).toBeLessThan(Date.now() + 1000);
      expect(state.items).toEqual([
        {
          id: ITEM_ID,
          status: 'open',
          current_price_cents: 20_000,
          bid_count: 4,
          ends_at: expect.any(String),
          min_next_bid_cents: 21_000,
          reserve_met: false,
          buy_now_available: false,
          quantity_remaining: null,
        },
      ]);
      const json = JSON.stringify(state);
      for (const secret of SECRETS) expect(json).not.toContain(secret);
      expect(json).not.toContain('you_are_leading');
    });

    it('reports reserve_met true once the price reaches the reserve', async () => {
      const { svc } = setup({
        auction_items: [itemRow({ current_price_cents: RESERVE })],
      });
      const state = await svc.getState(AUCTION_ID, null);
      expect(state.items[0].reserve_met).toBe(true);
      expect(JSON.stringify(state)).not.toContain('reserve_cents');
    });

    it('reports reserve_met false below the reserve without revealing the amount', async () => {
      const { svc } = setup({
        auction_items: [
          itemRow({ current_price_cents: 20_000, reserve_cents: 90_000 }),
        ],
      });
      const state = await svc.getState(AUCTION_ID, null);
      expect(state.items[0].reserve_met).toBe(false);
      expect(JSON.stringify(state)).not.toContain('90000');
    });

    it('adds you_are_leading only for the matching bidder of this auction', async () => {
      const { svc } = setup();
      const leader = await svc.getState(AUCTION_ID, {
        bidderId: LEADER_ID,
        auctionId: AUCTION_ID,
      });
      expect(leader.items[0]).toMatchObject({ you_are_leading: true });
      const other = await svc.getState(AUCTION_ID, {
        bidderId: OTHER_ID,
        auctionId: AUCTION_ID,
      });
      expect(other.items[0]).toMatchObject({ you_are_leading: false });
      const wrongAuction = await svc.getState(AUCTION_ID, {
        bidderId: LEADER_ID,
        auctionId: 'some-other-auction',
      });
      expect(wrongAuction.items[0]).not.toHaveProperty('you_are_leading');
      expect(JSON.stringify(leader)).not.toContain(LEADER_ID);
    });

    it('shows buy-now only before the first bid and for open auction items', async () => {
      const { svc } = setup({
        auction_items: [
          itemRow({
            id: 'i-a',
            bid_count: 0,
            current_price_cents: 0,
            leader_bidder_id: null,
            buy_now_available: true,
            buy_now_cents: 50_000,
          }),
          itemRow({
            id: 'i-b',
            buy_now_available: true,
            buy_now_cents: 50_000,
          }),
        ],
      });
      const { items } = await svc.getState(AUCTION_ID, null);
      expect(items.map((i) => i.buy_now_available)).toEqual([true, false]);
      expect(items[0].min_next_bid_cents).toBe(10_000);
    });

    it('serves a 1-second micro-cache for the anonymous part', async () => {
      const { svc, db } = setup();
      let now = 1_000_000;
      jest.spyOn(Date, 'now').mockImplementation(() => now);
      const itemQueries = () =>
        db.queries.filter((q) => q.table === 'auction_items').length;

      await svc.getState(AUCTION_ID, null);
      await svc.getState(AUCTION_ID, null);
      expect(itemQueries()).toBe(1);

      db.table('auction_items')[0].current_price_cents = 21_000;
      now += 500;
      expect(
        (await svc.getState(AUCTION_ID, null)).items[0].current_price_cents,
      ).toBe(20_000);

      now += 600;
      expect(
        (await svc.getState(AUCTION_ID, null)).items[0].current_price_cents,
      ).toBe(21_000);
      expect(itemQueries()).toBe(2);
    });

    it('shares one query between concurrent callers', async () => {
      const { svc, db } = setup();
      await Promise.all(
        Array.from({ length: 10 }, () => svc.getState(AUCTION_ID, null)),
      );
      expect(
        db.queries.filter((q) => q.table === 'auction_items'),
      ).toHaveLength(1);
    });

    it('does not cache a 404', async () => {
      const { svc, db } = setup({ auctions: [] });
      await expect(svc.getState(AUCTION_ID, null)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      db.table('auctions').push(liveAuctionRow());
      await expect(svc.getState(AUCTION_ID, null)).resolves.toBeDefined();
    });
  });

  describe('getItem', () => {
    const bidRows = (): Row[] => [
      {
        id: 3,
        item_id: ITEM_ID,
        bidder_id: LEADER_ID,
        amount_cents: 20_000,
        max_amount_cents: 99_999,
        kind: 'manual',
        created_at: '2026-10-17T10:03:00.000Z',
        bidder: { paddle_number: 47 },
        email: 'secret@bidder.com',
        display_name: 'Secret Bidder Name',
        phone_e164: '+14155550999',
      },
      {
        id: 2,
        item_id: ITEM_ID,
        bidder_id: OTHER_ID,
        amount_cents: 15_000,
        max_amount_cents: 15_000,
        kind: 'proxy_auto',
        created_at: '2026-10-17T10:02:00.000Z',
        bidder: { paddle_number: 12 },
      },
      {
        id: 1,
        item_id: 'other-item',
        bidder_id: OTHER_ID,
        amount_cents: 1,
        created_at: '2026-10-17T10:01:00.000Z',
        bidder: { paddle_number: 3 },
      },
    ];

    it('returns an anonymized newest-first bid feed', async () => {
      const { svc } = setup({ auction_bids: bidRows() });
      const result = await svc.getItem(ITEM_ID);
      expect(result.bids).toEqual([
        {
          id: 3,
          bidder_label: 'Bidder 47',
          amount_cents: 20_000,
          created_at: '2026-10-17T10:03:00.000Z',
        },
        {
          id: 2,
          bidder_label: 'Bidder 12',
          amount_cents: 15_000,
          created_at: '2026-10-17T10:02:00.000Z',
        },
      ]);
    });

    it('leaks no names, emails, phones, bidder ids, max bids, reserve or winner', async () => {
      const { svc } = setup({ auction_bids: bidRows() });
      const json = JSON.stringify(await svc.getItem(ITEM_ID));
      for (const secret of SECRETS) expect(json).not.toContain(secret);
      expect(json).not.toContain('99999');
      expect(json).not.toContain('winning');
      expect(json).not.toContain('bidder_id');
    });

    it('404s for withdrawn items and items of hidden auctions', async () => {
      await expect(
        setup({
          auction_items: [itemRow({ status: 'withdrawn' })],
        }).svc.getItem(ITEM_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        setup({
          auctions: [liveAuctionRow({ status: 'cancelled' })],
        }).svc.getItem(ITEM_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(setup().svc.getItem('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('public view mappers', () => {
    it('toBidFeedEntry falls back to a bare label without a paddle', () => {
      expect(
        toBidFeedEntry({
          id: 1,
          amount_cents: 100,
          created_at: 'x',
          bidder: { paddle_number: null },
        }).bidder_label,
      ).toBe('Bidder');
    });

    it('toPublicItemState shows remaining quantity for fixed-price items', () => {
      const state = toPublicItemState(
        itemRow({
          sale_mode: 'fixed',
          starting_bid_cents: null,
          fixed_price_cents: 5_000,
          quantity: 10,
          quantity_sold: 4,
          reserve_cents: null,
          bid_count: 0,
          current_price_cents: 0,
        }) as unknown as PublicItemSource,
      );
      expect(state.quantity_remaining).toBe(6);
      expect(state.min_next_bid_cents).toBeNull();
      expect(state.buy_now_available).toBe(false);
    });

    it('never emits a closed item as biddable', () => {
      const state = toPublicItemState(
        itemRow({ status: 'sold' }) as unknown as PublicItemSource,
      );
      expect(state.min_next_bid_cents).toBeNull();
    });
  });
});
