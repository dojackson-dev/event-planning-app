import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuctionAdminService } from './auction-admin.service';
import {
  AuctionReportsService,
  csvCell,
  toCsv,
} from './auction-reports.service';

type Row = Record<string, any>;

/** Minimal in-memory Supabase query builder: select/eq/in/order/range reads only. */
function makeSupabase(seed: Record<string, Row[]>) {
  const from = (table: string) => {
    const filters: Array<(r: Row) => boolean> = [];
    let rangeFrom = 0;
    let rangeTo = Infinity;
    const b: any = {
      select: () => b,
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), b),
      in: (c: string, vs: unknown[]) => (
        filters.push((r) => vs.includes(r[c])),
        b
      ),
      order: () => b,
      range: (f: number, t: number) => ((rangeFrom = f), (rangeTo = t), b),
      limit: () => b,
    };
    const rows = () =>
      (seed[table] ?? [])
        .filter((r) => filters.every((f) => f(r)))
        .slice(rangeFrom, rangeTo + 1)
        .map((r) => ({ ...r }));
    b.maybeSingle = () =>
      Promise.resolve({ data: rows()[0] ?? null, error: null });
    b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve({ data: rows(), error: null }).then(res, rej);
    return b;
  };
  return { getAdminClient: () => ({ from }) } as unknown as SupabaseService;
}

const seed = (): Record<string, Row[]> => ({
  promoter_accounts: [
    { id: 'promoter-1', user_id: 'user-1' },
    { id: 'promoter-2', user_id: 'user-2' },
  ],
  auctions: [
    {
      id: 'auction-1',
      promoter_account_id: 'promoter-1',
      title: 'Gala',
      status: 'live',
    },
  ],
  auction_items: [
    {
      id: 'item-1',
      auction_id: 'auction-1',
      title: '=HYPERLINK("http://evil")',
      lot_number: 1,
      sale_mode: 'auction',
      status: 'sold',
      bid_count: 3,
      final_price_cents: 20_000,
      current_price_cents: 20_000,
      sort_order: 0,
      quantity: 1,
      quantity_sold: 0,
    },
    {
      id: 'item-2',
      auction_id: 'auction-1',
      title: 'Wine',
      lot_number: 2,
      sale_mode: 'auction',
      status: 'reserve_not_met',
      bid_count: 2,
      current_price_cents: 3000,
      reserve_cents: 5000,
      sort_order: 1,
      quantity: 1,
      quantity_sold: 0,
    },
    {
      id: 'item-3',
      auction_id: 'auction-1',
      title: 'Raffle',
      lot_number: 3,
      sale_mode: 'fixed',
      status: 'open',
      bid_count: 0,
      fixed_price_cents: 500,
      quantity: 100,
      quantity_sold: 4,
      sort_order: 2,
    },
  ],
  auction_bidders: [
    {
      id: 'bidder-1',
      auction_id: 'auction-1',
      paddle_number: 12,
      display_name: '@Mallory',
      email: 'm@example.test',
      phone_e164: '+15551230000',
      card_status: 'ready',
      blocked_at: null,
    },
    {
      id: 'bidder-2',
      auction_id: 'auction-1',
      paddle_number: 13,
      display_name: 'Bob',
      email: 'b@example.test',
      phone_e164: '+15551239999',
      card_status: 'none',
      blocked_at: '2026-01-01T00:00:00Z',
    },
  ],
  auction_bids: [
    {
      id: 1,
      item_id: 'item-1',
      bidder_id: 'bidder-1',
      amount_cents: 15_000,
      max_amount_cents: 99_900,
      kind: 'manual',
      created_at: '2026-01-01T10:00:00Z',
    },
    {
      id: 2,
      item_id: 'item-1',
      bidder_id: 'bidder-2',
      amount_cents: 20_000,
      max_amount_cents: 30_000,
      kind: 'manual',
      created_at: '2026-01-01T10:05:00Z',
    },
  ],
  auction_orders: [
    {
      id: 'order-1',
      auction_id: 'auction-1',
      promoter_account_id: 'promoter-1',
      bidder_id: 'bidder-1',
      kind: 'settlement',
      status: 'paid',
      buyer_name: '=cmd|calc',
      buyer_email: 'm@example.test',
      buyer_phone: '+15551230000',
      subtotal_cents: 20_000,
      processing_fee_cents: 0,
      platform_fee_cents: 300,
      total_cents: 20_300,
      amount_received_cents: 20_300,
      created_at: '2026-01-02T00:00:00Z',
    },
    {
      id: 'order-2',
      auction_id: 'auction-1',
      promoter_account_id: 'promoter-1',
      bidder_id: 'bidder-2',
      kind: 'buy_now',
      status: 'failed',
      buyer_name: 'Bob',
      buyer_email: 'b@example.test',
      buyer_phone: null,
      subtotal_cents: 5000,
      total_cents: 0,
      created_at: '2026-01-03T00:00:00Z',
    },
    {
      id: 'order-3',
      auction_id: 'auction-1',
      promoter_account_id: 'promoter-2',
      bidder_id: null,
      kind: 'buy_now',
      status: 'paid',
      buyer_name: 'Other',
      buyer_email: 'o@example.test',
      subtotal_cents: 999,
      total_cents: 999,
      created_at: '2026-01-03T00:00:00Z',
    },
  ],
  auction_order_items: [
    {
      id: 'oi-1',
      order_id: 'order-1',
      item_id: 'item-1',
      title: '=HYPERLINK("http://evil")',
      quantity: 1,
      price_cents: 20_000,
    },
    {
      id: 'oi-2',
      order_id: 'order-1',
      item_id: 'item-9',
      title: 'Gift, "boxed"',
      quantity: 1,
      price_cents: 1,
    },
  ],
});

