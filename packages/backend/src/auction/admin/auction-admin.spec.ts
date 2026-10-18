import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PromoterAccessService } from '../../promoter-team/promoter-access.service';
import { SupabaseService } from '../../supabase/supabase.service';
import type { AuctionOrderCharger } from '../auction-ports';
import { AuctionAdminController } from './auction-admin.controller';
import { AuctionAdminService } from './auction-admin.service';
import { AuctionReportsService } from './auction-reports.service';

type Row = Record<string, any>;

/** Tiny in-memory stand-in for the Supabase query builder (eq/neq/in/is/not/lt + CRUD). */
function makeDb(
  seed: Record<string, Row[]>,
  rpcs: Record<string, (args: Row) => unknown> = {},
) {
  const tables: Record<string, Row[]> = {};
  for (const [k, v] of Object.entries(seed))
    tables[k] = v.map((r) => ({ ...r }));
  let seq = 1;

  const from = (table: string) => {
    tables[table] ??= [];
    const filters: Array<(r: Row) => boolean> = [];
    let op = 'select';
    let payload: any;
    let head = false;
    let limitN: number | undefined;
    let rangeTo: number | undefined;
    const b: any = {
      select: (_c?: string, opts?: { head?: boolean }) => {
        if (opts?.head) head = true;
        return b;
      },
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), b),
      neq: (c: string, v: unknown) => (filters.push((r) => r[c] !== v), b),
      in: (c: string, vs: unknown[]) => (
        filters.push((r) => vs.includes(r[c])),
        b
      ),
      is: (c: string, v: unknown) => (filters.push((r) => r[c] === v), b),
      not: (c: string, _o: string, v: unknown) => (
        filters.push((r) => r[c] !== v),
        b
      ),
      lt: (c: string, v: string) => (
        filters.push((r) => r[c] != null && r[c] < v),
        b
      ),
      order: () => b,
      limit: (n: number) => ((limitN = n), b),
      range: (_f: number, t: number) => ((rangeTo = t), b),
      insert: (p: unknown) => ((op = 'insert'), (payload = p), b),
      update: (p: unknown) => ((op = 'update'), (payload = p), b),
      delete: () => ((op = 'delete'), b),
    };
    const run = (mode: 'list' | 'maybe' | 'single') => {
      let rows: Row[];
      if (op === 'insert') {
        rows = (Array.isArray(payload) ? payload : [payload]).map((p: Row) => ({
          id: `gen-${seq++}`,
          ...p,
        }));
        tables[table].push(...rows);
      } else {
        rows = tables[table].filter((r) => filters.every((f) => f(r)));
        if (op === 'update') rows.forEach((r) => Object.assign(r, payload));
        if (op === 'delete') {
          tables[table] = tables[table].filter((r) => !rows.includes(r));
        }
      }
      const count = rows.length;
      if (limitN !== undefined) rows = rows.slice(0, limitN);
      if (rangeTo !== undefined) rows = rows.slice(0, rangeTo + 1);
      if (mode === 'list') {
        return {
          data: head ? null : rows.map((r) => ({ ...r })),
          error: null,
          count,
        };
      }
      return { data: rows[0] ? { ...rows[0] } : null, error: null };
    };
    b.maybeSingle = () => Promise.resolve(run('maybe'));
    b.single = () => Promise.resolve(run('single'));
    b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(run('list')).then(res, rej);
    return b;
  };

  const rpc = (name: string, args: Row) =>
    Promise.resolve({ data: rpcs[name]?.(args) ?? null, error: null });

  return { tables, rpc, from };
}

const hours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const EVENT_ID = '11111111-1111-4111-8111-111111111111';

