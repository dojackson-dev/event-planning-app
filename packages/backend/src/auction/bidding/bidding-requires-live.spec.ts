import { readFileSync } from 'fs';
import { join } from 'path';
import { HttpException } from '@nestjs/common';
import { AuctionBiddingService } from './auction-bidding.service';
import type { BidderContext } from './bidder.guard';
import { parsePlaceBid } from './dto/bid.dto';
import {
  AUCTION_ID,
  liveAuctionRow,
  makeBiddingDb,
} from './fake-supabase.testutil';
import type { Row } from './fake-supabase.testutil';

/**
 * Draft and scheduled auctions can now be publicly visible (page_published) and show items with
 * a minimum next bid. Bidding must still be impossible unless the auction status is 'live'.
 * The status gate lives in the database functions that every bid/purchase goes through.
 */
const BIDDER: BidderContext = {
  bidderId: '22222222-2222-4222-8222-222222222222',
  auctionId: AUCTION_ID,
};
const ITEM_ID = '44444444-4444-4444-8444-444444444444';

const FUNCTIONS_SQL = readFileSync(
  join(__dirname, '../../../migrations/create-auction-functions.sql'),
  'utf8',
);

function functionBody(name: string): string {
  const start = FUNCTIONS_SQL.indexOf(`CREATE OR REPLACE FUNCTION ${name}(`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = FUNCTIONS_SQL.indexOf('CREATE OR REPLACE FUNCTION', start + 10);
  return FUNCTIONS_SQL.slice(start, next === -1 ? undefined : next);
}

describe('bidding requires a live auction', () => {
  it.each(['place_auction_bid', 'claim_item_now', 'claim_fixed_item'])(
    '%s rejects any auction whose status is not live',
    (fn) => {
      const body = functionBody(fn);
      const gate = body.indexOf("v_auction.status <> 'live'");
      expect(gate).toBeGreaterThan(-1);
      expect(body.slice(gate, gate + 300)).toContain("'auction_not_live'");
      // The gate must run before any write.
      const firstWrite = body.search(/\b(INSERT INTO|UPDATE auction)/);
      expect(firstWrite === -1 || gate < firstWrite).toBe(true);
    },
  );

  function setup(status: 'draft' | 'scheduled') {
    const db = makeBiddingDb(
      {
        auctions: [
          liveAuctionRow({
            status,
            page_published: true,
            accepts_donations: true,
            starts_at: null,
            ends_at: null,
          }),
        ],
        auction_items: [
          {
            id: ITEM_ID,
            auction_id: AUCTION_ID,
            sale_mode: 'auction',
            status: 'open',
            current_price_cents: 0,
            starting_bid_cents: 1_000,
            bid_count: 0,
          },
        ],
      },
      {
        // Stands in for the SQL functions' status gate.
        place_auction_bid: () => ({ ok: false, code: 'auction_not_live' }),
        claim_item_now: () => ({ ok: false, code: 'auction_not_live' }),
        claim_fixed_item: () => ({ ok: false, code: 'auction_not_live' }),
      },
    );
    return { db, svc: new AuctionBiddingService(db.asService()) };
  }

  async function rejection(promise: Promise<unknown>) {
    const err = (await promise.then(
      () => {
        throw new Error('expected a rejection');
      },
      (e: unknown) => e,
    )) as HttpException;
    return { status: err.getStatus(), body: err.getResponse() as Row };
  }

  it.each(['draft', 'scheduled'] as const)(
    'maps the database refusal on a publicly visible %s auction to 410 and writes nothing',
    async (status) => {
      const { db, svc } = setup(status);
      const bid = await rejection(
        svc.placeBid(
          BIDDER,
          ITEM_ID,
          parsePlaceBid({ amountCents: 1_500, mode: 'manual' }),
        ),
      );
      expect(bid).toMatchObject({
        status: 410,
        body: { code: 'auction_not_live' },
      });
      const buy = await rejection(svc.buyNow(BIDDER, ITEM_ID));
      expect(buy).toMatchObject({
        status: 410,
        body: { code: 'auction_not_live' },
      });
      const purchase = await rejection(svc.purchase(BIDDER, ITEM_ID, 1));
      expect(purchase).toMatchObject({
        status: 410,
        body: { code: 'auction_not_live' },
      });

      // Every attempt goes through the gated database functions; the service never writes directly.
      expect(db.rpcCalls.map((c) => c.name)).toEqual([
        'place_auction_bid',
        'claim_item_now',
        'claim_fixed_item',
      ]);
      expect(db.queries.filter((q) => q.op !== 'select')).toEqual([]);
    },
  );
});
