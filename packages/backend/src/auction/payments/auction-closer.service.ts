import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../../supabase/supabase.service';
import { AUCTION_PLATFORM_FEE_RATE } from '../auction-money';
import type {
  ClaimOrdersResult,
  CloseDueItemsResult,
  SettleAuctionArgs,
  SettleAuctionResult,
} from '../auction.types';
import { safeError } from './auction-payments.helpers';
import { AuctionPaymentsService } from './auction-payments.service';

const CLOSE_BATCH = 50;
const SETTLE_BATCH = 50;
const CHARGE_BATCH = 20;

/**
 * Cron jobs. Every instance runs them; the SKIP LOCKED RPCs and order leases make
 * that safe, and the in-process flags only stop a slow run overlapping itself.
 */
@Injectable()
export class AuctionCloserService {
  private readonly logger = new Logger(AuctionCloserService.name);
  private closing = false;
  private charging = false;
  private detaching = false;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
    private readonly payments: AuctionPaymentsService,
  ) {}

  private get admin() {
    return this.supabase.getAdminClient();
  }

  private get enabled(): boolean {
    return this.config.get<string>('AUCTIONS_ENABLED') === 'true';
  }

  @Cron('*/15 * * * * *')
  async closeAndSettle(): Promise<void> {
    if (!this.enabled || this.closing) return;
    this.closing = true;
    try {
      await this.closeDueItems();
      await this.settleReadyAuctions();
    } catch (err) {
      this.logger.error(`Auction close/settle run failed: ${safeError(err)}`);
    } finally {
      this.closing = false;
    }
  }

  @Cron('0 * * * * *')
  async promoteAndCharge(): Promise<void> {
    if (!this.enabled || this.charging) return;
    this.charging = true;
    try {
      await this.promoteScheduledAuctions();
      await this.chargeDueOrders();
    } catch (err) {
      this.logger.error(`Auction promote/charge run failed: ${safeError(err)}`);
    } finally {
      this.charging = false;
    }
  }

  @Cron('0 30 4 * * *')
  async detachCards(): Promise<void> {
    if (!this.enabled || this.detaching) return;
    this.detaching = true;
    try {
      const count = await this.payments.detachStaleCards();
      if (count) this.logger.log(`Detached ${count} saved card(s)`);
    } catch (err) {
      this.logger.error(`Card detach run failed: ${safeError(err)}`);
    } finally {
      this.detaching = false;
    }
  }

  async closeDueItems(): Promise<number> {
    const { data, error } = await this.admin.rpc('close_due_auction_items', {
      p_limit: CLOSE_BATCH,
    });
    if (error)
      throw new Error(`close_due_auction_items failed: ${error.message}`);
    const closed = (data ?? []) as CloseDueItemsResult;
    if (closed.length)
      this.logger.log(`Closed ${closed.length} auction item(s)`);
    return closed.length;
  }

  /**
   * Settles auctions with nothing left to decide: 'closed' ones, and 'live'
   * ones past their end whose items were all resolved early (buy-it-now, withdrawal),
   * which close_due_auction_items never revisits.
   */
  async settleReadyAuctions(): Promise<number> {
    const nowIso = new Date().toISOString();
    const [closed, ended] = await Promise.all([
      this.admin
        .from('auctions')
        .select('id')
        .eq('status', 'closed')
        .limit(SETTLE_BATCH),
      this.admin
        .from('auctions')
        .select('id')
        .eq('status', 'live')
        .lte('ends_at', nowIso)
        .limit(SETTLE_BATCH),
    ]);
    const ids = new Set<string>();
    for (const res of [closed, ended]) {
      for (const a of (res.data ?? []) as Array<{ id: string }>) ids.add(a.id);
    }

    let settled = 0;
    for (const id of ids) {
      try {
        const { count } = await this.admin
          .from('auction_items')
          .select('id', { count: 'exact', head: true })
          .eq('auction_id', id)
          .in('status', ['open', 'reserve_not_met']);
        if ((count ?? 0) > 0) continue;

        const args: SettleAuctionArgs = {
          p_auction_id: id,
          p_platform_fee_rate: AUCTION_PLATFORM_FEE_RATE,
        };
        const { data, error } = await this.admin.rpc('settle_auction', args);
        if (error) throw new Error(error.message);
        const result = data as SettleAuctionResult;
        if (result.ok) {
          settled += 1;
          this.logger.log(
            `Settled auction ${id}: ${result.orders_created} order(s)`,
          );
        } else {
          this.logger.debug(`Auction ${id} not settled yet: ${result.code}`);
        }
      } catch (err) {
        this.logger.error(`Settling auction ${id} failed: ${safeError(err)}`);
      }
    }
    return settled;
  }

  async promoteScheduledAuctions(): Promise<number> {
    const nowIso = new Date().toISOString();
    const { data, error } = await this.admin
      .from('auctions')
      .update({ status: 'live', updated_at: nowIso })
      .eq('status', 'scheduled')
      .lte('starts_at', nowIso)
      .select('id');
    if (error)
      throw new Error(`Promoting scheduled auctions failed: ${error.message}`);
    const count = data?.length ?? 0;
    if (count) this.logger.log(`Started ${count} auction(s)`);
    return count;
  }

  async chargeDueOrders(): Promise<number> {
    const { data, error } = await this.admin.rpc('claim_orders_for_charge', {
      p_limit: CHARGE_BATCH,
    });
    if (error)
      throw new Error(`claim_orders_for_charge failed: ${error.message}`);
    const orders = (data ?? []) as ClaimOrdersResult;
    for (const order of orders) {
      try {
        const outcome = await this.payments.chargeClaimedOrder(order);
        this.logger.log(`Order ${order.id} charge outcome: ${outcome.status}`);
      } catch (err) {
        // Left in 'charging'; the claim recovery re-runs it with the same idempotency key.
        this.logger.error(
          `Charging order ${order.id} failed: ${safeError(err)}`,
        );
      }
    }
    return orders.length;
  }
}
