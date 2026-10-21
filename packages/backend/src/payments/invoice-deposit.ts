/**
 * Fixed-dollar deposits on artist / promoter / vendor invoices.
 *
 * Invoices without a deposit_amount never go through this logic, so existing
 * invoices keep their original full-payment behaviour.
 */

export type PayAmountChoice = 'deposit' | 'full';

export interface DepositInvoice {
  total_amount: number | string;
  amount_paid?: number | string | null;
  amount_due?: number | string | null;
  deposit_amount?: number | string | null;
  due_date?: string | null;
  balance_due_date?: string | null;
}

const toCents = (value: number | string | null | undefined): number =>
  Math.round(Number(value ?? 0) * 100);

export function hasDeposit(invoice: DepositInvoice): boolean {
  return (
    invoice.deposit_amount != null &&
    Number(invoice.deposit_amount) > 0 &&
    toCents(invoice.deposit_amount) < toCents(invoice.total_amount)
  );
}

export function normalizePayAmount(value: unknown): PayAmountChoice {
  return value === 'deposit' ? 'deposit' : 'full';
}

/** Cents still owed toward the deposit; 0 when there is no deposit or it is already covered. */
export function depositRemainingCents(invoice: DepositInvoice): number {
  if (!hasDeposit(invoice)) return 0;
  return Math.max(
    0,
    toCents(invoice.deposit_amount) - toCents(invoice.amount_paid),
  );
}

/** Cents applied to the invoice by one checkout: the deposit when chosen and still owed, otherwise everything due. */
export function creditCentsFor(
  invoice: DepositInvoice,
  choice: PayAmountChoice,
): number {
  const due = toCents(invoice.amount_due);
  if (choice === 'deposit') {
    const remaining = depositRemainingCents(invoice);
    if (remaining > 0) return Math.min(remaining, due);
  }
  return due;
}

export function applyCredit(
  invoice: DepositInvoice,
  creditCents: number,
): { fullyPaid: boolean; amount_paid: number; amount_due: number } {
  const total = toCents(invoice.total_amount);
  const paid = Math.min(total, toCents(invoice.amount_paid) + creditCents);
  const due = Math.max(0, total - paid);
  return {
    fullyPaid: due === 0,
    amount_paid: paid / 100,
    amount_due: due / 100,
  };
}

/** The next payment the client owes and when it is due, used for reminders. */
export function nextPaymentDue(invoice: DepositInvoice): {
  kind: 'deposit' | 'balance' | 'full';
  date: string | null;
  cents: number;
} {
  const due = toCents(invoice.amount_due);
  if (!hasDeposit(invoice)) {
    return { kind: 'full', date: invoice.due_date ?? null, cents: due };
  }
  const remaining = depositRemainingCents(invoice);
  if (remaining > 0) {
    return {
      kind: 'deposit',
      date: invoice.due_date ?? null,
      cents: Math.min(remaining, due),
    };
  }
  return {
    kind: 'balance',
    date: invoice.balance_due_date ?? invoice.due_date ?? null,
    cents: due,
  };
}

/** Returns an error message when a deposit / balance date combination is invalid. */
export function validateDeposit(input: {
  deposit_amount?: number | null;
  balance_due_date?: string | null;
  due_date?: string | null;
  total_amount?: number | null;
}): string | null {
  const deposit = input.deposit_amount;
  if (deposit == null) return null;
  if (!(Number(deposit) > 0))
    return 'Deposit amount must be greater than zero.';
  if (
    input.total_amount != null &&
    toCents(deposit) >= toCents(input.total_amount)
  ) {
    return 'Deposit amount must be less than the invoice total.';
  }
  if (
    input.balance_due_date &&
    input.due_date &&
    input.balance_due_date < input.due_date
  ) {
    return 'Balance due date cannot be before the deposit due date.';
  }
  return null;
}
