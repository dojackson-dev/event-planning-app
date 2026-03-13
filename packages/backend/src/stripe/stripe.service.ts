import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
    }
    this.stripe = new Stripe(secretKey);
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  // ─── Customer ─────────────────────────────────────────────────────────────

  /**
   * Create a Stripe customer for an owner and persist stripe_customer_id.
   * Returns the existing customer ID if already created.
   */
  async createOrRetrieveCustomer(
    ownerAccountId: string,
    email: string,
    businessName: string,
  ): Promise<string> {
    const admin = this.supabaseService.getAdminClient();

    const { data: owner } = await admin
      .from('owner_accounts')
      .select('stripe_customer_id')
      .eq('id', ownerAccountId)
      .single();

    if (owner?.stripe_customer_id) {
      return owner.stripe_customer_id;
    }

    const customer = await this.stripe.customers.create({
      email,
      name: businessName,
      metadata: { owner_account_id: ownerAccountId },
    });

    await admin
      .from('owner_accounts')
      .update({ stripe_customer_id: customer.id })
      .eq('id', ownerAccountId);

    this.logger.log(`Created Stripe customer ${customer.id} for owner ${ownerAccountId}`);
    return customer.id;
  }

  // ─── Checkout ─────────────────────────────────────────────────────────────

  /**
   * Create a Stripe Checkout session for a subscription plan.
   * @param ownerAccountId  UUID of the owner_accounts row
   * @param priceId         Stripe Price ID (e.g. price_xxx)
   * @param email           Owner email address
   * @param businessName    Business name for Stripe customer
   * @returns Checkout session URL
   */
  async createCheckoutSession(
    ownerAccountId: string,
    priceId: string,
    email: string,
    businessName: string,
  ): Promise<string> {
    const customerId = await this.createOrRetrieveCustomer(ownerAccountId, email, businessName);

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${this.frontendUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}&subscribed=true`,
      cancel_url: `${this.frontendUrl}/billing?canceled=true`,
      client_reference_id: ownerAccountId,
      subscription_data: {
        metadata: { owner_account_id: ownerAccountId },
      },
    });

    this.logger.log(`Created checkout session ${session.id} for owner ${ownerAccountId}`);
    return session.url!;
  }

  // ─── Billing Portal ────────────────────────────────────────────────────────

  /**
   * Create a Stripe Customer Portal session for managing subscriptions.
   */
  async createBillingPortalSession(ownerAccountId: string): Promise<string> {
    const admin = this.supabaseService.getAdminClient();
    const { data: owner } = await admin
      .from('owner_accounts')
      .select('stripe_customer_id')
      .eq('id', ownerAccountId)
      .single();

    if (!owner?.stripe_customer_id) {
      throw new Error('No Stripe customer found for this owner. Complete a checkout first.');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: owner.stripe_customer_id,
      return_url: `${this.frontendUrl}/billing`,
    });

    return session.url;
  }

  // ─── Webhooks ──────────────────────────────────────────────────────────────

  /**
   * Verify Stripe webhook signature and process the event.
   * @param rawBody   Raw Buffer from the request (required for signature check)
   * @param signature Value of the stripe-signature header
   */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    if (this.webhookSecret) {
      try {
        event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
      } catch (err) {
        this.logger.error('Webhook signature verification failed', (err as Error).message);
        throw new Error(`Webhook error: ${(err as Error).message}`);
      }
    } else {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature verification (dev mode)');
      event = JSON.parse(rawBody.toString()) as Stripe.Event;
    }

    this.logger.log(`Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'account.updated':
        await this.handleConnectAccountUpdated(event.data.object as Stripe.Account);
        break;
      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }
  }

  // ─── Subscription Status ───────────────────────────────────────────────────

  /**
   * Retrieve the current subscription state for an owner from the database.
   */
  async getSubscriptionStatus(ownerAccountId: string): Promise<{
    status: string;
    planId: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  }> {
    const admin = this.supabaseService.getAdminClient();
    const { data: owner, error } = await admin
      .from('owner_accounts')
      .select('subscription_status, plan_id, stripe_customer_id, stripe_subscription_id')
      .eq('id', ownerAccountId)
      .single();

    if (error || !owner) {
      return { status: 'none', planId: null, stripeCustomerId: null, stripeSubscriptionId: null };
    }

    return {
      status: owner.subscription_status ?? 'inactive',
      planId: owner.plan_id ?? null,
      stripeCustomerId: owner.stripe_customer_id ?? null,
      stripeSubscriptionId: owner.stripe_subscription_id ?? null,
    };
  }

  // ─── Private Webhook Handlers ──────────────────────────────────────────────

  private async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const ownerAccountId = session.client_reference_id;
    if (!ownerAccountId) return;

    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription as Stripe.Subscription | null)?.id ?? null;

    await this.syncSubscriptionToDb(ownerAccountId, subscriptionId, 'active');
    this.logger.log(`Checkout complete — owner ${ownerAccountId} is now active`);
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const ownerAccountId = subscription.metadata?.owner_account_id;
    const priceId = subscription.items.data[0]?.price?.id ?? null;

    if (ownerAccountId) {
      await this.syncSubscriptionToDb(ownerAccountId, subscription.id, subscription.status, priceId);
    } else {
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : (subscription.customer as Stripe.Customer).id;
      await this.syncByCustomerId(customerId, subscription.id, subscription.status, priceId);
    }
  }

  private async handleSubscriptionCanceled(subscription: Stripe.Subscription): Promise<void> {
    const ownerAccountId = subscription.metadata?.owner_account_id;
    if (ownerAccountId) {
      await this.syncSubscriptionToDb(ownerAccountId, subscription.id, 'canceled');
    } else {
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : (subscription.customer as Stripe.Customer).id;
      await this.syncByCustomerId(customerId, subscription.id, 'canceled', null);
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : (invoice.customer as Stripe.Customer | null)?.id;
    if (!customerId) return;
    await this.syncByCustomerId(customerId, null, 'past_due', null);
    this.logger.warn(`Payment failed for Stripe customer ${customerId}`);
  }

  // ─── DB Sync Helpers ───────────────────────────────────────────────────────

  private async syncSubscriptionToDb(
    ownerAccountId: string,
    subscriptionId: string | null,
    status: string,
    planId?: string | null,
  ): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const update: Record<string, unknown> = { subscription_status: status };
    if (subscriptionId) update.stripe_subscription_id = subscriptionId;
    if (planId !== undefined) update.plan_id = planId;

    const { error } = await admin
      .from('owner_accounts')
      .update(update)
      .eq('id', ownerAccountId);

    if (error) {
      this.logger.error(`Failed to sync subscription for owner ${ownerAccountId}`, error);
    }
  }

  private async syncByCustomerId(
    stripeCustomerId: string,
    subscriptionId: string | null,
    status: string,
    planId: string | null,
  ): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const update: Record<string, unknown> = { subscription_status: status };
    if (subscriptionId) update.stripe_subscription_id = subscriptionId;
    if (planId) update.plan_id = planId;

    const { error } = await admin
      .from('owner_accounts')
      .update(update)
      .eq('stripe_customer_id', stripeCustomerId);

    if (error) {
      this.logger.error(`Failed to sync subscription for Stripe customer ${stripeCustomerId}`, error);
    }
  }

  // ─── Stripe Connect ────────────────────────────────────────────────────────

  private readonly APP_FEE_RATE = 0.015; // 1.5% DoVenueSuite fee

  /**
   * Create (or retrieve) a Stripe Connect Express account for an owner,
   * then return a one-time onboarding URL.
   */
  async createOwnerConnectOnboarding(userId: string, email: string): Promise<string> {
    const admin = this.supabaseService.getAdminClient();

    const { data: owner } = await admin
      .from('owner_accounts')
      .select('id, stripe_connect_id, stripe_connect_status')
      .eq('primary_owner_id', userId)
      .maybeSingle();

    if (!owner) throw new Error('Owner account not found');

    let connectId = owner.stripe_connect_id;

    if (!connectId) {
      const account = await this.stripe.accounts.create({
        type: 'express',
        email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { owner_account_id: String(owner.id) },
      });
      connectId = account.id;

      await admin
        .from('owner_accounts')
        .update({ stripe_connect_id: connectId, stripe_connect_status: 'pending' })
        .eq('id', owner.id);
    }

    const accountLink = await this.stripe.accountLinks.create({
      account: connectId,
      refresh_url: `${this.frontendUrl}/dashboard/settings?connect=refresh&role=owner`,
      return_url: `${this.frontendUrl}/dashboard/settings?connect=success&role=owner`,
      type: 'account_onboarding',
    });

    return accountLink.url;
  }

  /**
   * Create (or retrieve) a Stripe Connect Express account for a vendor,
   * then return a one-time onboarding URL.
   */
  async createVendorConnectOnboarding(userId: string, email: string): Promise<string> {
    const admin = this.supabaseService.getAdminClient();

    const { data: vendor } = await admin
      .from('vendor_accounts')
      .select('id, stripe_account_id, stripe_connect_status')
      .eq('user_id', userId)
      .maybeSingle();

    if (!vendor) throw new Error('Vendor account not found');

    let connectId = vendor.stripe_account_id;

    if (!connectId) {
      const account = await this.stripe.accounts.create({
        type: 'express',
        email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { vendor_account_id: vendor.id },
      });
      connectId = account.id;

      await admin
        .from('vendor_accounts')
        .update({ stripe_account_id: connectId, stripe_connect_status: 'pending' })
        .eq('id', vendor.id);
    }

    const accountLink = await this.stripe.accountLinks.create({
      account: connectId,
      refresh_url: `${this.frontendUrl}/vendors/dashboard?connect=refresh`,
      return_url: `${this.frontendUrl}/vendors/dashboard?connect=success`,
      type: 'account_onboarding',
    });

    return accountLink.url;
  }

  /**
   * Get the Connect account status for an owner.
   */
  async getOwnerConnectStatus(userId: string): Promise<{ status: string; connectId: string | null }> {
    const admin = this.supabaseService.getAdminClient();
    const { data } = await admin
      .from('owner_accounts')
      .select('stripe_connect_id, stripe_connect_status')
      .eq('primary_owner_id', userId)
      .maybeSingle();

    return {
      status: data?.stripe_connect_status ?? 'not_connected',
      connectId: data?.stripe_connect_id ?? null,
    };
  }

  /**
   * Get the Connect account status for a vendor.
   */
  async getVendorConnectStatus(userId: string): Promise<{ status: string; connectId: string | null }> {
    const admin = this.supabaseService.getAdminClient();
    const { data } = await admin
      .from('vendor_accounts')
      .select('stripe_account_id, stripe_connect_status')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      status: data?.stripe_connect_status ?? 'not_connected',
      connectId: data?.stripe_account_id ?? null,
    };
  }

  /**
   * Charge a client and route funds to an owner's Connect account.
   * DoVenueSuite takes 1.5% as application_fee_amount.
   *
   * Flow: Client card → Stripe → DoVenueSuite takes 1.5% → owner receives the rest
   * Returns a PaymentIntent client_secret for the frontend to complete payment.
   */
  async createClientPaymentIntent(
    amountCents: number,
    ownerUserId: string,
    description: string,
  ): Promise<{ clientSecret: string; paymentIntentId: string; feeCents: number }> {
    const admin = this.supabaseService.getAdminClient();

    const { data: owner } = await admin
      .from('owner_accounts')
      .select('id, stripe_connect_id, stripe_connect_status')
      .eq('primary_owner_id', ownerUserId)
      .maybeSingle();

    if (!owner?.stripe_connect_id || owner.stripe_connect_status !== 'active') {
      throw new Error('Owner has not completed Stripe Connect onboarding');
    }

    const feeCents = Math.round(amountCents * this.APP_FEE_RATE);

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      application_fee_amount: feeCents,
      transfer_data: { destination: owner.stripe_connect_id },
      description,
      metadata: { owner_account_id: String(owner.id) },
    });

    // Record in stripe_payments ledger
    await admin.from('stripe_payments').insert({
      type: 'client_to_owner',
      amount_cents: amountCents,
      fee_cents: feeCents,
      net_cents: amountCents - feeCents,
      stripe_payment_intent_id: paymentIntent.id,
      owner_account_id: owner.id,
      description,
      status: 'pending',
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      feeCents,
    };
  }

  /**
   * Transfer funds from owner to vendor for a completed booking.
   * DoVenueSuite takes 1.5% as fee (paid by vendor — deducted from transfer).
   *
   * Flow: Owner's balance → transfer to vendor → DoVenueSuite keeps 1.5%
   */
  async payVendor(
    amountCents: number,
    ownerUserId: string,
    vendorAccountId: string,
    vendorBookingId: string,
    description: string,
  ): Promise<{ transferId: string; feeCents: number; netCents: number }> {
    const admin = this.supabaseService.getAdminClient();

    const { data: owner } = await admin
      .from('owner_accounts')
      .select('id, stripe_connect_id')
      .eq('primary_owner_id', ownerUserId)
      .maybeSingle();

    const { data: vendor } = await admin
      .from('vendor_accounts')
      .select('stripe_account_id, stripe_connect_status')
      .eq('id', vendorAccountId)
      .maybeSingle();

    if (!vendor?.stripe_account_id || vendor.stripe_connect_status !== 'active') {
      throw new Error('Vendor has not completed Stripe Connect onboarding');
    }

    const feeCents = Math.round(amountCents * this.APP_FEE_RATE);
    const netCents = amountCents - feeCents;

    // Transfer net amount to vendor; fee stays on platform
    const transfer = await this.stripe.transfers.create({
      amount: netCents,
      currency: 'usd',
      destination: vendor.stripe_account_id,
      description,
      metadata: {
        owner_account_id: owner ? String(owner.id) : '',
        vendor_account_id: vendorAccountId,
        vendor_booking_id: vendorBookingId,
      },
    });

    await admin.from('stripe_payments').insert({
      amount_cents: amountCents,
      fee_cents: feeCents,
      net_cents: netCents,
      stripe_transfer_id: transfer.id,
      owner_account_id: owner?.id ?? null,
      vendor_account_id: vendorAccountId,
      vendor_booking_id: vendorBookingId,
      description,
      status: 'succeeded',
    });

    this.logger.log(`Vendor payout ${transfer.id}: $${(netCents / 100).toFixed(2)} to ${vendor.stripe_account_id}`);

    return { transferId: transfer.id, feeCents, netCents };
  }

  /**
   * Create a Stripe Checkout session (one-time payment) for an invoice.
   * Returns a hosted payment URL the owner can send directly to the client.
   */
  async createInvoicePaymentLink(
    invoiceId: string,
    amountCents: number,
    description: string,
    ownerUserId: string,
  ): Promise<string> {
    const admin = this.supabaseService.getAdminClient();

    const { data: owner } = await admin
      .from('owner_accounts')
      .select('id, stripe_connect_id, stripe_connect_status')
      .eq('primary_owner_id', ownerUserId)
      .maybeSingle();

    const hasConnect = owner?.stripe_connect_id && owner?.stripe_connect_status === 'active';

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: { name: description || 'Invoice Payment' },
        },
        quantity: 1,
      }],
      success_url: `${this.frontendUrl}/dashboard/invoices/${invoiceId}?paid=true`,
      cancel_url: `${this.frontendUrl}/dashboard/invoices/${invoiceId}?canceled=true`,
      client_reference_id: invoiceId,
      metadata: { invoice_id: invoiceId },
    };

    if (hasConnect) {
      const feeCents = Math.round(amountCents * this.APP_FEE_RATE);
      sessionParams.payment_intent_data = {
        application_fee_amount: feeCents,
        transfer_data: { destination: owner!.stripe_connect_id! },
      };
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);
    this.logger.log(`Created invoice payment link for invoice ${invoiceId}: ${session.url}`);
    return session.url!;
  }

  /**
   * Handle account.updated webhook — mark Connect account active when onboarding complete.
   */
  async handleConnectAccountUpdated(account: Stripe.Account): Promise<void> {
    const isActive =
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled;

    const newStatus = isActive ? 'active' : 'pending';
    const admin = this.supabaseService.getAdminClient();

    // Check owner_accounts
    if (account.metadata?.owner_account_id) {
      await admin
        .from('owner_accounts')
        .update({ stripe_connect_status: newStatus })
        .eq('id', account.metadata.owner_account_id);
      this.logger.log(`Owner Connect ${account.id} → ${newStatus}`);
      return;
    }

    // Check vendor_accounts
    if (account.metadata?.vendor_account_id) {
      await admin
        .from('vendor_accounts')
        .update({ stripe_connect_status: newStatus })
        .eq('id', account.metadata.vendor_account_id);
      this.logger.log(`Vendor Connect ${account.id} → ${newStatus}`);
      return;
    }

    // Fallback: match by stripe_account_id / stripe_connect_id
    await admin
      .from('owner_accounts')
      .update({ stripe_connect_status: newStatus })
      .eq('stripe_connect_id', account.id);

    await admin
      .from('vendor_accounts')
      .update({ stripe_connect_status: newStatus })
      .eq('stripe_account_id', account.id);
  }
}
