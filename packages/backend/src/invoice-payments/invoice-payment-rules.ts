/**
 * Rules for manual payments (cash, check, Zelle, ...) recorded against an invoice.
 * Pure functions: the service handles the database, these decide what a payment or a void does to an invoice.
 */

export type InvoiceKind = 'owner' | 'vendor' | 'artist' | 'promoter';

export const PAYMENT_METHODS = [
  'cash',
  'check',
  'zelle',
  'bank_transfer',
  'card_in_person',
  'other',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface KindConfig {
  table: string;
  /** Column that stores when the invoice was fully paid. */
  paidAtColumn: 'paid_date' | 'paid_at';
  /** Status for a partly paid invoice; reminders for vendor/artist/promoter only follow 'sent'. */
  partialStatus: 'partial' | 'sent';
  /** Whether this invoice type stores a Stripe Checkout session. */
  hasCheckoutSession: boolean;
}

export const KIND_CONFIG: Record<InvoiceKind, KindConfig> = {
  owner: {
    table: 'invoices',
    paidAtColumn: 'paid_date',
    partialStatus: 'partial',
    hasCheckoutSession: false,
  },
  vendor: {
    table: 'vendor_invoices',
    paidAtColumn: 'paid_at',
    partialStatus: 'sent',
    hasCheckoutSession: true,
  },
  artist: {
    table: 'artist_invoices',
    paidAtColumn: 'paid_at',
    partialStatus: 'sent',
    hasCheckoutSession: true,
  },
  promoter: {
    table: 'promoter_invoices',
    paidAtColumn: 'paid_at',
    partialStatus: 'sent',
    hasCheckoutSession: true,
  },
};

export function parseKind(value: unknown): InvoiceKind | null {
  return typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(KIND_CONFIG, value)
    ? (value as InvoiceKind)
    : null;
}

export function parseMethod(value: unknown): PaymentMethod | null {
  return typeof value === 'string' &&
    (PAYMENT_METHODS as readonly string[]).includes(value)
    ? (value as PaymentMethod)
    : null;
}

export const toCents = (value: number | string | null | undefined): number =>
  Math.round(Number(value ?? 0) * 100);

/** Dollars typed by a person, as whole cents; null when it is not a positive amount with at most two decimals. */
export function parseAmountCents(value: unknown): number | null {
  const text = typeof value === 'number' ? String(value) : value;
  if (typeof text !== 'string' || !/^\d+(\.\d{1,2})?$/.test(text.trim())) {
    return null;
  }
  const cents = Math.round(Number(text.trim()) * 100);
  return cents > 0 ? cents : null;
}

export interface InvoiceAmounts {
  status: string;
  total_amount: number | string;
  amount_paid?: number | string | null;
}

export interface PaymentPlan {
  amount_paid: number;
  amount_due: number;
  fullyPaid: boolean;
  status: string;
}

export class PaymentRuleError extends Error {}

/** What the invoice looks like after a manual payment, or why the payment is not allowed. */
export function planPayment(
  kind: InvoiceKind,
  invoice: InvoiceAmounts,
  amountCents: number,
): PaymentPlan {
  if (invoice.status === 'cancelled') {
    throw new PaymentRuleError('This invoice is cancelled.');
  }
  if (invoice.status === 'processing') {
    throw new PaymentRuleError(
      'A bank payment for this invoice is already processing. Wait for it to clear before recording another payment.',
    );
  }
  const total = toCents(invoice.total_amount);
  const paid = toCents(invoice.amount_paid);
  const due = total - paid;
  if (due <= 0) {
    throw new PaymentRuleError('This invoice is already paid in full.');
  }
  if (amountCents > due) {
    throw new PaymentRuleError(
      `The payment is more than the $${(due / 100).toFixed(2)} still due.`,
    );
  }
  const newPaid = paid + amountCents;
  const fullyPaid = newPaid >= total;
  return {
    amount_paid: newPaid / 100,
    amount_due: Math.max(0, total - newPaid) / 100,
    fullyPaid,
    status: fullyPaid ? 'paid' : KIND_CONFIG[kind].partialStatus,
  };
}

/** What the invoice looks like after a manual payment is voided. */
export function planVoid(
  kind: InvoiceKind,
  invoice: InvoiceAmounts,
  amountCents: number,
): PaymentPlan {
  const total = toCents(invoice.total_amount);
  const newPaid = Math.max(0, toCents(invoice.amount_paid) - amountCents);
  const noneLeft = newPaid <= 0;
  return {
    amount_paid: newPaid / 100,
    amount_due: Math.max(0, total - newPaid) / 100,
    fullyPaid: false,
    // Back to the status an unpaid invoice has once it has been sent.
    status: noneLeft ? 'sent' : KIND_CONFIG[kind].partialStatus,
  };
}
