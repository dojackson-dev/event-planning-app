import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SupabaseService } from '../supabase/supabase.service';

// Mirrors the Instant Payouts pricing scheme set in the Stripe Dashboard
// (Connect > Platform pricing). Stripe applies the real fee; this is only the preview.
export const INSTANT_FEE_RATE = 0.015;
export const INSTANT_FEE_MIN_CENTS = 50;
export const INSTANT_MIN_PAYOUT_CENTS = 100;

export interface InstantPayoutStatus {
  connected: boolean;
  eligible: boolean;
  reason: string | null;
  /** Largest payout (cents) that can be requested now, after the platform fee. */
  max_payout_cents: number;
  fee_rate: number;
  fee_min_cents: number;
}

export function estimateInstantFeeCents(amountCents: number): number {
  return Math.max(
    INSTANT_FEE_MIN_CENTS,
    Math.ceil(amountCents * INSTANT_FEE_RATE),
  );
}

@Injectable()
export class VendorPayoutsService {
  private readonly logger = new Logger(VendorPayoutsService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set');
    this.stripe = new Stripe(secretKey);
  }

  /** The connected account always comes from the signed-in vendor's own record. */
  private async getVendor(userId: string) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('vendor_accounts')
      .select('id, stripe_account_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) throw new NotFoundException('Vendor account not found');
    return data as { id: string; stripe_account_id: string | null };
  }

  private async netAvailableCents(stripeAccountId: string): Promise<number> {
    const balance = await this.stripe.balance.retrieve(
      { expand: ['instant_available.net_available'] },
      { stripeAccount: stripeAccountId },
    );
    const usd = (balance.instant_available ?? []).find(
      (b) => b.currency === 'usd',
    );
    if (!usd) return 0;
    const net = (usd.net_available ?? []).reduce(
      (sum, n) => sum + (n.amount ?? 0),
      0,
    );
    // net_available is the amount after the platform fee; fall back to the gross amount minus our estimate.
    if (usd.net_available && usd.net_available.length > 0) return net;
    return Math.max(0, usd.amount - estimateInstantFeeCents(usd.amount));
  }

  async getStatus(userId: string): Promise<InstantPayoutStatus> {
    const vendor = await this.getVendor(userId);
    const base = {
      fee_rate: INSTANT_FEE_RATE,
      fee_min_cents: INSTANT_FEE_MIN_CENTS,
    };
    if (!vendor.stripe_account_id) {
      return {
        ...base,
        connected: false,
        eligible: false,
        reason: 'Connect your bank account first.',
        max_payout_cents: 0,
      };
    }
    let max = 0;
    try {
      max = await this.netAvailableCents(vendor.stripe_account_id);
    } catch (err) {
      this.logger.warn(
        `Instant balance lookup failed for vendor ${vendor.id}: ${(err as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'Could not check your instant payout balance. Please try again shortly.',
      );
    }
    const eligible = max >= INSTANT_MIN_PAYOUT_CENTS;
    return {
      ...base,
      connected: true,
      eligible,
      reason: eligible
        ? null
        : 'No funds are available for an instant payout right now. Card payments are available right away; bank payments only after they clear.',
      max_payout_cents: max,
    };
  }

  async requestInstantPayout(userId: string, amountCents: unknown) {
    if (
      typeof amountCents !== 'number' ||
      !Number.isInteger(amountCents) ||
      amountCents < INSTANT_MIN_PAYOUT_CENTS
    ) {
      throw new BadRequestException(
        `Enter an amount of at least $${(INSTANT_MIN_PAYOUT_CENTS / 100).toFixed(2)}.`,
      );
    }
    const vendor = await this.getVendor(userId);
    if (!vendor.stripe_account_id) {
      throw new BadRequestException('Connect your bank account first.');
    }

    // Re-check the balance on the server; never trust the amount the browser showed.
    const max = await this.netAvailableCents(vendor.stripe_account_id).catch(
      () => {
        throw new ServiceUnavailableException(
          'Could not check your instant payout balance. Please try again shortly.',
        );
      },
    );
    if (amountCents > max) {
      throw new BadRequestException(
        `You can pay out up to $${(max / 100).toFixed(2)} right now.`,
      );
    }

    try {
      const payout = await this.stripe.payouts.create(
        { amount: amountCents, currency: 'usd', method: 'instant' },
        {
          stripeAccount: vendor.stripe_account_id,
          // The same request within a minute (double click) returns the same payout instead of a second one.
          idempotencyKey: `instant-payout:${vendor.id}:${amountCents}:${Math.floor(Date.now() / 60000)}`,
        },
      );
      this.logger.log(
        `Instant payout ${payout.id} of ${amountCents} cents requested for vendor ${vendor.id}`,
      );
      return {
        id: payout.id,
        status: payout.status,
        amount_cents: payout.amount,
        estimated_fee_cents: estimateInstantFeeCents(amountCents),
      };
    } catch (err) {
      const e = err as Stripe.errors.StripeError;
      this.logger.warn(
        `Instant payout failed for vendor ${vendor.id}: ${e.code ?? ''} ${e.message}`,
      );
      throw new BadRequestException(
        e.type === 'StripeInvalidRequestError' || e.type === 'StripeCardError'
          ? `Stripe could not complete the instant payout: ${e.message}`
          : 'The instant payout could not be completed. Please try again later.',
      );
    }
  }
}
