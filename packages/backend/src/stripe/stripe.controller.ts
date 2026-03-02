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
  Logger,
} from '@nestjs/common';
import { StripeService } from './stripe.service';

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

  constructor(private readonly stripeService: StripeService) {}

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
}
