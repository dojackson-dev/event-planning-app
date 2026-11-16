import { PayMethod, chargeTotalWithProcessing } from '../payments/platform-fee';

/** Stripe's minimum charge is $0.50; payroll batches below $1 are not worth a payment. */
export const MIN_PAYOUT_CENTS = 100;
/** A single payment is capped so a mistake or abuse cannot move a large sum in one go. */
export const MAX_PAYOUT_CENTS = 5_000_000;
/** A payment link left unpaid this long is released so its shifts can be paid another way. */
export const STALE_PENDING_MS = 2 * 60 * 60 * 1000;

export const toCents = (dollars: number | string | null | undefined): number =>
  Math.round(Number(dollars ?? 0) * 100);

/** The platform's optional fee on payroll, as a percent between 0 and 10 (0 when unset or invalid). */
export function parseServiceFeePercent(raw: unknown): number {
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10) : 0;
}

export interface PayoutQuote {
  payroll_cents: number;
  service_fee_cents: number;
  processing_fee_cents: number;
  total_cents: number;
}

/**
 * What the venue pays for a batch: the workers' approved amounts, any service fee, and the card or bank
 * processing fee on top, so Stripe's cost never comes out of what the workers are owed.
 */
export function quotePayout(
  payrollCents: number,
  method: PayMethod,
  serviceFeePercent: number,
): PayoutQuote {
  const serviceFee = Math.round((payrollCents * serviceFeePercent) / 100);
  const net = payrollCents + serviceFee;
  const total = chargeTotalWithProcessing(net, method);
  return {
    payroll_cents: payrollCents,
    service_fee_cents: serviceFee,
    processing_fee_cents: total - net,
    total_cents: total,
  };
}

/** A worker can be paid once their Stripe account is set up and able to receive transfers. */
export function accountReadyForTransfers(account: {
  details_submitted?: boolean | null;
  payouts_enabled?: boolean | null;
  capabilities?: { transfers?: string | null } | null;
}): boolean {
  return (
    !!account.details_submitted &&
    !!account.payouts_enabled &&
    account.capabilities?.transfers === 'active'
  );
}
