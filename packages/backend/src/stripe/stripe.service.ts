import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SupabaseService } from '../supabase/supabase.service';
import { VendorInvoicesService } from '../vendor-invoices/vendor-invoices.service';
import { AffiliatesService } from '../affiliates/affiliates.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    private readonly vendorInvoicesService: VendorInvoicesService,
    @Inject(forwardRef(() => AffiliatesService))
    private readonly affiliatesService: AffiliatesService,
    private readonly smsNotifications: SmsNotificationsService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
    }
    this.stripe = new Stripe(secretKey);
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://dovenuesuite.com');
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

  // ─── Client Invoice Payment ────────────────────────────────────────────────

  /**
   * Create a Stripe Checkout session for a client paying a specific invoice.
   * Funds route to the owner's Connect account (if connected), or directly to platform.
   * On checkout.session.completed the webhook calls markInvoicePaid automatically.
   */
  async createInvoiceCheckoutSession(
    invoiceId: string,
    clientName: string,
  ): Promise<string> {
    const admin = this.supabaseService.getAdminClient();

    const { data: invoice } = await admin
      .from('invoices')
      .select('id, invoice_number, total_amount, amount_due, amount_paid, owner_id, client_name')
      .eq('id', invoiceId)
      .maybeSingle();

    if (!invoice) throw new Error('Invoice not found');
    if (invoice.amount_due <= 0) throw new Error('Invoice is already fully paid');

    const amountCents = Math.round(Number(invoice.amount_due) * 100);
    if (amountCents < 50) throw new Error('Amount too small to process');

    // Resolve owner's Stripe Connect ID (if any) for transfer_data
    let transferData: Stripe.Checkout.SessionCreateParams['payment_intent_data'] | undefined;
    if (invoice.owner_id) {
      const owner = await this.getOwnerAccountByUserId(invoice.owner_id, admin);
      if (!owner) {
        // Try direct owner_accounts lookup by id
        const { data: ownerById } = await admin
          .from('owner_accounts')
          .select('stripe_connect_id, stripe_connect_status')
          .eq('id', invoice.owner_id)
          .maybeSingle();
        if (ownerById?.stripe_connect_id && ownerById.stripe_connect_status === 'active') {
          const feeCents = Math.round(amountCents * this.APP_FEE_RATE);
          transferData = {
            application_fee_amount: feeCents,
            transfer_data: { destination: ownerById.stripe_connect_id },
          };
        }
      } else if (owner.stripe_connect_id && owner.stripe_connect_status === 'active') {
        const feeCents = Math.round(amountCents * this.APP_FEE_RATE);
        transferData = {
          application_fee_amount: feeCents,
          transfer_data: { destination: owner.stripe_connect_id },
        };
      }
    }

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: `Invoice #${invoice.invoice_number}`,
              description: `Payment from ${clientName || invoice.client_name || 'Client'}`,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${this.frontendUrl}/client-portal/invoices?paid=true&invoice=${invoice.invoice_number}`,
      cancel_url: `${this.frontendUrl}/client-portal/invoices?canceled=true`,
      metadata: { invoice_id: invoiceId },
      ...(transferData ? { payment_intent_data: transferData } : {}),
    });

    this.logger.log(`Created invoice checkout session ${session.id} for invoice ${invoiceId}`);
    return session.url!;
  }

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
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
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
    planName: string | null;
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
      return { status: 'none', planId: null, planName: null, stripeCustomerId: null, stripeSubscriptionId: null };
    }

    // Look up the plan name from Stripe using the price ID
    let planName: string | null = null;
    if (owner.plan_id) {
      try {
        const price = await this.stripe.prices.retrieve(owner.plan_id, { expand: ['product'] });
        const product = price.product as Stripe.Product;
        planName = product?.name ?? null;
      } catch {
        // Non-fatal — just leave planName null
      }
    }

    return {
      status: owner.subscription_status ?? 'inactive',
      planId: owner.plan_id ?? null,
      planName,
      stripeCustomerId: owner.stripe_customer_id ?? null,
      stripeSubscriptionId: owner.stripe_subscription_id ?? null,
    };
  }

  // ─── Private Webhook Handlers ──────────────────────────────────────────────

  private async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const invoiceId = session.metadata?.invoice_id;

    // ── App invoice one-time payment ─────────────────────────────────────────
    if (invoiceId) {
      await this.markInvoicePaid(invoiceId, session.amount_total ?? 0);
      this.logger.log(`Invoice ${invoiceId} marked paid via checkout session ${session.id}`);
      return;
    }

    // ── Vendor invoice payment ────────────────────────────────────────────────
    if (session.metadata?.vendor_invoice_id) {
      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;
      await this.vendorInvoicesService.markInvoicePaidBySession(session.id, paymentIntentId);
      this.logger.log(`Vendor invoice checkout complete — session ${session.id}`);
      return;
    }

    // ── Owner subscription checkout ──────────────────────────────────────────
    const ownerAccountId = session.client_reference_id;
    if (!ownerAccountId) return;

    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription as Stripe.Subscription | null)?.id ?? null;

    await this.syncSubscriptionToDb(ownerAccountId, subscriptionId, 'active');
    this.logger.log(`Checkout complete — owner ${ownerAccountId} is now active`);

    // ── Affiliate conversion commission ─────────────────────────────────────
    if (subscriptionId) {
      const amountDollars = (session.amount_total ?? 0) / 100;
      try {
        await this.affiliatesService.processConversionCommission(
          ownerAccountId,
          subscriptionId,
          amountDollars,
        );
      } catch (err) {
        this.logger.error('Failed to process affiliate conversion commission', (err as Error).message);
      }
    }
  }

  /**
   * Handle payment_intent.succeeded — marks the matching invoice as paid.
   * Fired for direct PaymentIntents (charge-client flow).
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const invoiceId = paymentIntent.metadata?.invoice_id;
    if (!invoiceId) return;
    await this.markInvoicePaid(invoiceId, paymentIntent.amount);
    this.logger.log(`Invoice ${invoiceId} marked paid via PaymentIntent ${paymentIntent.id}`);
  }

  /**
   * Record a (possibly partial) payment against an invoice.
   * - Adds amountCents to amount_paid, recalculates amount_due.
   * - If fully paid: status = 'paid'. If partial: status = 'partial'.
   */
  private async markInvoicePaid(invoiceId: string, amountCents: number): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const amountDollars = amountCents / 100;

    const { data: invoice } = await admin
      .from('invoices')
      .select('total_amount, amount_paid, client_phone, client_name, invoice_number, owner_id, booking_id, intake_form_id')
      .eq('id', invoiceId)
      .maybeSingle();

    const total = Number(invoice?.total_amount ?? amountDollars);
    const previouslyPaid = Number(invoice?.amount_paid ?? 0);
    const newAmountPaid = Math.min(previouslyPaid + amountDollars, total);
    const newAmountDue = Math.max(0, total - newAmountPaid);
    const isFullyPaid = newAmountDue <= 0.005; // allow $0.01 rounding tolerance

    const { error } = await admin
      .from('invoices')
      .update({
        status: isFullyPaid ? 'paid' : 'partial',
        amount_paid: isFullyPaid ? total : newAmountPaid,
        amount_due: isFullyPaid ? 0 : newAmountDue,
        ...(isFullyPaid ? { paid_date: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (error) {
      this.logger.error(`Failed to record payment for invoice ${invoiceId}: ${error.message}`);
      return;
    }

    if (!invoice) return;

    // ── Notify client via SMS ──────────────────────────────────────────────
    let clientPhone = invoice.client_phone ?? null;
    const clientName = invoice.client_name || 'Valued Client';
    const invoiceNumber = invoice.invoice_number || invoiceId;

    // Fallback: look up phone from booking or intake form
    if (!clientPhone && invoice.booking_id) {
      const { data: booking } = await admin.from('booking').select('contact_phone').eq('id', invoice.booking_id).maybeSingle();
      clientPhone = (booking as any)?.contact_phone ?? null;
    }
    if (!clientPhone && invoice.intake_form_id) {
      const { data: form } = await admin.from('intake_forms').select('contact_phone').eq('id', invoice.intake_form_id).maybeSingle();
      clientPhone = (form as any)?.contact_phone ?? null;
    }

    const paidAmount = isFullyPaid ? total : amountDollars;
    try {
      await this.smsNotifications.invoicePaid(clientPhone, clientName, invoiceNumber, paidAmount);
    } catch (smsErr) {
      this.logger.warn(`Failed to send client payment SMS for invoice ${invoiceId}`, (smsErr as Error).message);
    }

    // ── Notify owner via SMS ───────────────────────────────────────────────
    if (invoice.owner_id) {
      try {
        // Try to find phone via memberships → users
        const { data: membership } = await admin
          .from('memberships')
          .select('user_id')
          .eq('owner_account_id', invoice.owner_id)
          .eq('role', 'owner')
          .limit(1)
          .maybeSingle();
        const userId = membership?.user_id;
        if (userId) {
          const { data: user } = await admin.from('users').select('phone_number').eq('id', userId).maybeSingle();
          const ownerPhone = (user as any)?.phone_number ?? null;
          if (ownerPhone) {
            await this.smsNotifications.trySend(
              ownerPhone,
              `DoVenue Suite: Invoice #${invoiceNumber} has been paid — $${paidAmount.toFixed(2)} received from ${clientName}.`,
            );
          }
        }
      } catch (ownerSmsErr) {
        this.logger.warn(`Failed to send owner payment SMS for invoice ${invoiceId}`, (ownerSmsErr as Error).message);
      }
    }
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

  /**
   * Handle invoice.payment_succeeded — record recurring affiliate commissions (3%).
   * Skips the very first invoice because that is covered by the conversion commission (50%).
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    // Use 'any' cast because Stripe SDK v20 restructured Invoice type
    const inv = invoice as any;

    // Only track subscription invoices
    const rawSubscription = inv.subscription ?? inv.parent?.subscription_details?.subscription;
    const subscriptionId = typeof rawSubscription === 'string'
      ? rawSubscription
      : rawSubscription?.id ?? null;

    if (!subscriptionId || !invoice.id) return;

    // Resolve owner_account_id via Stripe customer ID
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : (invoice.customer as Stripe.Customer | null)?.id;

    if (!customerId) return;

    const admin = this.supabaseService.getAdminClient();
    const { data: ownerAccount } = await admin
      .from('owner_accounts')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    if (!ownerAccount) return;

    const amountDollars = ((invoice as any).amount_paid ?? 0) / 100;
    const rawPeriodStart = inv.period_start ?? inv.effective_at ?? null;
    const rawPeriodEnd   = inv.period_end   ?? null;
    const periodStart = rawPeriodStart ? new Date(rawPeriodStart * 1000) : new Date();
    const periodEnd   = rawPeriodEnd   ? new Date(rawPeriodEnd   * 1000) : new Date();

    try {
      await this.affiliatesService.processRecurringCommission(
        ownerAccount.id,
        invoice.id,
        subscriptionId,
        amountDollars,
        periodStart,
        periodEnd,
      );
    } catch (err) {
      this.logger.error('Failed to process recurring affiliate commission', (err as Error).message);
    }
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

  private readonly APP_FEE_RATE = 0.05; // 5% DoVenueSuite fee

  /**
   * Resolves the owner_accounts row for a given auth user ID.
   * Primary path: memberships table (user_id → owner_account_id).
   * Fallback: direct user_id column on owner_accounts.
   */
  private async getOwnerAccountByUserId(userId: string, admin: any): Promise<any | null> {
    // Primary: look up via memberships
    const { data: membership } = await admin
      .from('memberships')
      .select('owner_account_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (membership?.owner_account_id) {
      const { data: owner } = await admin
        .from('owner_accounts')
        .select('*')
        .eq('id', membership.owner_account_id)
        .maybeSingle();
      return owner ?? null;
    }

    // Fallback: primary_owner_id on owner_accounts (auth UUID stored there)
    const { data: owner } = await admin
      .from('owner_accounts')
      .select('*')
      .eq('primary_owner_id', userId)
      .maybeSingle();

    return owner ?? null;
  }

  /**
   * Create (or retrieve) a Stripe Connect Express account for an owner,
   * then return a one-time onboarding URL.
   */
  async createOwnerConnectOnboarding(userId: string, email: string): Promise<string> {
    const admin = this.supabaseService.getAdminClient();

    const owner = await this.getOwnerAccountByUserId(userId, admin);
    if (!owner) throw new Error('Owner account not found');

    let connectId = owner.stripe_connect_id;

    if (!connectId) {
      const account = await this.stripe.accounts.create({
        type: 'express',
        email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_profile: { url: this.frontendUrl },
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
        business_profile: { url: this.frontendUrl },
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
   * If status is pending, does a live Stripe check so we don't need webhooks in dev.
   */
  async getOwnerConnectStatus(userId: string): Promise<{ status: string; connectId: string | null }> {
    const admin = this.supabaseService.getAdminClient();
    const owner = await this.getOwnerAccountByUserId(userId, admin);

    let status = owner?.stripe_connect_status ?? 'not_connected';
    const connectId = owner?.stripe_connect_id ?? null;

    if (status === 'pending' && connectId) {
      try {
        const account = await this.stripe.accounts.retrieve(connectId);
        const isActive = account.details_submitted && account.charges_enabled && account.payouts_enabled;
        if (isActive) {
          status = 'active';
          await admin.from('owner_accounts').update({ stripe_connect_status: 'active' }).eq('id', owner!.id);
          this.logger.log(`Owner Connect ${connectId} auto-upgraded to active via live check`);
        }
      } catch (err) {
        this.logger.warn(`Live Stripe check failed for owner ${connectId}: ${(err as Error).message}`);
      }
    }

    return { status, connectId };
  }

  /**
   * Get the Connect account status for a vendor.
   * If status is pending, does a live Stripe check so we don't need webhooks in dev.
   */
  async getVendorConnectStatus(userId: string): Promise<{ status: string; connectId: string | null }> {
    const admin = this.supabaseService.getAdminClient();
    const { data } = await admin
      .from('vendor_accounts')
      .select('id, stripe_account_id, stripe_connect_status')
      .eq('user_id', userId)
      .maybeSingle();

    let status = data?.stripe_connect_status ?? 'not_connected';
    const connectId = data?.stripe_account_id ?? null;

    if (status === 'pending' && connectId) {
      try {
        const account = await this.stripe.accounts.retrieve(connectId);
        const isActive = account.details_submitted && account.charges_enabled && account.payouts_enabled;
        if (isActive) {
          status = 'active';
          await admin.from('vendor_accounts').update({ stripe_connect_status: 'active' }).eq('id', data!.id);
          this.logger.log(`Vendor Connect ${connectId} auto-upgraded to active via live check`);
        }
      } catch (err) {
        this.logger.warn(`Live Stripe check failed for vendor ${connectId}: ${(err as Error).message}`);
      }
    }

    return { status, connectId };
  }

  /**
   * Reset owner Stripe Connect — clears stored ID so a fresh account is created on next attempt.
   */
  async resetOwnerConnect(userId: string): Promise<{ success: boolean }> {
    const admin = this.supabaseService.getAdminClient();
    const owner = await this.getOwnerAccountByUserId(userId, admin);
    if (!owner) throw new Error('Owner account not found');
    await admin
      .from('owner_accounts')
      .update({ stripe_connect_id: null, stripe_connect_status: 'not_connected' })
      .eq('id', owner.id);
    return { success: true };
  }

  /**
   * Reset vendor Stripe Connect — clears stored ID so a fresh account is created on next attempt.
   */
  async resetVendorConnect(userId: string): Promise<{ success: boolean }> {
    const admin = this.supabaseService.getAdminClient();
    const { data: vendor } = await admin
      .from('vendor_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!vendor) throw new Error('Vendor account not found');
    await admin
      .from('vendor_accounts')
      .update({ stripe_account_id: null, stripe_connect_status: 'not_connected' })
      .eq('id', vendor.id);
    return { success: true };
  }

  /**
   * Charge a client and route funds to an owner's Connect account.
   * DoVenueSuite takes 5% as application_fee_amount.
   *
   * Flow: Client card → Stripe → DoVenueSuite takes 5% → owner receives the rest
   * Returns a PaymentIntent client_secret for the frontend to complete payment.
   */
  async createClientPaymentIntent(
    amountCents: number,
    ownerUserId: string,
    description: string,
    invoiceId?: string,
  ): Promise<{ clientSecret: string; paymentIntentId: string; feeCents: number }> {
    const admin = this.supabaseService.getAdminClient();

    const owner = await this.getOwnerAccountByUserId(ownerUserId, admin);
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
      metadata: {
        owner_account_id: String(owner.id),
        ...(invoiceId ? { invoice_id: invoiceId } : {}),
      },
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
   * DoVenueSuite takes 5% as fee (paid by vendor — deducted from transfer).
   *
   * Flow: Owner's balance → transfer to vendor → DoVenueSuite keeps 5%
   */
  async payVendor(
    amountCents: number,
    ownerUserId: string,
    vendorAccountId: string,
    vendorBookingId: string,
    description: string,
  ): Promise<{ transferId: string; feeCents: number; netCents: number }> {
    const admin = this.supabaseService.getAdminClient();

    const owner = await this.getOwnerAccountByUserId(ownerUserId, admin);

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
   * Generate a client-facing payment page URL for an invoice.
   * Returns our own frontend URL (/pay/invoice/:token) so the client can
   * choose how much to pay (deposit, full balance, or custom amount).
   */
  async createInvoicePaymentLink(
    invoiceId: string,
    _amountCents: number,
    _description: string,
    ownerUserId: string,
  ): Promise<string> {
    const admin = this.supabaseService.getAdminClient();

    const { data: inv } = await admin
      .from('invoices')
      .select('public_token')
      .eq('id', invoiceId)
      .maybeSingle();

    if (!inv?.public_token) {
      throw new Error('Invoice not found or missing public token');
    }

    return `${this.frontendUrl}/pay/invoice/${inv.public_token}`;
  }

  /**
   * Public: fetch a safe subset of invoice data for the client payment page.
   */
  async getPublicInvoice(token: string) {
    const admin = this.supabaseService.getAdminClient();

    const { data, error } = await admin
      .from('invoices')
      .select(`
        id, invoice_number, client_name, client_email,
        total_amount, amount_paid, amount_due, status,
        issue_date, due_date, notes, terms,
        deposit_percentage, deposit_due_days_before, final_payment_due_days_before,
        booking:booking(event:event(id, name, date)),
        items:invoice_items(id, description, quantity, unit_price, amount, item_type)
      `)
      .eq('public_token', token)
      .maybeSingle();

    if (error || !data) throw new Error('Invoice not found');
    return data;
  }

  /**
   * Public: create a Stripe Checkout session for a specific payment amount.
   * Used by the client-facing /pay/invoice/[token] page.
   */
  async createPublicInvoiceCheckout(token: string, amountCents: number): Promise<string> {
    const admin = this.supabaseService.getAdminClient();

    const { data: inv, error } = await admin
      .from('invoices')
      .select('id, invoice_number, amount_due, total_amount, owner_id')
      .eq('public_token', token)
      .maybeSingle();

    if (error || !inv) throw new Error('Invoice not found');

    const maxCents = Math.round(Number(inv.amount_due) * 100);
    const safeCents = Math.min(amountCents, maxCents);
    if (safeCents < 50) throw new Error('Minimum payment is $0.50');

    // Look up owner Connect account
    let owner: any = null;
    if (inv.owner_id) {
      const { data } = await admin.from('owner_accounts').select('stripe_connect_id, stripe_connect_status').eq('id', inv.owner_id).maybeSingle();
      owner = data;
    }
    const hasConnect = owner?.stripe_connect_id && owner?.stripe_connect_status === 'active';

    const description = `Invoice ${inv.invoice_number} — $${(safeCents / 100).toFixed(2)}`;

    const sessionParams: any = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: safeCents,
          product_data: { name: description },
        },
        quantity: 1,
      }],
      success_url: `${this.frontendUrl}/pay/invoice/${token}?paid=true`,
      cancel_url: `${this.frontendUrl}/pay/invoice/${token}?canceled=true`,
      client_reference_id: inv.id,
      metadata: { invoice_id: inv.id },
    };

    if (hasConnect) {
      const feeCents = Math.round(safeCents * this.APP_FEE_RATE);
      sessionParams.payment_intent_data = {
        application_fee_amount: feeCents,
        transfer_data: { destination: owner!.stripe_connect_id! },
      };
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);
    this.logger.log(`Created public checkout for invoice ${inv.id} (${safeCents} cents): ${session.url}`);
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