const promoterRow = (over: Row = {}): Row => ({
  id: 'promoter-1',
  user_id: 'user-1',
  company_name: 'Acme Events',
  is_nonprofit: true,
  nonprofit_status: 'verified',
  nonprofit_legal_name: 'Helping Hands',
  nonprofit_ein: '123456789',
  stripe_account_id: 'acct_1',
  stripe_connect_status: 'active',
  ...over,
});
const otherPromoter = promoterRow({ id: 'promoter-2', user_id: 'user-2' });
const auctionRow = (over: Row = {}): Row => ({
  id: 'auction-1',
  promoter_account_id: 'promoter-1',
  title: 'Gala',
  status: 'draft',
  starts_at: null,
  ends_at: hours(48),
  hard_close_at: hours(50),
  public_event_id: null,
  ...over,
});
const itemRow = (over: Row = {}): Row => ({
  id: 'item-1',
  auction_id: 'auction-1',
  sale_mode: 'auction',
  title: 'Gift basket',
  status: 'open',
  fair_market_value_cents: 5000,
  starting_bid_cents: 1000,
  reserve_cents: null,
  increment_cents: null,
  buy_now_cents: null,
  buy_now_available: false,
  fixed_price_cents: null,
  quantity: 1,
  quantity_sold: 0,
  per_bidder_limit: null,
  bid_count: 0,
  current_price_cents: 0,
  ...over,
});
const orderRow = (over: Row = {}): Row => ({
  id: 'order-1',
  auction_id: 'auction-1',
  promoter_account_id: 'promoter-1',
  bidder_id: 'bidder-1',
  status: 'failed',
  subtotal_cents: 10_000,
  total_cents: 10_500,
  ...over,
});
const bidderRow = (over: Row = {}): Row => ({
  id: 'bidder-1',
  auction_id: 'auction-1',
  paddle_number: 7,
  blocked_at: null,
  blocked_reason: null,
  ...over,
});

function setup(
  seed: Record<string, Row[]> = {},
  opts: {
    charger?: AuctionOrderCharger;
    rpcs?: Record<string, (args: Row) => unknown>;
  } = {},
) {
  const db = makeDb(
    {
      promoter_accounts: [promoterRow(), otherPromoter],
      auctions: [auctionRow()],
      ...seed,
    },
    opts.rpcs,
  );
  const supabase = { getAdminClient: () => db } as unknown as SupabaseService;
  const service = new AuctionAdminService(supabase, opts.charger);
  return { db, supabase, service };
}

const auditActions = (db: ReturnType<typeof makeDb>) =>
  (db.tables.auction_audit ?? []).map((r) => r.action);

