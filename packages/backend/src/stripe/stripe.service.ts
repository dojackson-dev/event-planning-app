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
}
