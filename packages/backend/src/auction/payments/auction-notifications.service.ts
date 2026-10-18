import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../supabase/supabase.service';
import type { AuctionOrderItemRow, AuctionOutboxRow } from '../auction.types';
import { AuctionMailService, PromoterAlertInput } from './auction-mail.service';
import {
  INTERNAL_ERROR_CODES,
  PAYABLE_ORDER_STATUSES,
  firstName,
  safeError,
  usd,
} from './auction-payments.helpers';
import {
  AuctionPaymentsService,
  PaymentOrder,
} from './auction-payments.service';
import { AuctionSmsService } from './auction-sms.service';

export const OUTBOX_MAX_ATTEMPTS = 5;
export const OUTBID_SMS_WINDOW_MS = 5 * 60_000;
const OUTBOX_BATCH = 50;
const BACKOFF_BASE_SECONDS = 60;

/** Delay before retry number `attempts` (1-based): 1, 2, 4, 8 minutes. */
export function outboxBackoffSeconds(attempts: number): number {
  return BACKOFF_BASE_SECONDS * 2 ** Math.max(attempts - 1, 0);
}

interface AuctionRef {
  id: string;
  title: string;
  promoter_account_id: string | null;
}

@Injectable()
export class AuctionNotificationsService {
  private readonly logger = new Logger(AuctionNotificationsService.name);
  private readonly frontendUrl: string;
  private running = false;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
    private readonly mail: AuctionMailService,
    private readonly sms: AuctionSmsService,
    private readonly payments: AuctionPaymentsService,
  ) {
    this.frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  private get admin() {
    return this.supabase.getAdminClient();
  }

  @Cron('30 * * * * *')
  async runOutbox(): Promise<void> {
    if (this.config.get<string>('AUCTIONS_ENABLED') !== 'true') return;
    if (this.running) return;
    this.running = true;
    try {
      const { sent, failed } = await this.processOutbox();
      if (sent || failed) {
        this.logger.log(`Auction outbox: ${sent} sent, ${failed} failed`);
      }
    } catch (err) {
      this.logger.error(`Auction outbox run failed: ${safeError(err)}`);
    } finally {
      this.running = false;
    }
  }

  /** Claims due rows (SKIP LOCKED in the RPC) and sends each one; each row ends 'sent', retried later, or 'failed' for good. */
  async processOutbox(): Promise<{ sent: number; failed: number }> {
    const { data, error } = await this.admin.rpc('claim_auction_outbox', {
      p_limit: OUTBOX_BATCH,
    });
    if (error) throw new Error(`claim_auction_outbox failed: ${error.message}`);
    let sent = 0;
    let failed = 0;
    for (const row of (data ?? []) as AuctionOutboxRow[]) {
      try {
        await this.dispatch(row);
        await this.markSent(row.id);
        sent += 1;
      } catch (err) {
        failed += 1;
        await this.markFailed(row, err);
      }
    }
    return { sent, failed };
  }

  private async markSent(id: number): Promise<void> {
    const { error } = await this.admin
      .from('auction_outbox')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', id);
    if (error) throw new Error('Could not mark outbox row sent');
  }

  private async markFailed(row: AuctionOutboxRow, err: unknown): Promise<void> {
    const giveUp = row.attempts >= OUTBOX_MAX_ATTEMPTS;
    this.logger.warn(
      `Outbox ${row.id} (${row.kind}) attempt ${row.attempts} failed: ${safeError(err)}`,
    );
    const { error } = await this.admin
      .from('auction_outbox')
      .update({
        status: giveUp ? 'failed' : 'pending',
        next_attempt_at: new Date(
          Date.now() + outboxBackoffSeconds(row.attempts) * 1000,
        ).toISOString(),
        last_error: safeError(err),
      })
      .eq('id', row.id);
    if (error)
      this.logger.error(`Could not record failure of outbox ${row.id}`);
  }

  // ─── dispatch ─────────────────────────────────────────────────────────────

  private async dispatch(row: AuctionOutboxRow): Promise<void> {
    switch (row.kind) {
      case 'outbid':
        return this.onOutbid(row);
      case 'won':
        return this.onWon(row);
      case 'reserve_not_met':
        return this.onReserveNotMet(row);
      case 'order_created':
        return this.onOrderCreated(row);
      case 'payment_succeeded':
        return this.onPaymentSucceeded(row);
      case 'payment_failed':
        return this.onPaymentFailed(row);
      case 'payment_defaulted':
        return this.onPaymentDefaulted(row);
      case 'item_withdrawn':
        return this.onItemWithdrawn(row);
      case 'dispute_opened':
        return this.onDispute(row);
      default:
        this.logger.warn(`Outbox ${row.id}: unknown kind ${row.kind}`);
    }
  }

  private str(row: AuctionOutboxRow, key: string, fallback = ''): string {
    const value = row.payload?.[key];
    return typeof value === 'string' ? value : fallback;
  }

  private num(row: AuctionOutboxRow, key: string): number {
    const value = row.payload?.[key];
    return typeof value === 'number' ? value : 0;
  }

  private async loadAuction(id: string | null): Promise<AuctionRef | null> {
    if (!id) return null;
    const { data } = await this.admin
      .from('auctions')
      .select('id, title, promoter_account_id')
      .eq('id', id)
      .maybeSingle();
    return (data as AuctionRef | null) ?? null;
  }

  private async promoterEmail(
    promoterAccountId: string | null,
  ): Promise<string | null> {
    const promoter = await this.payments.loadPromoter(promoterAccountId);
    return promoter?.email ?? null;
  }

  private async alertPromoter(
    promoterAccountId: string | null,
    alert: Omit<PromoterAlertInput, 'to'>,
  ): Promise<void> {
    const to = await this.promoterEmail(promoterAccountId);
    if (!to) {
      this.logger.warn('Promoter alert skipped: no promoter email');
      return;
    }
    await this.mail.sendPromoterAlert({ ...alert, to });
  }

  private manageUrl(auctionId: string | null): string {
    return `${this.frontendUrl}/dashboard/promoter/auctions${auctionId ? `/${auctionId}` : ''}`;
  }

  // ─── handlers ─────────────────────────────────────────────────────────────

  private async onOutbid(row: AuctionOutboxRow): Promise<void> {
    const bidder = await this.payments.loadBidder(row.bidder_id);
    if (!bidder) return;
    const itemTitle = this.str(row, 'item_title', 'an item');
    const priceCents = this.num(row, 'price_cents');
    const itemUrl = `${this.frontendUrl}/auctions/${row.auction_id}/items/${row.item_id}`;

    await this.mail.sendOutbid({
      to: bidder.email,
      name: firstName(bidder.display_name),
      itemTitle,
      priceCents,
      itemUrl,
    });

    if (!this.sms.canText(bidder) || !row.item_id) return;
    const since = new Date(Date.now() - OUTBID_SMS_WINDOW_MS).toISOString();
    const { count } = await this.admin
      .from('auction_outbox')
      .select('id', { count: 'exact', head: true })
      .eq('item_id', row.item_id)
      .eq('bidder_id', bidder.id)
      .eq('kind', 'outbid')
      .gte('sms_sent_at', since);
    if ((count ?? 0) > 0) return;
    const texted = await this.sms.send(
      bidder,
      `EventEcos: you were outbid on ${itemTitle}. Current bid ${usd(priceCents)}. Bid again: ${itemUrl}`,
    );
    if (texted) {
      await this.admin
        .from('auction_outbox')
        .update({ sms_sent_at: new Date().toISOString() })
        .eq('id', row.id);
    }
  }

  private async onWon(row: AuctionOutboxRow): Promise<void> {
    const bidder = await this.payments.loadBidder(row.bidder_id);
    if (!bidder) return;
    await this.mail.sendWon({
      to: bidder.email,
      name: firstName(bidder.display_name),
      itemTitle: this.str(row, 'item_title', 'your item'),
      priceCents: this.num(row, 'price_cents'),
      auctionUrl: `${this.frontendUrl}/auctions/${row.auction_id}`,
    });
  }

  private async onReserveNotMet(row: AuctionOutboxRow): Promise<void> {
    const auction = await this.loadAuction(row.auction_id);
    if (!auction) return;
    await this.alertPromoter(auction.promoter_account_id, {
      subject: `Reserve not met: ${this.str(row, 'item_title', 'an item')}`,
      heading: 'Reserve not met',
      lines: [
        `The top bid on "${this.str(row, 'item_title', 'an item')}" in "${auction.title}" was ${usd(this.num(row, 'top_bid_cents'))}, below your reserve.`,
        'Open the auction to accept the top bid or decline it. The auction cannot be settled until you decide.',
      ],
      linkUrl: this.manageUrl(auction.id),
      linkLabel: 'Review the item',
    });
  }

  private async onOrderCreated(row: AuctionOutboxRow): Promise<void> {
    if (this.str(row, 'kind') !== 'settlement') return;
    const order = await this.payments.loadOrder(row.order_id ?? '');
    if (!order) return;
    await this.mail.sendOrderCreated({
      to: order.buyer_email,
      name: firstName(order.buyer_name),
      auctionTitle: order.auction_title,
      subtotalCents: order.subtotal_cents,
      payByAt: order.pay_by_at,
    });
  }

  private async onPaymentSucceeded(row: AuctionOutboxRow): Promise<void> {
    const order = await this.payments.loadOrder(row.order_id ?? '');
    if (!order) return;
    // Claim the receipt first so a retry after a crash cannot send it twice.
    const { data: claimed } = await this.admin
      .from('auction_orders')
      .update({ receipt_sent_at: new Date().toISOString() })
      .eq('id', order.id)
      .is('receipt_sent_at', null)
      .select('id');
    if (!claimed?.length) return;

    try {
      const { data } = await this.admin
        .from('auction_order_items')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });
      const items = ((data ?? []) as AuctionOrderItemRow[]).map((i) => ({
        title: i.title,
        quantity: i.quantity,
        priceCents: i.price_cents,
        fmvCents: i.fair_market_value_cents,
      }));
      await this.mail.sendReceipt({
        to: order.buyer_email,
        buyerName: order.buyer_name,
        auctionTitle: order.auction_title,
        eventTitle: order.event_title,
        orgName: order.org_name,
        orgEin: order.org_ein,
        items,
        subtotalCents: order.subtotal_cents,
        platformFeeCents: order.platform_fee_cents,
        processingFeeCents: order.processing_fee_cents,
        taxCents: order.tax_cents,
        totalCents: order.total_cents,
      });
    } catch (err) {
      await this.admin
        .from('auction_orders')
        .update({ receipt_sent_at: null })
        .eq('id', order.id);
      throw err;
    }
  }

  private async onPaymentFailed(row: AuctionOutboxRow): Promise<void> {
    const order = await this.payments.loadOrder(row.order_id ?? '');
    if (!order) return;

    if (
      order.last_error_code &&
      INTERNAL_ERROR_CODES.has(order.last_error_code)
    ) {
      await this.alertInternalFailure(order);
      return;
    }
    if (!PAYABLE_ORDER_STATUSES.has(order.status)) return;

    const bidder = await this.payments.loadBidder(order.bidder_id);
    const { url } = await this.payments.issuePayLink(order);
    const willRetry =
      order.status === 'failed' && row.payload?.requires_action !== true;

    await this.mail.sendPayLink({
      to: order.buyer_email,
      name: firstName(order.buyer_name),
      auctionTitle: order.auction_title,
      totalOrSubtotalCents: order.total_cents || order.subtotal_cents,
      payUrl: url,
      payByAt: order.pay_by_at,
      willRetry,
      reason: 'failed',
    });
    if (bidder) {
      await this.sms.send(
        bidder,
        `EventEcos: we couldn't charge your card for ${order.auction_title}. Pay here: ${url}`,
      );
    }
  }

  private async alertInternalFailure(order: PaymentOrder): Promise<void> {
    const reason =
      order.last_error_code === 'tax_calculation_failed'
        ? 'sales tax could not be calculated'
        : 'your payout account is not available';
    await this.alertPromoter(order.promoter_account_id, {
      subject: 'A winning bidder payment needs attention',
      heading: 'Payment needs attention',
      lines: [
        `A payment for "${order.auction_title}" is on hold because ${reason}.`,
        'We will retry automatically. Please check your payout settings and contact support if this continues.',
      ],
      linkUrl: this.manageUrl(order.auction_id),
      linkLabel: 'Open the auction',
    });
  }

  private async onPaymentDefaulted(row: AuctionOutboxRow): Promise<void> {
    const order = await this.payments.loadOrder(row.order_id ?? '');
    if (!order) return;
    await this.alertPromoter(order.promoter_account_id, {
      subject: `Unpaid auction order: ${order.auction_title}`,
      heading: 'An auction order went unpaid',
      lines: [
        `${firstName(order.buyer_name)} did not pay ${usd(order.subtotal_cents)} for "${order.auction_title}" before the payment window ended.`,
        'You can relist the items or cancel the order from the auction orders page.',
      ],
      linkUrl: this.manageUrl(order.auction_id),
      linkLabel: 'View orders',
    });
  }

  private async onItemWithdrawn(row: AuctionOutboxRow): Promise<void> {
    const bidder = await this.payments.loadBidder(row.bidder_id);
    const auction = await this.loadAuction(row.auction_id);
    if (!bidder || !auction) return;
    await this.mail.sendItemWithdrawn({
      to: bidder.email,
      name: firstName(bidder.display_name),
      itemTitle: this.str(row, 'item_title', 'An item'),
      auctionTitle: auction.title,
    });
  }

  private async onDispute(row: AuctionOutboxRow): Promise<void> {
    const order = await this.payments.loadOrder(row.order_id ?? '');
    if (!order) return;
    await this.alertPromoter(order.promoter_account_id, {
      subject: `Payment dispute: ${order.auction_title}`,
      heading: 'A payment was disputed',
      lines: [
        `A cardholder opened a dispute for ${usd(this.num(row, 'amount_cents'))} on an order from "${order.auction_title}".`,
        'EventEcos is handling the dispute and may contact you for details. The bid log and the buyer\u2019s card authorization are kept as evidence.',
      ],
      linkUrl: this.manageUrl(order.auction_id),
      linkLabel: 'Open the auction',
    });
  }
}
