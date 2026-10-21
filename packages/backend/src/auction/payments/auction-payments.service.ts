import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { isVerifiedNonprofit } from '../../nonprofit/nonprofit-gate';
import { SupabaseService } from '../../supabase/supabase.service';
import { computeOrderAmounts } from '../auction-money';
import { AuctionOrderCharger, ChargeOutcome } from '../auction-ports';
import type {
  AuctionActorType,
  AuctionBidderRow,
  AuctionOrderItemRow,
  AuctionOrderRow,
  MarkOrderFailedArgs,
  MarkOrderPaidArgs,
  SetOrderAmountsArgs,
} from '../auction.types';
import type { BidderContext } from '../bidding/bidder.guard';
import {
  ChargeFailure,
  DEFAULT_TAX_CODE,
  INTERNAL_RETRY_SECONDS,
  PAYABLE_ORDER_STATUSES,
  classifyChargeError,
  classifyDecline,
  firstName,
  hashPayToken,
  isWellFormedPayToken,
  maskEmail,
  newPayToken,
  safeError,
} from './auction-payments.helpers';
import { AuctionMailService } from './auction-mail.service';
import { AuctionSmsService } from './auction-sms.service';

/** Columns added by create-auction-payments-additions.sql. */
export interface AuctionOrderExtras {
  pay_token_hash: string | null;
  pay_token_expires_at: string | null;
  stripe_checkout_session_id: string | null;
  last_payment_intent_id: string | null;
  receipt_sent_at: string | null;
  flag_reason: string | null;
  flagged_at: string | null;
}
export type PaymentOrder = AuctionOrderRow & AuctionOrderExtras;
export type PaymentBidder = AuctionBidderRow & {
  sms_consent?: boolean | null;
  card_detached_at?: string | null;
};

export interface PromoterPayoutRow {
  id: string;
  email: string | null;
  company_name: string | null;
  is_nonprofit: boolean | null;
  nonprofit_status: string | null;
  stripe_account_id: string | null;
  stripe_connect_status: string | null;
}

export class TaxCalculationError extends Error {}

const CARD_RETENTION_DAYS = 60;
const CHECKOUT_TTL_SECONDS = 35 * 60;
const OPEN_ORDER_STATUSES = [
  'pending',
  'charging',
  'failed',
  'requires_action',
];
const SETUP_INTENT_RE = /^seti_[A-Za-z0-9_]+$/;

function asId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

export function promoterCanReceivePayments(
  promoter: PromoterPayoutRow | null | undefined,
): promoter is PromoterPayoutRow & { stripe_account_id: string } {
  return (
    isVerifiedNonprofit(promoter) &&
    Boolean(promoter?.stripe_account_id) &&
    promoter?.stripe_connect_status === 'active'
  );
}