describe('AuctionAdminService ownership', () => {
  it("returns 404 for another promoter's auction, item, order and bidder", async () => {
    const { service } = setup({
      auction_items: [itemRow()],
      auction_orders: [orderRow()],
      auction_bidders: [bidderRow()],
    });
    // user-2 owns a different promoter account
    await expect(
      service.getAuction('user-2', 'auction-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.updateItem('user-2', 'item-1', { title: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.deleteItem('user-2', 'item-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.withdrawItem('user-2', 'item-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.markPaidOffline('user-2', 'order-1', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.cancelOrder('user-2', 'order-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.blockBidder('user-2', 'bidder-1', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.publishAuction('user-2', 'auction-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an event that belongs to another promoter', async () => {
    const { service } = setup({
      public_events: [
        { id: EVENT_ID, promoter_account_id: 'promoter-2', title: 'x' },
      ],
    });
    await expect(
      service.createAuction('user-1', {
        title: 'Gala',
        public_event_id: EVENT_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("only lists the caller's auctions", async () => {
    const { service } = setup({
      auctions: [
        auctionRow(),
        auctionRow({ id: 'auction-2', promoter_account_id: 'promoter-2' }),
      ],
    });
    const list = await service.listAuctions('user-1');
    expect(list.map((a) => a.id)).toEqual(['auction-1']);
  });
});

describe('AuctionAdminService create', () => {
  it('snapshots org and event, defaults hard close to ends_at + 120 min, and audits', async () => {
    const endsAt = hours(72);
    const { service, db } = setup({
      public_events: [
        {
          id: EVENT_ID,
          promoter_account_id: 'promoter-1',
          title: 'Spring Gala',
          event_date: '2026-12-01',
        },
      ],
    });
    const created = await service.createAuction('user-1', {
      title: '  Gala Auction ',
      public_event_id: EVENT_ID,
      ends_at: endsAt,
    });
    expect(created).toMatchObject({
      title: 'Gala Auction',
      status: 'draft',
      org_name: 'Helping Hands',
      org_ein: '123456789',
      event_title: 'Spring Gala',
      event_date: '2026-12-01',
      created_by_user_id: 'user-1',
    });
    expect(new Date(created.hard_close_at!).getTime()).toBe(
      new Date(endsAt).getTime() + 120 * 60_000,
    );
    expect(db.tables.auction_audit[0]).toMatchObject({
      actor_type: 'promoter',
      actor_id: 'user-1',
      action: 'auction_created',
    });
  });

  it('validates numbers and dates', async () => {
    const { service } = setup();
    await expect(
      service.createAuction('user-1', { title: '' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createAuction('user-1', { title: 'x', payment_grace_hours: 1.5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createAuction('user-1', {
        title: 'x',
        default_exposure_limit_cents: 1e12,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createAuction('user-1', { title: 'x', ends_at: 'nope' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createAuction('user-1', {
        title: 'x',
        starts_at: hours(5),
        ends_at: hours(2),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AuctionAdminService publish gate', () => {
  it('blocks an unverified non-profit', async () => {
    const { service } = setup({
      promoter_accounts: [promoterRow({ nonprofit_status: 'pending' })],
      auction_items: [itemRow()],
    });
    await expect(service.publishAuction('user-1', 'auction-1')).rejects.toThrow(
      /verified non-profits/i,
    );
  });

  it('blocks when Stripe Connect is not active', async () => {
    const { service } = setup({
      promoter_accounts: [promoterRow({ stripe_connect_status: 'pending' })],
      auction_items: [itemRow()],
    });
    await expect(service.publishAuction('user-1', 'auction-1')).rejects.toThrow(
      /Stripe/i,
    );
    const none = setup({
      promoter_accounts: [promoterRow({ stripe_account_id: null })],
      auction_items: [itemRow()],
    });
    await expect(
      none.service.publishAuction('user-1', 'auction-1'),
    ).rejects.toThrow(/Stripe/i);
  });

  it('requires at least one item', async () => {
    const { service } = setup();
    await expect(service.publishAuction('user-1', 'auction-1')).rejects.toThrow(
      /at least one item/i,
    );
  });

  it('requires fair market value, a starting bid and fixed price/quantity', async () => {
    const { service } = setup({
      auction_items: [
        itemRow({ id: 'i1', title: 'No FMV', fair_market_value_cents: null }),
        itemRow({ id: 'i2', title: 'No start', starting_bid_cents: null }),
        itemRow({
          id: 'i3',
          title: 'No price',
          sale_mode: 'fixed',
          starting_bid_cents: null,
          fixed_price_cents: null,
        }),
      ],
    });
    const err = await service
      .publishAuction('user-1', 'auction-1')
      .catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.message).toMatch(/"No FMV": fair market value is required/);
    expect(err.message).toMatch(/"No start": a starting bid is required/);
    expect(err.message).toMatch(/"No price": a price is required/);
  });

  it('requires the auction to run for at least an hour', async () => {
    const { service } = setup({
      auctions: [auctionRow({ ends_at: hours(0.5) })],
      auction_items: [itemRow()],
    });
    await expect(service.publishAuction('user-1', 'auction-1')).rejects.toThrow(
      /at least 1 hour/,
    );
  });

  it('goes live when the start is in the past and scheduled when in the future', async () => {
    const live = setup({ auction_items: [itemRow()] });
    const a = await live.service.publishAuction('user-1', 'auction-1');
    expect(a.status).toBe('live');
    expect(a.starts_at).toBeTruthy();
    expect(auditActions(live.db)).toContain('auction_published');

    const sched = setup({
      auctions: [auctionRow({ starts_at: hours(2) })],
      auction_items: [itemRow()],
    });
    expect(
      (await sched.service.publishAuction('user-1', 'auction-1')).status,
    ).toBe('scheduled');
  });

  it('refuses to publish twice', async () => {
    const { service } = setup({
      auctions: [auctionRow({ status: 'live' })],
      auction_items: [itemRow()],
    });
    await expect(service.publishAuction('user-1', 'auction-1')).rejects.toThrow(
      /draft/,
    );
  });
});

describe('AuctionAdminService edit locks', () => {
  it('lets a draft auction change freely', async () => {
    const { service } = setup();
    const updated = await service.updateAuction('user-1', 'auction-1', {
      title: 'New title',
      ends_at: hours(24),
    });
    expect(updated.title).toBe('New title');
  });

  it('extends but never shortens a live auction', async () => {
    const current = hours(10);
    const { service, db } = setup({
      auctions: [
        auctionRow({
          status: 'live',
          starts_at: hours(-1),
          ends_at: current,
          hard_close_at: hours(12),
        }),
      ],
      auction_items: [
        itemRow({ ends_at: hours(10.05) }),
        itemRow({ id: 'item-2', ends_at: null }),
      ],
    });
    await expect(
      service.updateAuction('user-1', 'auction-1', { ends_at: hours(5) }),
    ).rejects.toThrow(/extended but not shortened/);

    const newEnd = hours(20);
    const updated = await service.updateAuction('user-1', 'auction-1', {
      ends_at: newEnd,
    });
    expect(updated.ends_at).toBe(newEnd);
    expect(new Date(updated.hard_close_at!).getTime()).toBe(
      new Date(newEnd).getTime() + 120 * 60_000,
    );
    // sniped item follows the extension, un-sniped item keeps following the auction (null)
    expect(db.tables.auction_items[0].ends_at).toBe(newEnd);
    expect(db.tables.auction_items[1].ends_at).toBeNull();
  });

  it('locks the start time and event once live', async () => {
    const { service } = setup({
      auctions: [auctionRow({ status: 'live', starts_at: hours(-1) })],
    });
    await expect(
      service.updateAuction('user-1', 'auction-1', { starts_at: hours(1) }),
    ).rejects.toThrow(/locked/);
  });

  it('rejects edits to a closed auction', async () => {
    const { service } = setup({ auctions: [auctionRow({ status: 'closed' })] });
    await expect(
      service.updateAuction('user-1', 'auction-1', { title: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('freezes price fields and sale mode once an item has bids', async () => {
    const { service } = setup({
      auctions: [auctionRow({ status: 'live', ends_at: hours(10) })],
      auction_items: [itemRow({ bid_count: 2, current_price_cents: 1200 })],
    });
    await expect(
      service.updateItem('user-1', 'item-1', { starting_bid_cents: 500 }),
    ).rejects.toThrow(/has bids/);
    await expect(
      service.updateItem('user-1', 'item-1', { reserve_cents: 5000 }),
    ).rejects.toThrow(/has bids/);
    await expect(
      service.updateItem('user-1', 'item-1', { buy_now_cents: 9000 }),
    ).rejects.toThrow(/has bids/);
    await expect(
      service.updateItem('user-1', 'item-1', {
        sale_mode: 'fixed',
        fixed_price_cents: 2000,
      }),
    ).rejects.toThrow(/has bids/);
    // descriptive fields and unchanged prices are still fine
    const ok = await service.updateItem('user-1', 'item-1', {
      title: 'Better title',
      starting_bid_cents: 1000,
    });
    expect(ok.title).toBe('Better title');
  });

  it("locks a fixed item's price once it has sold, and its quantity floor", async () => {
    const { service } = setup({
      auctions: [auctionRow({ status: 'live', ends_at: hours(10) })],
      auction_items: [
        itemRow({
          sale_mode: 'fixed',
          starting_bid_cents: null,
          fixed_price_cents: 2500,
          quantity: 10,
          quantity_sold: 3,
        }),
      ],
    });
    await expect(
      service.updateItem('user-1', 'item-1', { fixed_price_cents: 3000 }),
    ).rejects.toThrow(/has sales/);
    await expect(
      service.updateItem('user-1', 'item-1', { quantity: 2 }),
    ).rejects.toThrow(/already sold/);
    const ok = await service.updateItem('user-1', 'item-1', { quantity: 20 });
    expect(ok.quantity).toBe(20);
  });

  it('lets an item without bids change price and recomputes buy-it-now availability', async () => {
    const { service } = setup({ auction_items: [itemRow()] });
    const updated = await service.updateItem('user-1', 'item-1', {
      starting_bid_cents: 2000,
      buy_now_cents: 9000,
    });
    expect(updated).toMatchObject({
      starting_bid_cents: 2000,
      buy_now_cents: 9000,
      buy_now_available: true,
    });
  });

  it('refuses to delete an item with bids and asks for a withdrawal', async () => {
    const { service } = setup({ auction_items: [itemRow({ bid_count: 1 })] });
    await expect(service.deleteItem('user-1', 'item-1')).rejects.toThrow(
      /Withdraw/,
    );
    const clean = setup({ auction_items: [itemRow()] });
    await expect(clean.service.deleteItem('user-1', 'item-1')).resolves.toEqual(
      { deleted: true },
    );
    expect(clean.db.tables.auction_items).toHaveLength(0);
  });
});

describe('AuctionAdminService items', () => {
  it('requires an explicit fair market value (0 is allowed)', async () => {
    const { service } = setup();
    await expect(
      service.createItem('user-1', 'auction-1', {
        title: 'Basket',
        starting_bid_cents: 1000,
      }),
    ).rejects.toThrow(/Fair market value is required/);
    const item = await service.createItem('user-1', 'auction-1', {
      title: 'Basket',
      starting_bid_cents: 1000,
      fair_market_value_cents: 0,
    });
    expect(item).toMatchObject({
      fair_market_value_cents: 0,
      status: 'open',
      auction_id: 'auction-1',
    });
  });

  it('validates pricing relationships, images and numbers', async () => {
    const { service } = setup();
    const base = {
      title: 'Basket',
      fair_market_value_cents: 100,
      starting_bid_cents: 1000,
    };
    await expect(
      service.createItem('user-1', 'auction-1', {
        ...base,
        reserve_cents: 500,
      }),
    ).rejects.toThrow(/Reserve/);
    await expect(
      service.createItem('user-1', 'auction-1', {
        ...base,
        buy_now_cents: 1000,
      }),
    ).rejects.toThrow(/Buy-it-now/);
    await expect(
      service.createItem('user-1', 'auction-1', {
        ...base,
        starting_bid_cents: 10.5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createItem('user-1', 'auction-1', {
        ...base,
        starting_bid_cents: Infinity,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createItem('user-1', 'auction-1', {
        ...base,
        starting_bid_cents: 200_000_000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createItem('user-1', 'auction-1', {
        ...base,
        image_urls: ['http://x.test/a.webp'],
      }),
    ).rejects.toThrow(/https/);
    await expect(
      service.createItem('user-1', 'auction-1', {
        ...base,
        image_urls: Array(6).fill('https://x.test/a.webp'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createItem('user-1', 'auction-1', {
        ...base,
        fixed_price_cents: 500,
      }),
    ).rejects.toThrow(/does not apply/);
    await expect(
      service.createItem('user-1', 'auction-1', {
        title: 'Tickets',
        fair_market_value_cents: 0,
        sale_mode: 'fixed',
        quantity: 5,
      }),
    ).rejects.toThrow(/Fixed-price items need a price/);
  });

  it('creates a fixed-price item', async () => {
    const { service } = setup();
    const item = await service.createItem('user-1', 'auction-1', {
      title: 'Raffle ticket',
      sale_mode: 'fixed',
      fair_market_value_cents: 0,
      fixed_price_cents: 500,
      quantity: 100,
      per_bidder_limit: 5,
    });
    expect(item).toMatchObject({
      sale_mode: 'fixed',
      fixed_price_cents: 500,
      quantity: 100,
      starting_bid_cents: null,
      buy_now_available: false,
    });
  });

  it('withdraws an item: outbox rows for standing maxes, audit, and closes an emptied live auction', async () => {
    const { service, db } = setup({
      auctions: [auctionRow({ status: 'live', ends_at: hours(5) })],
      auction_items: [itemRow({ bid_count: 3 })],
      auction_proxy_bids: [
        { id: 'p1', item_id: 'item-1', bidder_id: 'bidder-1' },
        { id: 'p2', item_id: 'item-1', bidder_id: 'bidder-2' },
        { id: 'p3', item_id: 'other', bidder_id: 'bidder-3' },
      ],
    });
    const item = await service.withdrawItem('user-1', 'item-1');
    expect(item.status).toBe('withdrawn');
    expect(db.tables.auction_outbox.map((o) => [o.kind, o.bidder_id])).toEqual([
      ['item_withdrawn', 'bidder-1'],
      ['item_withdrawn', 'bidder-2'],
    ]);
    expect(auditActions(db)).toContain('item_withdrawn');
    expect(db.tables.auctions[0].status).toBe('closed');
    await expect(
      service.withdrawItem('user-1', 'item-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resolves a reserve through the RPC after the ownership check', async () => {
    const rpc = jest.fn().mockReturnValue({ ok: true, accepted: true });
    const { service, db } = setup(
      { auction_items: [itemRow({ status: 'reserve_not_met', bid_count: 2 })] },
      { rpcs: { resolve_reserve_item: rpc } },
    );
    await expect(
      service.resolveReserve('user-2', 'item-1', { accept: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(rpc).not.toHaveBeenCalled();
    await expect(
      service.resolveReserve('user-1', 'item-1', { accept: 'yes' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.resolveReserve('user-1', 'item-1', { accept: true }),
    ).resolves.toEqual({ accepted: true });
    expect(rpc).toHaveBeenCalledWith({ p_item_id: 'item-1', p_accept: true });
    expect(auditActions(db)).toContain('reserve_decision');

    const wrongState = setup({ auction_items: [itemRow()] });
    await expect(
      wrongState.service.resolveReserve('user-1', 'item-1', { accept: true }),
    ).rejects.toThrow(/reserve decision/);
  });
});

describe('AuctionAdminService bidders', () => {
  it('blocks and unblocks with audit rows', async () => {
    const { service, db } = setup({ auction_bidders: [bidderRow()] });
    await expect(
      service.blockBidder('user-1', 'bidder-1', { reason: ' shill bidding ' }),
    ).resolves.toEqual({ blocked: true });
    expect(db.tables.auction_bidders[0]).toMatchObject({
      blocked_reason: 'shill bidding',
    });
    expect(db.tables.auction_bidders[0].blocked_at).toBeTruthy();
    await expect(service.unblockBidder('user-1', 'bidder-1')).resolves.toEqual({
      blocked: false,
    });
    expect(db.tables.auction_bidders[0]).toMatchObject({
      blocked_at: null,
      blocked_reason: null,
    });
    expect(auditActions(db)).toEqual(['bidder_blocked', 'bidder_unblocked']);
    expect(db.tables.auction_audit[0]).toMatchObject({
      actor_type: 'promoter',
      actor_id: 'user-1',
    });
  });

  it('rejects an over-long reason', async () => {
    const { service } = setup({ auction_bidders: [bidderRow()] });
    await expect(
      service.blockBidder('user-1', 'bidder-1', { reason: 'x'.repeat(501) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AuctionAdminService orders', () => {
  it.each(['pending', 'failed', 'requires_action', 'defaulted'])(
    'marks a %s order paid offline',
    async (status) => {
      const { service, db } = setup({ auction_orders: [orderRow({ status })] });
      const order = await service.markPaidOffline('user-1', 'order-1', {
        note: 'cash at the door',
      });
      expect(order).toMatchObject({
        status: 'paid',
        amount_received_cents: 10_500,
      });
      expect(order.paid_at).toBeTruthy();
      expect(db.tables.auction_outbox[0]).toMatchObject({
        kind: 'payment_succeeded',
        order_id: 'order-1',
      });
      expect(auditActions(db)).toEqual(['order_marked_paid_offline']);
    },
  );

  it.each(['paid', 'charging', 'cancelled', 'refunded'])(
    'refuses to mark a %s order paid',
    async (status) => {
      const { service, db } = setup({ auction_orders: [orderRow({ status })] });
      await expect(
        service.markPaidOffline('user-1', 'order-1', {}),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.tables.auction_orders[0].status).toBe(status);
      expect(db.tables.auction_outbox ?? []).toHaveLength(0);
    },
  );

  it('falls back to the subtotal when the total is not set yet', async () => {
    const { service } = setup({
      auction_orders: [orderRow({ status: 'pending', total_cents: 0 })],
    });
    const order = await service.markPaidOffline('user-1', 'order-1', {});
    expect(order.amount_received_cents).toBe(10_000);
  });

  it('cancels only unpaid orders', async () => {
    const { service, db } = setup({
      auction_orders: [orderRow({ status: 'failed' })],
    });
    expect((await service.cancelOrder('user-1', 'order-1')).status).toBe(
      'cancelled',
    );
    expect(auditActions(db)).toEqual(['order_cancelled']);
    await expect(
      service.cancelOrder('user-1', 'order-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    const paid = setup({ auction_orders: [orderRow({ status: 'paid' })] });
    await expect(
      paid.service.cancelOrder('user-1', 'order-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ServiceUnavailable without a charger', async () => {
    const { service } = setup({ auction_orders: [orderRow()] });
    await expect(
      service.retryCharge('user-1', 'order-1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      service.sendPayLink('user-1', 'order-1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('delegates retry and pay link to the charger after the ownership and state checks', async () => {
    const charger: AuctionOrderCharger = {
      chargeOrderNow: jest.fn(),
      retryCharge: jest
        .fn()
        .mockResolvedValue({ orderId: 'order-1', status: 'paid' }),
      sendPayLink: jest.fn().mockResolvedValue({ sent: true }),
    };
    const { service, db } = setup(
      { auction_orders: [orderRow()] },
      { charger },
    );
    await expect(
      service.retryCharge('user-2', 'order-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(charger.retryCharge).not.toHaveBeenCalled();
    await expect(
      service.retryCharge('user-1', 'order-1'),
    ).resolves.toMatchObject({ status: 'paid' });
    await expect(service.sendPayLink('user-1', 'order-1')).resolves.toEqual({
      sent: true,
    });
    expect(auditActions(db)).toEqual([
      'order_retry_charge',
      'order_pay_link_sent',
    ]);

    const paid = setup(
      { auction_orders: [orderRow({ status: 'paid' })] },
      { charger },
    );
    await expect(
      paid.service.retryCharge('user-1', 'order-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      paid.service.sendPayLink('user-1', 'order-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AuctionAdminController policy matrix', () => {
  function controllerFor(role: 'owner' | 'admin' | 'staff') {
    const members =
      role === 'owner'
        ? []
        : [
            {
              id: 'm1',
              user_id: 'member-1',
              is_active: true,
              role,
              promoter_account_id: 'promoter-1',
              account: { user_id: 'user-1' },
            },
          ];
    const { db, service } = setup({ promoter_team_members: members });
    const callerId = role === 'owner' ? 'user-1' : 'member-1';
    const supabase = {
      getAdminClient: () => db,
      setAuthContext: () => ({
        auth: {
          getUser: () =>
            Promise.resolve({ data: { user: { id: callerId } }, error: null }),
        },
      }),
    } as unknown as SupabaseService;
    const access = new PromoterAccessService(supabase);
    const reports = new AuctionReportsService(supabase, service);
    return {
      db,
      controller: new AuctionAdminController(
        service,
        reports,
        supabase,
        access,
      ),
    };
  }

  it.each(['owner', 'admin'] as const)(
    'lets %s read and write',
    async (role) => {
      const { controller, db } = controllerFor(role);
      await expect(controller.list('Bearer t')).resolves.toHaveLength(1);
      const created = await controller.create('Bearer t', {
        title: 'New auction',
      });
      expect(created.promoter_account_id).toBe('promoter-1');
      // team admins act as the account creator
      expect(db.tables.auction_audit[0].actor_id).toBe('user-1');
    },
  );

  it('lets staff read but not write', async () => {
    const { controller, db } = controllerFor('staff');
    await expect(controller.list('Bearer t')).resolves.toHaveLength(1);
    await expect(
      controller.create('Bearer t', { title: 'x' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.publish('Bearer t', 'auction-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.markPaidOffline('Bearer t', 'order-1', {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.blockBidder('Bearer t', 'bidder-1', {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.tables.auctions).toHaveLength(1);
  });

  it('requires a bearer token', async () => {
    const { controller } = controllerFor('owner');
    await expect(
      controller.list(undefined as unknown as string),
    ).rejects.toThrow(/authorization/i);
  });
});
