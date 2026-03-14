import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  RawBody,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * StripeController
 *
 * Public:
 *   POST /stripe/webhook          — Stripe webhook (raw body, signature-verified)
 *
 * Authenticated (Bearer token required, owner only):
 *   POST /stripe/checkout         — Create a Checkout session
 *   POST /stripe/billing-portal   — Create a Billing Portal session
 *   GET  /stripe/subscription     — Get current subscription status
 */
@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // ─── Webhook (public, raw body) ──────────────────────────────────────────

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!rawBody) {
      throw new BadRequestException('Missing request body');
    }
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    await this.stripeService.handleWebhook(rawBody, signature);
    return { received: true };
  }

  // ─── Create Checkout Session (authenticated) ──────────────────────────────

  /**
   * POST /stripe/checkout
   * Body: { ownerAccountId, priceId, email, businessName }
   */
  @Post('checkout')
  async createCheckoutSession(
    @Body()
    body: {
      ownerAccountId: string;
      priceId: string;
      email: string;
      businessName: string;
    },
  ): Promise<{ url: string }> {
    const { ownerAccountId, priceId, email, businessName } = body;

    if (!ownerAccountId || !priceId || !email || !businessName) {
      throw new BadRequestException('ownerAccountId, priceId, email, and businessName are required');
    }

    const url = await this.stripeService.createCheckoutSession(
      ownerAccountId,
      priceId,
      email,
      businessName,
    );
    return { url };
  }

  // ─── Billing Portal (authenticated) ──────────────────────────────────────

  /**
   * POST /stripe/billing-portal
   * Body: { ownerAccountId }
   */
  @Post('billing-portal')
  async createBillingPortal(
    @Body() body: { ownerAccountId: string },
  ): Promise<{ url: string }> {
    if (!body.ownerAccountId) {
      throw new BadRequestException('ownerAccountId is required');
    }

    const url = await this.stripeService.createBillingPortalSession(body.ownerAccountId);
    return { url };
  }

  // ─── Subscription Status (authenticated) ─────────────────────────────────

  /**
   * GET /stripe/subscription?ownerAccountId=xxx
   */
  @Get('subscription')
  async getSubscriptionStatus(
    @Query('ownerAccountId') ownerAccountId: string,
  ): Promise<{
    status: string;
    planId: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  }> {
    if (!ownerAccountId) {
      throw new BadRequestException('ownerAccountId query param is required');
    }

    return this.stripeService.getSubscriptionStatus(ownerAccountId);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async getUserIdFromAuth(authorization: string): Promise<string> {
    if (!authorization) throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');
    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  // ─── Connect Onboarding ───────────────────────────────────────────────────

  /**
   * POST /stripe/connect/owner
   * Starts Connect Express onboarding for an owner.
   * Returns a Stripe-hosted onboarding URL.
   */
  @Post('connect/owner')
  async ownerConnectOnboarding(
    @Headers('authorization') authorization: string,
    @Body() body: { email: string },
  ): Promise<{ url: string }> {
    if (!body.email) throw new BadRequestException('email is required');
    const userId = await this.getUserIdFromAuth(authorization);
    const url = await this.stripeService.createOwnerConnectOnboarding(userId, body.email);
    return { url };
  }

  /**
   * POST /stripe/connect/vendor
   * Starts Connect Express onboarding for a vendor.
   */
  @Post('connect/vendor')
  async vendorConnectOnboarding(
    @Headers('authorization') authorization: string,
    @Body() body: { email: string },
  ): Promise<{ url: string }> {
    if (!body.email) throw new BadRequestException('email is required');
    const userId = await this.getUserIdFromAuth(authorization);
    const url = await this.stripeService.createVendorConnectOnboarding(userId, body.email);
    return { url };
  }

  /**
   * GET /stripe/connect/owner/status
   */
  @Get('connect/owner/status')
  async ownerConnectStatus(
    @Headers('authorization') authorization: string,
  ): Promise<{ status: string; connectId: string | null }> {
    const userId = await this.getUserIdFromAuth(authorization);
    return this.stripeService.getOwnerConnectStatus(userId);
  }

  /**
   * GET /stripe/connect/vendor/status
   */
  @Get('connect/vendor/status')
  async vendorConnectStatus(
    @Headers('authorization') authorization: string,
  ): Promise<{ status: string; connectId: string | null }> {
    const userId = await this.getUserIdFromAuth(authorization);
    return this.stripeService.getVendorConnectStatus(userId);
  }

  // ─── Payments ─────────────────────────────────────────────────────────────

  /**
   * POST /stripe/payments/charge-client
   * Creates a PaymentIntent for a client paying an owner.
   * Body: { amountCents, ownerUserId, description }
   * Returns: { clientSecret, paymentIntentId, feeCents }
   */
  @Post('payments/charge-client')
  async chargeClient(
    @Body() body: { amountCents: number; ownerUserId: string; description?: string },
  ): Promise<{ clientSecret: string; paymentIntentId: string; feeCents: number }> {
    const { amountCents, ownerUserId, description = 'Event booking payment' } = body;
    if (!amountCents || !ownerUserId) {
      throw new BadRequestException('amountCents and ownerUserId are required');
    }
    return this.stripeService.createClientPaymentIntent(amountCents, ownerUserId, description);
  }

  /**
   * POST /stripe/payments/pay-vendor
   * Transfers funds from platform to vendor (owner-initiated).
   * Body: { amountCents, vendorAccountId, vendorBookingId, description }
   */
  @Post('payments/pay-vendor')
  async payVendor(
    @Headers('authorization') authorization: string,
    @Body() body: {
      amountCents: number;
      vendorAccountId: string;
      vendorBookingId: string;
      description?: string;
    },
  ): Promise<{ transferId: string; feeCents: number; netCents: number }> {
    const userId = await this.getUserIdFromAuth(authorization);
    const { amountCents, vendorAccountId, vendorBookingId, description = 'Vendor payment' } = body;
    if (!amountCents || !vendorAccountId || !vendorBookingId) {
      throw new BadRequestException('amountCents, vendorAccountId, and vendorBookingId are required');
    }
    return this.stripeService.payVendor(amountCents, userId, vendorAccountId, vendorBookingId, description);
  }
  /**
   * POST /stripe/payment-link
   * Creates a Stripe Checkout session (one-time) for an invoice the owner can send to the client.
   * Body: { invoiceId, amountCents, description }
   * Returns: { url }
   */
  @Post('payment-link')
  async createPaymentLink(
    @Headers('authorization') authorization: string,
    @Body() body: { invoiceId: string; amountCents: number; description?: string },
  ): Promise<{ url: string }> {
    const userId = await this.getUserIdFromAuth(authorization);
    const { invoiceId, amountCents, description = 'Invoice Payment' } = body;
    if (!invoiceId || !amountCents) {
      throw new BadRequestException('invoiceId and amountCents are required');
    }
    const url = await this.stripeService.createInvoicePaymentLink(invoiceId, amountCents, description, userId);
    return { url };
  }
}
