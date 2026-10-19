export type PayAmount = 'deposit' | 'full'

interface DepositFields {
  total_amount: number | string
  amount_paid?: number | string | null
  amount_due?: number | string | null
  deposit_amount?: number | string | null
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** What the client still owes, and whether a deposit is available, for an invoice that may carry a fixed-dollar deposit. */
export function depositInfo(invoice: DepositFields) {
  const total = Number(invoice.total_amount)
  const paid = Number(invoice.amount_paid ?? 0)
  const dueNow = Number(invoice.amount_due ?? total)
  const deposit = invoice.deposit_amount != null ? Number(invoice.deposit_amount) : 0
  const has = deposit > 0 && deposit < total
  const remaining = has ? Math.max(0, round2(deposit - paid)) : 0
  return {
    has,
    deposit,
    paid,
    dueNow,
    /** Deposit still to pay (0 once covered). */
    remaining,
    /** The deposit is paid but a balance is left. */
    partiallyPaid: has && paid > 0 && dueNow > 0,
  }
}

/** Amount of the invoice this checkout will pay off. */
export function chargeAmount(info: ReturnType<typeof depositInfo>, choice: PayAmount): number {
  if (choice === 'deposit' && info.remaining > 0) return Math.min(info.remaining, info.dueNow)
  return info.dueNow
}