function setup() {
  const supabase = makeSupabase(seed());
  const admin = new AuctionAdminService(supabase);
  return new AuctionReportsService(supabase, admin);
}

describe('csvCell', () => {
  it.each([
    ['=1+1', "'=1+1"],
    ['+15551234567', "'+15551234567"],
    ['-2+3', "'-2+3"],
    ['@SUM(A1)', "'@SUM(A1)"],
    ['\tcmd', "'\tcmd"],
    ['\rcmd', '"\'\rcmd"'],
  ])('neutralizes the formula prefix in %j', (input, expected) => {
    expect(csvCell(input)).toBe(expected);
  });

  it('quotes cells with commas, quotes and newlines and doubles embedded quotes', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(csvCell('=a,"b"')).toBe('"\'=a,""b"""');
  });

  it('leaves safe values, numbers and empties alone', () => {
    expect(csvCell('Wine basket')).toBe('Wine basket');
    expect(csvCell(-5)).toBe('-5');
    expect(csvCell(12)).toBe('12');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('joins rows with CRLF', () => {
    expect(toCsv(['a', 'b'], [['1', '=2']])).toBe("a,b\r\n1,'=2\r\n");
  });
});

describe('AuctionReportsService', () => {
  it("returns 404 for another promoter's auction on every report", async () => {
    const reports = setup();
    await expect(reports.summary('user-2', 'auction-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(reports.bids('user-2', 'auction-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(reports.bidders('user-2', 'auction-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(reports.orders('user-2', 'auction-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      reports.exportCsv('user-2', 'auction-1', 'orders'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('summarizes items, bidders, orders and revenue', async () => {
    const s = await setup().summary('user-1', 'auction-1');
    expect(s.items).toMatchObject({
      total: 3,
      sold: 1,
      reserve_not_met: 1,
      open: 1,
      with_bids: 2,
    });
    expect(s.bids.total).toBe(5);
    expect(s.bidders).toEqual({ registered: 2, card_ready: 1, blocked: 1 });
    expect(s.revenue).toMatchObject({
      hammer_total_cents: 20_000,
      fixed_sales_cents: 2000,
      paid_cents: 20_300,
      outstanding_cents: 5000,
    });
    expect(s.reserve_pending).toEqual([
      {
        item_id: 'item-2',
        title: 'Wine',
        lot_number: 2,
        top_bid_cents: 3000,
        reserve_cents: 5000,
      },
    ]);
    // the other promoter's order is not counted
    expect(s.orders).toEqual({ paid: 1, failed: 1 });
  });

  it('shows the bid ledger with bidder contact details but never standing max bids', async () => {
    const ledger = await setup().bids('user-1', 'auction-1');
    expect(ledger.map((b) => b.id)).toEqual([2, 1]);
    expect(ledger[0]).toMatchObject({
      paddle_number: 13,
      bidder_name: 'Bob',
      bidder_email: 'b@example.test',
      amount_cents: 20_000,
    });
    expect(ledger[0]).not.toHaveProperty('max_amount_cents');
    expect(JSON.stringify(ledger)).not.toContain('99900');
  });

  it('flags blocked bidders', async () => {
    const bidders = await setup().bidders('user-1', 'auction-1');
    expect(
      bidders.map((b) => [b.paddle_number, b.blocked, b.card_status]),
    ).toEqual([
      [12, false, 'ready'],
      [13, true, 'none'],
    ]);
    expect(bidders[0]).not.toHaveProperty('stripe_customer_id');
  });

  it("lists only the caller's orders with their lines", async () => {
    const orders = await setup().orders('user-1', 'auction-1');
    expect(orders.map((o) => o.id).sort()).toEqual(['order-1', 'order-2']);
    expect(orders.find((o) => o.id === 'order-1')?.items).toHaveLength(2);
  });

  it('validates paging values', async () => {
    await expect(
      setup().bids('user-1', 'auction-1', '5000'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      setup().bids('user-1', 'auction-1', 'abc'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exports orders as CSV with formulas neutralized', async () => {
    const csv = await setup().exportCsv('user-1', 'auction-1', undefined);
    const lines = csv.split('\r\n');
    expect(lines[0]).toContain('Order ID,Type,Status');
    expect(csv).toContain(`"'=HYPERLINK(""http://evil""); Gift, ""boxed"""`);
    expect(csv).toContain(`'=cmd|calc`);
    expect(csv).toContain(`'+15551230000`);
    expect(csv).not.toContain('Other');
    expect(csv).toContain('203.00');
  });

  it('exports bids as CSV with formulas neutralized and no max bids', async () => {
    const csv = await setup().exportCsv('user-1', 'auction-1', 'bids');
    expect(csv).toContain(`'@Mallory`);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(csv).toContain('150.00');
    expect(csv).not.toContain('999.00');
  });

  it('rejects an unknown export type', async () => {
    await expect(
      setup().exportCsv('user-1', 'auction-1', 'everything'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