@Injectable()
export class AuctionPaymentsService implements AuctionOrderCharger {
  private readonly logger = new Logger(AuctionPaymentsService.name);
  private readonly stripe: Stripe;
  private readonly frontendUrl: string;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
    private readonly mail: AuctionMailService,
    private readonly sms: AuctionSmsService,
  ) {
    this.stripe = new Stripe(
      this.config.get<string>('STRIPE_SECRET_KEY') || '',
    );
    this.frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  private get taxEnabled(): boolean {
    return this.config.get<string>('STRIPE_TAX_ENABLED') === 'true';
  }

  private get admin() {
    return this.supabase.getAdminClient();
  }

  // ─── small data helpers ───────────────────────────────────────────────────

  private async rpc<T>(fn: string, args: object): Promise<T> {
    const { data, error } = await this.admin.rpc(fn, args);
    if (error) throw new Error(`${fn} failed: ${error.message}`);
    return data as T;
  }

  async loadOrder(orderId: string): Promise<PaymentOrder | null> {
    const { data, error } = await this.admin
      .from('auction_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();
    if (error) throw new Error(`Order lookup failed: ${error.message}`);
    return (data as PaymentOrder | null) ?? null;
  }

  async loadBidder(bidderId: string | null): Promise<PaymentBidder | null> {
    if (!bidderId) return null;
    const { data, error } = await this.admin
      .from('auction_bidders')
      .select('*')
      .eq('id', bidderId)
      .maybeSingle();
    if (error) throw new Error(`Bidder lookup failed: ${error.message}`);
    return (data as PaymentBidder | null) ?? null;
  }

  async loadPromoter(
    promoterId: string | null,
  ): Promise<PromoterPayoutRow | null> {
    if (!promoterId) return null;
    const { data, error } = await this.admin
      .from('promoter_accounts')
      .select(
        'id, email, company_name, is_nonprofit, nonprofit_status, stripe_account_id, stripe_connect_status',
      )
      .eq('id', promoterId)
      .maybeSingle();
    if (error) throw new Error(`Promoter lookup failed: ${error.message}`);
    return (data as PromoterPayoutRow | null) ?? null;
  }

  private async loadOrderItems(
    orderId: string,
  ): Promise<AuctionOrderItemRow[]> {
    const { data, error } = await this.admin
      .from('auction_order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(`Order items lookup failed: ${error.message}`);
    return (data as AuctionOrderItemRow[] | null) ?? [];
  }

  private async updateOrder(
    orderId: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await this.admin
      .from('auction_orders')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (error) this.logger.warn(`Order ${orderId} update failed`);
  }

  async audit(
    auctionId: string | null,
    action: string,
    orderId: string | null,
    details: Record<string, unknown>,
    actor: AuctionActorType = 'system',
  ): Promise<void> {
    const { error } = await this.admin.from('auction_audit').insert({
      auction_id: auctionId,
      actor_type: actor,
      action,
      entity_type: 'order',
      entity_id: orderId,
      details,
    });
    if (error) this.logger.warn(`Audit insert failed for ${action}`);
  }

  private async auditExists(
    action: string,
    orderId: string,
    detailKey: string,
    detailValue: string,
  ): Promise<boolean> {
    const { count } = await this.admin
      .from('auction_audit')
      .select('id', { count: 'exact', head: true })
      .eq('action', action)
      .eq('entity_id', orderId)
      .eq(`details->>${detailKey}`, detailValue);
    return (count ?? 0) > 0;
  }

  // ─── card on file (SetupIntent) ───────────────────────────────────────────

  private async requireBidder(ctx: BidderContext): Promise<PaymentBidder> {
    const bidder = await this.loadBidder(ctx.bidderId);
    if (!bidder || bidder.auction_id !== ctx.auctionId) {
      throw new NotFoundException('Bidder not found');
    }
    if (bidder.blocked_at) throw new ForbiddenException('Bidder is blocked');
    return bidder;
  }

  private async ensureCustomer(bidder: PaymentBidder): Promise<string> {
    if (bidder.stripe_customer_id) return bidder.stripe_customer_id;
    const customer = await this.stripe.customers.create(
      {
        email: bidder.email,
        name: bidder.display_name,
        metadata: {
          auction_bidder_id: bidder.id,
          auction_id: bidder.auction_id,
        },
      },
      { idempotencyKey: `auction-bidder-customer-${bidder.id}` },
    );
    const { data } = await this.admin
      .from('auction_bidders')
      .update({
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bidder.id)
      .is('stripe_customer_id', null)
      .select('id');
    if (data && data.length > 0) return customer.id;
    // Lost a race with another request: use the stored customer.
    const current = await this.loadBidder(bidder.id);
    return current?.stripe_customer_id ?? customer.id;
  }

  async createSetupIntent(
    ctx: BidderContext,
  ): Promise<{ clientSecret: string }> {
    const bidder = await this.requireBidder(ctx);
    const customerId = await this.ensureCustomer(bidder);
    const intent = await this.stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      payment_method_types: ['card'],
      metadata: {
        auction_bidder_id: bidder.id,
        auction_id: bidder.auction_id,
      },
    });
    if (!intent.client_secret) {
      throw new ServiceUnavailableException('Could not start card setup.');
    }
    if (bidder.card_status === 'none' || bidder.card_status === 'failed') {
      await this.admin
        .from('auction_bidders')
        .update({
          card_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bidder.id);
    }
    return { clientSecret: intent.client_secret };
  }

  /** The SetupIntent is always re-read from Stripe; nothing the client says about it is trusted. */
  async confirmCard(
    ctx: BidderContext,
    setupIntentId: string,
  ): Promise<{ cardStatus: 'ready'; cardBrand: string; cardLast4: string }> {
    if (!SETUP_INTENT_RE.test(setupIntentId ?? '')) {
      throw new BadRequestException('Invalid setup intent.');
    }
    const bidder = await this.requireBidder(ctx);
    const intent = await this.stripe.setupIntents.retrieve(setupIntentId);
    if (intent.metadata?.auction_bidder_id !== bidder.id) {
      throw new ForbiddenException(
        'This card setup belongs to another bidder.',
      );
    }
    return this.applySetupIntent(intent, bidder);
  }

  private async applySetupIntent(
    intent: Stripe.SetupIntent,
    bidder: PaymentBidder,
  ): Promise<{ cardStatus: 'ready'; cardBrand: string; cardLast4: string }> {
    if (intent.status !== 'succeeded') {
      throw new BadRequestException('Card setup is not complete.');
    }
    const customerId = asId(intent.customer);
    if (
      !customerId ||
      (bidder.stripe_customer_id && customerId !== bidder.stripe_customer_id)
    ) {
      throw new ForbiddenException('Card setup does not match this bidder.');
    }
    const paymentMethodId = asId(intent.payment_method);
    if (!paymentMethodId) {
      throw new BadRequestException('No card was saved.');
    }
    const method = await this.stripe.paymentMethods.retrieve(paymentMethodId);
    if (method.type !== 'card' || !method.card) {
      throw new BadRequestException('Only cards are supported.');
    }
    const brand = method.card.brand;
    const last4 = method.card.last4;

    const { error } = await this.admin
      .from('auction_bidders')
      .update({
        stripe_customer_id: customerId,
        stripe_payment_method_id: paymentMethodId,
        card_brand: brand,
        card_last4: last4,
        card_status: 'ready',
        card_detached_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bidder.id);
    if (error) throw new Error(`Saving card failed: ${error.message}`);

    const previous = bidder.stripe_payment_method_id;
    if (previous && previous !== paymentMethodId) {
      try {
        await this.stripe.paymentMethods.detach(previous);
      } catch {
        this.logger.warn(`Could not detach replaced card for ${bidder.id}`);
      }
    }
    await this.audit(
      bidder.auction_id,
      'card_saved',
      null,
      { bidder_id: bidder.id },
      'bidder',
    );
    return { cardStatus: 'ready', cardBrand: brand, cardLast4: last4 };
  }

  /** Webhook: setup_intent.succeeded with auction metadata. Idempotent. */
  async handleSetupIntentSucceeded(
    intent: Stripe.SetupIntent,
  ): Promise<boolean> {
    const bidderId = intent.metadata?.auction_bidder_id;
    if (!bidderId) return false;
    const bidder = await this.loadBidder(bidderId);
    if (!bidder) return false;
    if (
      bidder.card_status === 'ready' &&
      bidder.stripe_payment_method_id === asId(intent.payment_method)
    ) {
      return true;
    }
    try {
      await this.applySetupIntent(intent, bidder);
      return true;
    } catch (err) {
      this.logger.warn(
        `setup_intent ${intent.id} not applied: ${safeError(err)}`,
      );
      return false;
    }
  }

  // ─── amounts and tax ──────────────────────────────────────────────────────

  private async billingAddress(
    paymentMethodId: string,
  ): Promise<Stripe.Tax.CalculationCreateParams.CustomerDetails.Address | null> {
    const method = await this.stripe.paymentMethods.retrieve(paymentMethodId);
    const a = method.billing_details?.address;
    if (!a?.country || !a.postal_code) return null;
    return {
      country: a.country,
      postal_code: a.postal_code,
      state: a.state ?? undefined,
      city: a.city ?? undefined,
      line1: a.line1 ?? undefined,
    };
  }

  /** Tax is 0 (with an audit row) when Stripe Tax is off or the bidder has no usable billing address. */
  private async calculateTax(
    order: PaymentOrder,
    bidder: PaymentBidder | null,
  ): Promise<{
    taxCents: number;
    calculationId: string | null;
    jurisdiction: Record<string, unknown> | null;
  }> {
    const none = { taxCents: 0, calculationId: null, jurisdiction: null };
    if (!this.taxEnabled) {
      await this.audit(order.auction_id, 'tax_skipped', order.id, {
        reason: 'stripe_tax_disabled',
      });
      return none;
    }
    try {
      const address = bidder?.stripe_payment_method_id
        ? await this.billingAddress(bidder.stripe_payment_method_id)
        : null;
      if (!address) {
        await this.audit(order.auction_id, 'tax_skipped', order.id, {
          reason: 'no_billing_address',
        });
        return none;
      }
      const items = await this.loadOrderItems(order.id);
      const calculation = await this.stripe.tax.calculations.create({
        currency: 'usd',
        line_items: items.map((item) => ({
          amount: item.price_cents,
          quantity: item.quantity,
          reference: item.id,
          tax_behavior: 'exclusive' as const,
          tax_code: item.tax_code || DEFAULT_TAX_CODE,
        })),
        customer_details: { address, address_source: 'billing' },
      });
      const breakdown = (calculation.tax_breakdown ?? []).map((b) => ({
        country: b.tax_rate_details?.country ?? null,
        state: b.tax_rate_details?.state ?? null,
        tax_type: b.tax_rate_details?.tax_type ?? null,
        rate_percent: b.tax_rate_details?.percentage_decimal ?? null,
        tax_cents: b.amount,
      }));
      return {
        taxCents: calculation.tax_amount_exclusive,
        calculationId: calculation.id,
        jurisdiction: { breakdown },
      };
    } catch (err) {
      this.logger.error(
        `Tax calculation failed for order ${order.id}: ${safeError(err)}`,
      );
      throw new TaxCalculationError('Tax calculation failed');
    }
  }

  /** Stores fee/tax amounts when unset; reuses stored ones otherwise so retries keep identical Stripe parameters. */
  async ensureAmounts(
    order: PaymentOrder,
    bidder: PaymentBidder | null,
  ): Promise<PaymentOrder> {
    if (order.total_cents > 0) return order;
    const tax = await this.calculateTax(order, bidder);
    const amounts = computeOrderAmounts({
      subtotalCents: order.subtotal_cents,
      taxCents: tax.taxCents,
      rate: Number(order.platform_fee_rate),
    });
    const args: SetOrderAmountsArgs = {
      p_order_id: order.id,
      p_tax_cents: amounts.taxCents,
      p_processing_fee_cents: amounts.processingFeeCents,
      p_platform_fee_cents: amounts.platformFeeCents,
      p_total_cents: amounts.totalCents,
      p_application_fee_cents: amounts.applicationFeeCents,
      p_tax_calculation_id: tax.calculationId,
      p_tax_jurisdiction: tax.jurisdiction,
    };
    const stored = await this.rpc<boolean>('set_auction_order_amounts', args);
    if (!stored) throw new ConflictException('Order is no longer chargeable.');
    return {
      ...order,
      tax_cents: amounts.taxCents,
      processing_fee_cents: amounts.processingFeeCents,
      platform_fee_cents: amounts.platformFeeCents,
      total_cents: amounts.totalCents,
      application_fee_cents: amounts.applicationFeeCents,
      tax_calculation_id: tax.calculationId,
    };
  }

  // ─── charging ─────────────────────────────────────────────────────────────

  /** Compare-and-swap lease for manual charges; claim_orders_for_charge does the same for the cron. */
  private async leaseOrder(
    order: PaymentOrder,
    statuses: string[],
  ): Promise<PaymentOrder | null> {
    const { data } = await this.admin
      .from('auction_orders')
      .update({
        status: 'charging',
        charge_attempts: order.charge_attempts + 1,
        claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('charge_attempts', order.charge_attempts)
      .in('status', statuses)
      .select('*')
      .maybeSingle();
    return (data as PaymentOrder | null) ?? null;
  }

  async chargeOrderNow(orderId: string): Promise<ChargeOutcome> {
    const order = await this.loadOrder(orderId);
    if (!order)
      return { orderId, status: 'skipped', message: 'Order not found' };
    if (order.status !== 'pending') {
      return {
        orderId,
        status: 'skipped',
        message: `Order is ${order.status}`,
      };
    }
    const claimed = await this.leaseOrder(order, ['pending']);
    if (!claimed) {
      return { orderId, status: 'skipped', message: 'Order already claimed' };
    }
    return this.chargeClaimedOrder(claimed);
  }

  async retryCharge(orderId: string): Promise<ChargeOutcome> {
    const order = await this.loadOrder(orderId);
    if (!order)
      return { orderId, status: 'skipped', message: 'Order not found' };
    if (!['failed', 'requires_action'].includes(order.status)) {
      return {
        orderId,
        status: 'skipped',
        message: `Order is ${order.status}`,
      };
    }
    if (new Date(order.pay_by_at).getTime() <= Date.now()) {
      return { orderId, status: 'skipped', message: 'Payment window ended' };
    }
    const claimed = await this.leaseOrder(order, ['failed', 'requires_action']);
    if (!claimed) {
      return { orderId, status: 'skipped', message: 'Order already claimed' };
    }
    return this.chargeClaimedOrder(claimed);
  }

  private async failOrder(
    order: PaymentOrder,
    failure: ChargeFailure,
    paymentIntentId?: string | null,
  ): Promise<ChargeOutcome> {
    if (paymentIntentId) {
      await this.updateOrder(order.id, {
        last_payment_intent_id: paymentIntentId,
      });
    }
    const args: MarkOrderFailedArgs = {
      p_order_id: order.id,
      p_error_code: failure.code,
      p_error_message: failure.message,
      p_requires_action: failure.requiresAction,
    };
    if (failure.retryAfterSeconds) {
      args.p_retry_after_seconds = failure.retryAfterSeconds;
    }
    const status = await this.rpc<string | null>(
      'mark_auction_order_failed',
      args,
    );
    return {
      orderId: order.id,
      status: status === 'requires_action' ? 'requires_action' : 'failed',
      message: failure.code,
    };
  }

  /**
   * Charges an order already leased to this worker (status 'charging').
   * The idempotency key depends only on charge_attempts, which changes only when
   * a fresh attempt is claimed, so crash recovery cannot double charge.
   */
  async chargeClaimedOrder(claimed: AuctionOrderRow): Promise<ChargeOutcome> {
    const orderId = claimed.id;
    let order = claimed as PaymentOrder;

    if (new Date(order.pay_by_at).getTime() <= Date.now()) {
      return this.failOrder(order, {
        code: 'grace_expired',
        message: 'Payment window ended',
        requiresAction: false,
      });
    }

    const [bidder, promoter] = await Promise.all([
      this.loadBidder(order.bidder_id),
      this.loadPromoter(order.promoter_account_id),
    ]);

    if (!promoterCanReceivePayments(promoter)) {
      return this.failOrder(order, {
        code: 'connect_unavailable',
        message: 'Payout account unavailable',
        requiresAction: false,
        retryAfterSeconds: INTERNAL_RETRY_SECONDS,
      });
    }
    if (
      !bidder?.stripe_customer_id ||
      !bidder.stripe_payment_method_id ||
      bidder.card_status !== 'ready'
    ) {
      return this.failOrder(order, {
        code: 'no_card_on_file',
        message: 'No saved card is available',
        requiresAction: true,
      });
    }

    try {
      order = await this.ensureAmounts(order, bidder);
    } catch (err) {
      if (err instanceof TaxCalculationError) {
        return this.failOrder(order, {
          code: 'tax_calculation_failed',
          message: 'Tax calculation failed',
          requiresAction: false,
          retryAfterSeconds: INTERNAL_RETRY_SECONDS,
        });
      }
      throw err;
    }

    let intent: Stripe.PaymentIntent;
    try {
      intent = await this.stripe.paymentIntents.create(
        {
          amount: order.total_cents,
          currency: 'usd',
          customer: bidder.stripe_customer_id,
          payment_method: bidder.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          application_fee_amount: order.application_fee_cents,
          transfer_data: { destination: promoter.stripe_account_id },
          metadata: {
            auction_order_id: order.id,
            auction_id: order.auction_id ?? '',
          },
          description: `Auction purchase: ${order.auction_title}`,
        },
        {
          idempotencyKey: `auction-order-${order.id}-a${order.charge_attempts}`,
        },
      );
    } catch (err) {
      const failure = classifyChargeError(err, order.charge_attempts);
      if (!failure) {
        // Unknown outcome: leave the attempt for the 15-minute claim recovery (same idempotency key).
        this.logger.warn(
          `Charge for order ${order.id} left for recovery: ${safeError(err)}`,
        );
        return {
          orderId,
          status: 'pending',
          message: 'Charge will be retried shortly',
        };
      }
      const failedIntent = (err as { payment_intent?: { id?: string } })
        .payment_intent;
      return this.failOrder(order, failure, failedIntent?.id);
    }

    await this.updateOrder(order.id, { last_payment_intent_id: intent.id });

    if (intent.status === 'processing') {
      return { orderId, status: 'pending', message: 'Payment is processing' };
    }
    if (intent.status !== 'succeeded') {
      const lastError = intent.last_payment_error;
      return this.failOrder(
        order,
        lastError
          ? classifyDecline(lastError, order.charge_attempts)
          : {
              code: 'authentication_required',
              message: 'Card needs authentication',
              requiresAction: true,
            },
        intent.id,
      );
    }

    await this.recordPayment(order.id, intent.id, intent.amount_received, {
      verifyAmount: false,
    });
    return { orderId, status: 'paid' };
  }

  // ─── recording payments ───────────────────────────────────────────────────

  private async createTaxTransaction(
    order: PaymentOrder,
  ): Promise<string | null> {
    if (!order.tax_calculation_id) return null;
    try {
      const transaction =
        await this.stripe.tax.transactions.createFromCalculation(
          { calculation: order.tax_calculation_id, reference: order.id },
          { idempotencyKey: `auction-tax-${order.id}` },
        );
      return transaction.id;
    } catch (err) {
      this.logger.error(
        `Tax transaction failed for order ${order.id}: ${safeError(err)}`,
      );
      await this.audit(order.auction_id, 'tax_transaction_failed', order.id, {
        calculation_id: order.tax_calculation_id,
      });
      return null;
    }
  }

  /**
   * Marks an order paid exactly once (the RPC returns true only for the call
   * that flips it), after creating the Stripe Tax transaction. Returns whether
   * this call flipped it. `verifyAmount` is set for webhook input, which must match the stored total.
   */
  async recordPayment(
    orderId: string,
    paymentIntentId: string,
    amountReceived: number,
    opts: { verifyAmount: boolean },
  ): Promise<boolean> {
    const order = await this.loadOrder(orderId);
    if (!order) return false;
    if (
      opts.verifyAmount &&
      (order.total_cents <= 0 || order.total_cents !== amountReceived)
    ) {
      this.logger.error(`Payment amount mismatch on order ${order.id}`);
      await this.audit(order.auction_id, 'payment_amount_mismatch', order.id, {
        expected_cents: order.total_cents,
        received_cents: amountReceived,
        payment_intent: paymentIntentId,
      });
      return false;
    }

    let transactionId = order.tax_transaction_id;
    if (!transactionId) transactionId = await this.createTaxTransaction(order);

    const args: MarkOrderPaidArgs = {
      p_order_id: order.id,
      p_payment_intent: paymentIntentId,
      p_amount_received_cents: amountReceived,
      p_tax_transaction_id: transactionId,
    };
    const changed = await this.rpc<boolean>('mark_auction_order_paid', args);
    if (!changed && transactionId && !order.tax_transaction_id) {
      await this.updateOrder(order.id, { tax_transaction_id: transactionId });
    }
    return changed;
  }

  // ─── webhooks (called only for auction-keyed events) ──────────────────────

  async handlePaymentIntentSucceeded(
    intent: Stripe.PaymentIntent,
  ): Promise<boolean> {
    const orderId = intent.metadata?.auction_order_id;
    if (!orderId) return false;
    const order = await this.loadOrder(orderId);
    if (!order) return false;
    const promoter = await this.loadPromoter(order.promoter_account_id);
    const destination = asId(intent.transfer_data?.destination);
    if (
      !promoter?.stripe_account_id ||
      destination !== promoter.stripe_account_id
    ) {
      this.logger.error(`PaymentIntent destination mismatch on ${order.id}`);
      await this.audit(
        order.auction_id,
        'payment_destination_mismatch',
        order.id,
        {
          payment_intent: intent.id,
        },
      );
      return false;
    }
    return this.recordPayment(order.id, intent.id, intent.amount_received, {
      verifyAmount: true,
    });
  }

  /**
   * payment_intent.payment_failed only records an audit row. Failures of the
   * off-session charge are already recorded inline; failures inside a pay-link
   * Checkout are retried by the buyer in the same session. The exception is a
   * charge that was 'processing' when we left it: its failure is applied here.
   */
  async handlePaymentIntentFailed(
    intent: Stripe.PaymentIntent,
  ): Promise<boolean> {
    const orderId = intent.metadata?.auction_order_id;
    if (!orderId) return false;
    const order = await this.loadOrder(orderId);
    if (!order) return false;

    if (
      !(await this.auditExists(
        'payment_intent_failed',
        order.id,
        'payment_intent',
        intent.id,
      ))
    ) {
      await this.audit(
        order.auction_id,
        'payment_intent_failed',
        order.id,
        {
          payment_intent: intent.id,
          code: intent.last_payment_error?.code ?? null,
          decline_code: intent.last_payment_error?.decline_code ?? null,
        },
        'webhook',
      );
    }

    if (
      order.status === 'charging' &&
      order.last_payment_intent_id === intent.id &&
      intent.last_payment_error
    ) {
      await this.failOrder(
        order,
        classifyDecline(intent.last_payment_error, order.charge_attempts),
        intent.id,
      );
    }
    return true;
  }

  async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<boolean> {
    const orderId = session.metadata?.auction_order_id;
    if (!orderId || session.payment_status !== 'paid') return false;
    const intentId = asId(session.payment_intent);
    if (!intentId) return false;
    return this.recordPayment(orderId, intentId, session.amount_total ?? 0, {
      verifyAmount: true,
    });
  }

  private async findOrderByIntent(
    intentId: string | null,
    metadataOrderId?: string,
  ): Promise<PaymentOrder | null> {
    if (metadataOrderId) {
      const byId = await this.loadOrder(metadataOrderId);
      if (byId) return byId;
    }
    if (!intentId) return null;
    const { data } = await this.admin
      .from('auction_orders')
      .select('*')
      .eq('stripe_payment_intent_id', intentId)
      .maybeSingle();
    return (data as PaymentOrder | null) ?? null;
  }

  /** charge.refunded: record and flag only; refunds are issued in the Stripe dashboard. */
  async handleChargeRefunded(charge: Stripe.Charge): Promise<boolean> {
    const order = await this.findOrderByIntent(
      asId(charge.payment_intent),
      charge.metadata?.auction_order_id,
    );
    if (!order) return false;
    const reason = charge.refunded ? 'refunded' : 'partially_refunded';
    if (
      !(await this.auditExists(
        'order_refund_recorded',
        order.id,
        'amount_refunded_cents',
        String(charge.amount_refunded),
      ))
    ) {
      await this.audit(
        order.auction_id,
        'order_refund_recorded',
        order.id,
        {
          charge: charge.id,
          amount_refunded_cents: charge.amount_refunded,
          fully_refunded: charge.refunded,
        },
        'webhook',
      );
    }
    await this.updateOrder(order.id, {
      flag_reason: reason,
      flagged_at: new Date().toISOString(),
    });
    return true;
  }

  /** charge.dispute.created: record, flag and alert the promoter through the outbox. */
  async handleDisputeCreated(dispute: Stripe.Dispute): Promise<boolean> {
    let intentId = asId(dispute.payment_intent);
    if (!intentId) {
      const charge = await this.stripe.charges.retrieve(asId(dispute.charge)!);
      intentId = asId(charge.payment_intent);
    }
    const order = await this.findOrderByIntent(intentId);
    if (!order) return false;
    if (
      await this.auditExists(
        'order_dispute_opened',
        order.id,
        'dispute',
        dispute.id,
      )
    ) {
      return true;
    }
    await this.audit(
      order.auction_id,
      'order_dispute_opened',
      order.id,
      {
        dispute: dispute.id,
        reason: dispute.reason,
        amount_cents: dispute.amount,
      },
      'webhook',
    );
    await this.updateOrder(order.id, {
      flag_reason: 'disputed',
      flagged_at: new Date().toISOString(),
    });
    await this.admin.from('auction_outbox').insert({
      auction_id: order.auction_id,
      order_id: order.id,
      bidder_id: order.bidder_id,
      kind: 'dispute_opened',
      payload: { amount_cents: dispute.amount, reason: dispute.reason },
    });
    return true;
  }

  // ─── pay link ─────────────────────────────────────────────────────────────

  /** Issues a fresh single-use-per-send token; earlier links stop working. Only the hash is stored. */
  async issuePayLink(
    order: PaymentOrder,
  ): Promise<{ url: string; expiresAt: string }> {
    const { token, hash } = newPayToken();
    const { data, error } = await this.admin
      .from('auction_orders')
      .update({
        pay_token_hash: hash,
        pay_token_expires_at: order.pay_by_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .in('status', [...PAYABLE_ORDER_STATUSES])
      .select('id');
    if (error || !data?.length) {
      throw new ConflictException('Order can no longer be paid.');
    }
    return {
      url: `${this.frontendUrl}/auctions/pay/${token}`,
      expiresAt: order.pay_by_at,
    };
  }

  async sendPayLink(orderId: string): Promise<{ sent: boolean }> {
    const order = await this.loadOrder(orderId);
    if (
      !order ||
      !PAYABLE_ORDER_STATUSES.has(order.status) ||
      new Date(order.pay_by_at).getTime() <= Date.now()
    ) {
      return { sent: false };
    }
    const bidder = await this.loadBidder(order.bidder_id);
    const { url } = await this.issuePayLink(order);
    await this.mail.sendPayLink({
      to: order.buyer_email,
      name: firstName(order.buyer_name),
      auctionTitle: order.auction_title,
      totalOrSubtotalCents: order.total_cents || order.subtotal_cents,
      payUrl: url,
      payByAt: order.pay_by_at,
      willRetry: false,
      reason: 'requested',
    });
    if (bidder) {
      await this.sms.send(
        bidder,
        `EventEcos: your auction payment is ready. Pay here: ${url}`,
      );
    }
    await this.audit(order.auction_id, 'pay_link_sent', order.id, {});
    return { sent: true };
  }

  private async findOrderByToken(token: string): Promise<PaymentOrder> {
    if (!isWellFormedPayToken(token ?? '')) {
      throw new NotFoundException('Payment link not found');
    }
    const { data } = await this.admin
      .from('auction_orders')
      .select('*')
      .eq('pay_token_hash', hashPayToken(token))
      .maybeSingle();
    const order = data as PaymentOrder | null;
    if (!order) throw new NotFoundException('Payment link not found');
    const expiry = order.pay_token_expires_at ?? order.pay_by_at;
    if (new Date(expiry).getTime() <= Date.now()) {
      throw new GoneException('This payment link has expired.');
    }
    return order;
  }

  async getPaySummary(token: string) {
    const order = await this.findOrderByToken(token);
    const items = await this.loadOrderItems(order.id);
    const payable =
      PAYABLE_ORDER_STATUSES.has(order.status) &&
      new Date(order.pay_by_at).getTime() > Date.now();
    return {
      auctionTitle: order.auction_title,
      organization: order.org_name,
      firstName: firstName(order.buyer_name),
      maskedEmail: maskEmail(order.buyer_email),
      status: order.status,
      payable,
      paid: order.status === 'paid',
      payBy: order.pay_by_at,
      items: items.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        priceCents: i.price_cents,
      })),
      subtotalCents: order.subtotal_cents,
      // Fees and tax are fixed when the charge is first prepared.
      amounts:
        order.total_cents > 0
          ? {
              taxCents: order.tax_cents,
              processingFeeCents: order.processing_fee_cents,
              platformFeeCents: order.platform_fee_cents,
              totalCents: order.total_cents,
            }
          : null,
    };
  }

  /** Cancels any PaymentIntent still open for the order so the buyer cannot be charged twice. */
  private async cancelOpenIntents(order: PaymentOrder): Promise<void> {
    const ids = new Set<string>();
    if (order.last_payment_intent_id) ids.add(order.last_payment_intent_id);
    try {
      const found = await this.stripe.paymentIntents.search({
        query: `metadata['auction_order_id']:'${order.id}'`,
        limit: 20,
      });
      for (const intent of found.data) ids.add(intent.id);
    } catch (err) {
      this.logger.warn(`PaymentIntent search failed: ${safeError(err)}`);
    }
    for (const id of ids) {
      const intent = await this.stripe.paymentIntents.retrieve(id);
      if (intent.status === 'canceled') continue;
      if (intent.status === 'succeeded') {
        await this.recordPayment(order.id, intent.id, intent.amount_received, {
          verifyAmount: true,
        });
        throw new ConflictException('This order has already been paid.');
      }
      if (intent.status === 'processing') {
        throw new ConflictException('A payment is already being processed.');
      }
      await this.stripe.paymentIntents.cancel(id);
    }
  }

  async createPayCheckout(token: string): Promise<{ url: string }> {
    const order = await this.findOrderByToken(token);
    if (order.status === 'paid') {
      throw new ConflictException('This order has already been paid.');
    }
    if (
      !PAYABLE_ORDER_STATUSES.has(order.status) ||
      new Date(order.pay_by_at).getTime() <= Date.now()
    ) {
      throw new ConflictException('This order can no longer be paid online.');
    }

    // Stop automatic card retries before the buyer can pay another way.
    if (order.status !== 'requires_action') {
      const { data: held } = await this.admin
        .from('auction_orders')
        .update({
          status: 'requires_action',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .in('status', ['pending', 'failed'])
        .select('id');
      if (!held?.length) {
        throw new ConflictException('A payment is already in progress.');
      }
    }

    const [bidder, promoter] = await Promise.all([
      this.loadBidder(order.bidder_id),
      this.loadPromoter(order.promoter_account_id),
    ]);
    if (!promoterCanReceivePayments(promoter)) {
      throw new ServiceUnavailableException(
        'Payments are not available for this organization right now.',
      );
    }

    await this.cancelOpenIntents(order);

    let ready: PaymentOrder;
    try {
      ready = await this.ensureAmounts(order, bidder);
    } catch (err) {
      if (err instanceof TaxCalculationError) {
        throw new ServiceUnavailableException(
          'Could not calculate sales tax. Please try again shortly.',
        );
      }
      throw err;
    }

    if (ready.stripe_checkout_session_id) {
      try {
        await this.stripe.checkout.sessions.expire(
          ready.stripe_checkout_session_id,
        );
      } catch {
        // Already expired or completed.
      }
    }

    const items = await this.loadOrderItems(ready.id);
    const itemTotal = items.reduce((sum, i) => sum + i.price_cents, 0);
    const line = (name: string, cents: number) => ({
      price_data: {
        currency: 'usd',
        product_data: { name },
        unit_amount: cents,
      },
      quantity: 1,
    });
    const lineItems =
      itemTotal === ready.subtotal_cents
        ? items.map((i) =>
            line(
              i.quantity > 1 ? `${i.title} (x${i.quantity})` : i.title,
              i.price_cents,
            ),
          )
        : [
            line(
              `Auction purchase: ${ready.auction_title}`,
              ready.subtotal_cents,
            ),
          ];
    if (ready.tax_cents > 0) lineItems.push(line('Sales tax', ready.tax_cents));
    if (ready.processing_fee_cents > 0) {
      lineItems.push(line('Processing fee', ready.processing_fee_cents));
    }
    if (ready.platform_fee_cents > 0) {
      lineItems.push(line('Platform fee', ready.platform_fee_cents));
    }

    const metadata = {
      auction_order_id: ready.id,
      auction_id: ready.auction_id ?? '',
    };
    const base = `${this.frontendUrl}/auctions/pay/${token}`;
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        ...(bidder?.stripe_customer_id
          ? { customer: bidder.stripe_customer_id }
          : { customer_email: ready.buyer_email }),
        automatic_tax: { enabled: false },
        line_items: lineItems,
        payment_intent_data: {
          application_fee_amount: ready.application_fee_cents,
          transfer_data: { destination: promoter.stripe_account_id },
          metadata,
        },
        metadata,
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SECONDS,
        success_url: `${base}?success=true`,
        cancel_url: `${base}?canceled=true`,
      },
      {
        idempotencyKey: `auction-checkout-${ready.id}-${Math.floor(Date.now() / 60_000)}`,
      },
    );
    await this.updateOrder(ready.id, {
      stripe_checkout_session_id: session.id,
    });
    if (!session.url) {
      throw new ServiceUnavailableException('Could not start checkout.');
    }
    return { url: session.url };
  }

  // ─── card retention ───────────────────────────────────────────────────────

  /** Detaches saved cards 60 days after the bidder's last order was settled (no open orders, nothing recent). */
  async detachStaleCards(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(
      now.getTime() - CARD_RETENTION_DAYS * 86_400_000,
    ).toISOString();
    const { data: auctions } = await this.admin
      .from('auctions')
      .select('id')
      .eq('status', 'settled')
      .lt('settled_at', cutoff)
      .limit(100);
    const auctionIds = ((auctions ?? []) as Array<{ id: string }>).map(
      (a) => a.id,
    );
    if (auctionIds.length === 0) return 0;

    const { data: bidders } = await this.admin
      .from('auction_bidders')
      .select('id, stripe_payment_method_id')
      .in('auction_id', auctionIds)
      .not('stripe_payment_method_id', 'is', null)
      .limit(200);

    let detached = 0;
    for (const bidder of (bidders ?? []) as Array<{
      id: string;
      stripe_payment_method_id: string;
    }>) {
      try {
        const { count: open } = await this.admin
          .from('auction_orders')
          .select('id', { count: 'exact', head: true })
          .eq('bidder_id', bidder.id)
          .in('status', OPEN_ORDER_STATUSES);
        if ((open ?? 0) > 0) continue;
        const { count: recent } = await this.admin
          .from('auction_orders')
          .select('id', { count: 'exact', head: true })
          .eq('bidder_id', bidder.id)
          .gte('updated_at', cutoff);
        if ((recent ?? 0) > 0) continue;

        try {
          await this.stripe.paymentMethods.detach(
            bidder.stripe_payment_method_id,
          );
        } catch (err) {
          if ((err as { code?: string }).code !== 'resource_missing') throw err;
        }
        await this.admin
          .from('auction_bidders')
          .update({
            stripe_payment_method_id: null,
            card_brand: null,
            card_last4: null,
            card_status: 'none',
            card_detached_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', bidder.id);
        detached += 1;
      } catch (err) {
        this.logger.warn(
          `Card detach failed for bidder ${bidder.id}: ${safeError(err)}`,
        );
      }
    }
    return detached;
  }
}
