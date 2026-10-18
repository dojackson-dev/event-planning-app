import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import type {
  AuctionBidderRow,
  AuctionBidRow,
  AuctionItemRow,
  AuctionOrderItemRow,
  AuctionOrderRow,
} from '../auction.types';
import { AuctionAdminService } from './auction-admin.service';
import { intIn } from './dto/auction-input';

const PAGE = 1000;
const JSON_MAX_ROWS = 1000;
const CSV_MAX_ROWS = 50_000;
const ID_CHUNK = 100;

/** Cell escaping for CSV: neutralizes spreadsheet formulas, then quotes as needed. */
export type CsvCell = string | number | boolean | null | undefined;

export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'string' ? value : String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  return (
    [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') +
    '\r\n'
  );
}

const usd = (cents: number | null | undefined): string =>
  cents === null || cents === undefined ? '' : (cents / 100).toFixed(2);

const chunk = <T>(list: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

type PageResult = PromiseLike<{
  data: unknown[] | null;
  error: { code?: string } | null;
}>;

const BIDDER_COLUMNS =
  'id, auction_id, paddle_number, display_name, email, phone_e164, email_verified_at, phone_verified_at, card_status, card_brand, card_last4, exposure_limit_cents, blocked_at, blocked_reason, created_at';
const ORDER_COLUMNS =
  'id, auction_id, bidder_id, kind, status, buyer_name, buyer_email, buyer_phone, subtotal_cents, tax_cents, processing_fee_cents, platform_fee_cents, total_cents, amount_received_cents, paid_at, pay_by_at, charge_attempts, last_error_code, created_at';

@Injectable()
export class AuctionReportsService {
  private readonly logger = new Logger(AuctionReportsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly admin: AuctionAdminService,
  ) {}

  private get db() {
    return this.supabase.getAdminClient();
  }

  /** Pages through a query (PostgREST caps a response at 1000 rows). */
  private async fetchAll<T>(
    op: string,
    page: (from: number, to: number) => PageResult,
    cap: number,
  ): Promise<T[]> {
    const rows: T[] = [];
    while (rows.length < cap) {
      const { data, error } = await page(rows.length, rows.length + PAGE - 1);
      if (error) {
        this.logger.error(`${op} failed (${error.code ?? 'db_error'})`);
        throw new BadRequestException('Could not load the report.');
      }
      const batch = (data ?? []) as T[];
      rows.push(...batch);
      if (batch.length < PAGE) break;
    }
    return rows.slice(0, cap);
  }

  private async owned(userId: string, auctionId: string) {
    const promoter = await this.admin.getPromoterAccount(userId);
    const auction = await this.admin.getOwnedAuction(promoter.id, auctionId);
    return { promoter, auction };
  }

  private async loadItems(auctionId: string): Promise<AuctionItemRow[]> {
    return this.fetchAll<AuctionItemRow>(
      'items',
      (from, to) =>
        this.db
          .from('auction_items')
          .select('*')
          .eq('auction_id', auctionId)
          .order('sort_order', { ascending: true })
          .range(from, to),
      5000,
    );
  }

  private parsePaging(limit?: unknown, offset?: unknown) {
    const l =
      limit === undefined || limit === ''
        ? JSON_MAX_ROWS
        : intIn(Number(limit), 'limit', 1, JSON_MAX_ROWS);
    const o =
      offset === undefined || offset === ''
        ? 0
        : intIn(Number(offset), 'offset', 0, 1_000_000);
    return { limit: l, offset: o };
  }

  // ─── summary ─────────────────────────────────────────────────

  async summary(userId: string, auctionId: string) {
    const { promoter, auction } = await this.owned(userId, auctionId);
    const items = await this.loadItems(auction.id);
    const bidders = await this.loadBidders(auction.id);
    const orders = await this.loadOrders(auction.id, promoter.id);

    const itemCounts: Record<string, number> = {
      total: items.length,
      open: 0,
      sold: 0,
      unsold: 0,
      reserve_not_met: 0,
      withdrawn: 0,
      with_bids: 0,
    };
    let hammerCents = 0;
    let fixedSalesCents = 0;
    let totalBids = 0;
    for (const i of items) {
      itemCounts[i.status] = (itemCounts[i.status] ?? 0) + 1;
      if (i.bid_count > 0) itemCounts.with_bids += 1;
      totalBids += i.bid_count;
      if (i.sale_mode === 'auction' && i.status === 'sold') {
        hammerCents += i.final_price_cents ?? 0;
      }
      if (i.sale_mode === 'fixed') {
        fixedSalesCents += (i.fixed_price_cents ?? 0) * i.quantity_sold;
      }
    }

    const orderCounts: Record<string, number> = {};
    let paidCents = 0;
    let paidSubtotalCents = 0;
    let outstandingCents = 0;
    let defaultedCents = 0;
    for (const o of orders) {
      orderCounts[o.status] = (orderCounts[o.status] ?? 0) + 1;
      const total = o.total_cents > 0 ? o.total_cents : o.subtotal_cents;
      if (o.status === 'paid') {
        paidCents += o.amount_received_cents ?? total;
        paidSubtotalCents += o.subtotal_cents;
      } else if (o.status === 'defaulted') {
        defaultedCents += total;
      } else if (
        ['pending', 'charging', 'failed', 'requires_action'].includes(o.status)
      ) {
        outstandingCents += total;
      }
    }

    return {
      auction: {
        id: auction.id,
        title: auction.title,
        status: auction.status,
        starts_at: auction.starts_at,
        ends_at: auction.ends_at,
      },
      items: itemCounts,
      bids: { total: totalBids },
      bidders: {
        registered: bidders.length,
        card_ready: bidders.filter((b) => b.card_status === 'ready').length,
        blocked: bidders.filter((b) => b.blocked_at).length,
      },
      orders: orderCounts,
      revenue: {
        hammer_total_cents: hammerCents,
        fixed_sales_cents: fixedSalesCents,
        paid_cents: paidCents,
        paid_subtotal_cents: paidSubtotalCents,
        outstanding_cents: outstandingCents,
        defaulted_cents: defaultedCents,
      },
      reserve_pending: items
        .filter((i) => i.status === 'reserve_not_met')
        .map((i) => ({
          item_id: i.id,
          title: i.title,
          lot_number: i.lot_number,
          top_bid_cents: i.current_price_cents,
          reserve_cents: i.reserve_cents,
        })),
    };
  }

  // ─── ledgers ─────────────────────────────────────────────────

  private loadBidders(auctionId: string): Promise<AuctionBidderRow[]> {
    return this.fetchAll<AuctionBidderRow>(
      'bidders',
      (from, to) =>
        this.db
          .from('auction_bidders')
          .select(BIDDER_COLUMNS)
          .eq('auction_id', auctionId)
          .order('paddle_number', { ascending: true })
          .range(from, to),
      CSV_MAX_ROWS,
    );
  }

  private loadOrders(
    auctionId: string,
    promoterId: string,
  ): Promise<AuctionOrderRow[]> {
    return this.fetchAll<AuctionOrderRow>(
      'orders',
      (from, to) =>
        this.db
          .from('auction_orders')
          .select(ORDER_COLUMNS)
          .eq('auction_id', auctionId)
          .eq('promoter_account_id', promoterId)
          .order('created_at', { ascending: false })
          .range(from, to),
      CSV_MAX_ROWS,
    );
  }

  /** Bids joined to item and bidder, newest first. Standing max bids are never exposed. */
  private async loadBidLedger(
    auctionId: string,
    items: AuctionItemRow[],
    cap: number,
  ) {
    const bidders = await this.loadBidders(auctionId);
    const bidderById = new Map(bidders.map((b) => [b.id, b]));
    const itemById = new Map(items.map((i) => [i.id, i]));

    const bids: AuctionBidRow[] = [];
    for (const ids of chunk(
      items.map((i) => i.id),
      ID_CHUNK,
    )) {
      bids.push(
        ...(await this.fetchAll<AuctionBidRow>(
          'bids',
          (from, to) =>
            this.db
              .from('auction_bids')
              .select('id, item_id, bidder_id, amount_cents, kind, created_at')
              .in('item_id', ids)
              .order('id', { ascending: false })
              .range(from, to),
          cap,
        )),
      );
    }
    bids.sort((a, b) => b.id - a.id);

    return bids.map((b) => {
      const bidder = bidderById.get(b.bidder_id);
      const item = itemById.get(b.item_id);
      return {
        id: b.id,
        created_at: b.created_at,
        kind: b.kind,
        amount_cents: b.amount_cents,
        item_id: b.item_id,
        item_title: item?.title ?? null,
        lot_number: item?.lot_number ?? null,
        bidder_id: b.bidder_id,
        paddle_number: bidder?.paddle_number ?? null,
        bidder_name: bidder?.display_name ?? null,
        bidder_email: bidder?.email ?? null,
        bidder_phone: bidder?.phone_e164 ?? null,
      };
    });
  }

  async bids(
    userId: string,
    auctionId: string,
    limit?: unknown,
    offset?: unknown,
  ) {
    const { auction } = await this.owned(userId, auctionId);
    const paging = this.parsePaging(limit, offset);
    const items = await this.loadItems(auction.id);
    const ledger = await this.loadBidLedger(
      auction.id,
      items,
      paging.offset + paging.limit,
    );
    return ledger.slice(paging.offset, paging.offset + paging.limit);
  }

  async bidders(
    userId: string,
    auctionId: string,
    limit?: unknown,
    offset?: unknown,
  ) {
    const { auction } = await this.owned(userId, auctionId);
    const paging = this.parsePaging(limit, offset);
    const bidders = await this.loadBidders(auction.id);
    return bidders
      .slice(paging.offset, paging.offset + paging.limit)
      .map((b) => ({ ...b, blocked: Boolean(b.blocked_at) }));
  }

  private async loadOrdersWithItems(
    auctionId: string,
    promoterId: string,
    cap: number,
  ) {
    const orders = (await this.loadOrders(auctionId, promoterId)).slice(0, cap);
    const lines: AuctionOrderItemRow[] = [];
    for (const ids of chunk(
      orders.map((o) => o.id),
      ID_CHUNK,
    )) {
      const { data, error } = await this.db
        .from('auction_order_items')
        .select(
          'id, order_id, item_id, title, lot_number, sale_mode, quantity, price_cents, fair_market_value_cents',
        )
        .in('order_id', ids);
      if (error) {
        this.logger.error(`order items failed (${error.code ?? 'db_error'})`);
        throw new BadRequestException('Could not load the report.');
      }
      lines.push(...((data ?? []) as unknown as AuctionOrderItemRow[]));
    }
    const byOrder = new Map<string, AuctionOrderItemRow[]>();
    for (const l of lines) {
      byOrder.set(l.order_id, [...(byOrder.get(l.order_id) ?? []), l]);
    }
    return orders.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] }));
  }

  async orders(
    userId: string,
    auctionId: string,
    limit?: unknown,
    offset?: unknown,
  ) {
    const { promoter, auction } = await this.owned(userId, auctionId);
    const paging = this.parsePaging(limit, offset);
    const all = await this.loadOrdersWithItems(
      auction.id,
      promoter.id,
      paging.offset + paging.limit,
    );
    return all.slice(paging.offset, paging.offset + paging.limit);
  }

  // ─── CSV ─────────────────────────────────────────────────────

  async exportCsv(userId: string, auctionId: string, type: unknown) {
    const kind = type === undefined || type === '' ? 'orders' : type;
    if (kind !== 'orders' && kind !== 'bids') {
      throw new BadRequestException('type must be orders or bids.');
    }
    const { promoter, auction } = await this.owned(userId, auctionId);

    if (kind === 'bids') {
      const items = await this.loadItems(auction.id);
      const ledger = await this.loadBidLedger(auction.id, items, CSV_MAX_ROWS);
      return toCsv(
        [
          'Bid ID',
          'Time',
          'Lot',
          'Item',
          'Paddle',
          'Bidder name',
          'Email',
          'Phone',
          'Amount (USD)',
          'Type',
        ],
        ledger.map((b) => [
          b.id,
          b.created_at,
          b.lot_number,
          b.item_title,
          b.paddle_number,
          b.bidder_name,
          b.bidder_email,
          b.bidder_phone,
          usd(b.amount_cents),
          b.kind,
        ]),
      );
    }

    const orders = await this.loadOrdersWithItems(
      auction.id,
      promoter.id,
      CSV_MAX_ROWS,
    );
    const bidders = await this.loadBidders(auction.id);
    const paddleById = new Map(bidders.map((b) => [b.id, b.paddle_number]));
    return toCsv(
      [
        'Order ID',
        'Type',
        'Status',
        'Paddle',
        'Buyer name',
        'Email',
        'Phone',
        'Items',
        'Subtotal (USD)',
        'Processing fee (USD)',
        'Platform fee (USD)',
        'Total (USD)',
        'Received (USD)',
        'Paid at',
        'Pay by',
        'Charge attempts',
        'Created',
      ],
      orders.map((o) => [
        o.id,
        o.kind,
        o.status,
        o.bidder_id ? (paddleById.get(o.bidder_id) ?? null) : null,
        o.buyer_name,
        o.buyer_email,
        o.buyer_phone,
        o.items.map((i) => i.title).join('; '),
        usd(o.subtotal_cents),
        usd(o.processing_fee_cents),
        usd(o.platform_fee_cents),
        usd(o.total_cents),
        usd(o.amount_received_cents),
        o.paid_at,
        o.pay_by_at,
        o.charge_attempts,
        o.created_at,
      ]),
    );
  }
}
