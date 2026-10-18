export type PayMethod = 'card' | 'pay_later'

// Keep in sync with packages/backend/src/payments/platform-fee.ts
export const CARD_PCT = 0.031
export const PAY_LATER_PCT = 0.06
export const PROCESSING_FIXED = 0.3
export const CARD_RATE_LABEL = '3.1% + $0.30'
export const PAY_LATER_RATE_LABEL = '6% + $0.30'

export function processingPct(method: PayMethod) {
  return method === 'pay_later' ? PAY_LATER_PCT : CARD_PCT
}

/** Mirrors backend ticketPricing: tax applies to price + service fee and passes to the seller in full. */
export function ticketPricingDollars(amount: number, method: PayMethod, feeRate: number, taxPct = 0) {
  const cents = Math.round(amount * 100)
  const k = Math.min(Math.max(Number(taxPct) || 0, 0), 20) / 100
  const fixed = Math.round(PROCESSING_FIXED * 100)
  if (k === 0) {
    const total = Math.ceil((cents + fixed) / (1 - processingPct(method) - feeRate))
    return { serviceFee: (total - cents) / 100, tax: 0, total: total / 100 }
  }
  const q = feeRate + processingPct(method) * (1 + k)
  const serviceFee = Math.ceil((q * cents + fixed) / (1 - q))
  const tax = Math.round(k * (cents + serviceFee))
  return { serviceFee: serviceFee / 100, tax: tax / 100, total: (cents + serviceFee + tax) / 100 }
}

interface Props {
  value: PayMethod
  onChange: (method: PayMethod) => void
  disabled?: boolean
}

export default function PayMethodToggle({ value, onChange, disabled }: Props) {
  const options: { id: PayMethod; label: string; note: string }[] = [
    { id: 'card', label: 'Card', note: `Processing ${CARD_RATE_LABEL}` },
    { id: 'pay_later', label: 'Pay later', note: `Afterpay, Klarna, Affirm · processing ${PAY_LATER_RATE_LABEL}` },
  ]
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="sr-only">Payment method</legend>
      {options.map((o) => (
        <label
          key={o.id}
          className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
            value === o.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'
          }`}
        >
          <input
            type="radio"
            name="pay-method"
            className="mt-1"
            checked={value === o.id}
            onChange={() => onChange(o.id)}
          />
          <span>
            <span className="block font-medium text-gray-900">{o.label}</span>
            <span className="block text-xs text-gray-500">{o.note}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}
