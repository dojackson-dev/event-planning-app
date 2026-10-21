import { createHash, randomBytes } from 'crypto';
import Stripe from 'stripe';

/** Stripe's "General - Tangible Goods" tax code, used when an item has none. */
export const DEFAULT_TAX_CODE = 'txcd_99999999';

/** Settlement attempt, then retries after 24h each; from the 3rd failed attempt the bidder must use the pay link. */
export const MAX_AUTO_CHARGE_ATTEMPTS = 3;
export const DECLINE_RETRY_SECONDS = 86_400;
export const INTERNAL_RETRY_SECONDS = 21_600;

/** Order error codes that are our problem (not the bidder's): the promoter is alerted, the bidder is not. */
export const INTERNAL_ERROR_CODES: ReadonlySet<string> = new Set([
  'connect_unavailable',
  'tax_calculation_failed',
]);

/** Order statuses in which a pay link may be used. */
export const PAYABLE_ORDER_STATUSES: ReadonlySet<string> = new Set([
  'pending',
  'failed',
  'requires_action',
]);

const NO_RETRY_DECLINE_CODES = new Set([
  'lost_card',
  'stolen_card',
  'fraudulent',
]);
const CONNECT_ERROR_CODES = new Set([
  'account_invalid',
  'transfers_not_allowed',
  'platform_account_required',
]);

export interface ChargeFailure {
  code: string;
  message: string;
  requiresAction: boolean;
  retryAfterSeconds?: number;
}

interface DeclineLike {
  code?: string | null;
  decline_code?: string | null;
  message?: string | null;
}

/** Maps a card decline (thrown or from a PaymentIntent's last_payment_error) to how the order should proceed. */
export function classifyDecline(
  err: DeclineLike,
  attempt: number,
): ChargeFailure {
  const code = err.code ?? 'card_declined';
  const message = err.message ?? 'Card declined';
  if (code === 'authentication_required') {
    return { code, message, requiresAction: true };
  }
  if (err.decline_code && NO_RETRY_DECLINE_CODES.has(err.decline_code)) {
    return { code: err.decline_code, message, requiresAction: true };
  }
  if (attempt >= MAX_AUTO_CHARGE_ATTEMPTS) {
    return { code, message, requiresAction: true };
  }
  return {
    code,
    message,
    requiresAction: false,
    retryAfterSeconds: DECLINE_RETRY_SECONDS,
  };
}

/**
 * Returns a ChargeFailure for definitive failures, or null when the outcome is
 * unknown (network, 5xx, rate limit, config): the attempt is left alone so the
 * 15-minute claim recovery re-runs it with the same idempotency key.
 */
export function classifyChargeError(
  err: unknown,
  attempt: number,
): ChargeFailure | null {
  if (err instanceof Stripe.errors.StripeCardError) {
    return classifyDecline(
      {
        code: err.code,
        decline_code: err.decline_code,
        message: err.message,
      },
      attempt,
    );
  }
  if (err instanceof Stripe.errors.StripeInvalidRequestError) {
    if (err.code && CONNECT_ERROR_CODES.has(err.code)) {
      return {
        code: 'connect_unavailable',
        message: 'Payout account unavailable',
        requiresAction: false,
        retryAfterSeconds: INTERNAL_RETRY_SECONDS,
      };
    }
    if (err.code === 'resource_missing' && err.param === 'payment_method') {
      return {
        code: 'payment_method_unavailable',
        message: 'Saved card is no longer available',
        requiresAction: true,
      };
    }
  }
  return null;
}

export function newPayToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashPayToken(token) };
}

export function hashPayToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** 32 random bytes in base64url are exactly 43 characters. */
export function isWellFormedPayToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || 'there';
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return `${local[0]}***@${domain}`;
}

export function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Strips anything email- or phone-like so stored/logged errors carry no PII. */
export function safeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[number]')
    .slice(0, 200);
}
