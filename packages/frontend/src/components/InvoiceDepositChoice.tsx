'use client'

import { type PayAmount, depositInfo } from '@/lib/invoiceDeposit'

interface Props {
  info: ReturnType<typeof depositInfo>
  value: PayAmount
  onChange: (value: PayAmount) => void
  dueDate: string
  balanceDueDate?: string | null
  disabled?: boolean
}

const money = (n: number) => `$${n.toFixed(2)}`

export default function InvoiceDepositChoice({ info, value, onChange, dueDate, balanceDueDate, disabled }: Props) {
  if (!info.has) return null

  // Deposit already covered: only the balance is left, so there is nothing to choose.
  if (info.remaining <= 0) {
    return (
      <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Deposit received. Balance of <strong>{money(info.dueNow)}</strong>
        {balanceDueDate ? <> due {balanceDueDate}</> : null}.
      </div>
    )
  }

  const option = (key: PayAmount, title: string, amount: number, note: string) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(key)}
      className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
        value === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <span>
        <span className="block text-sm font-semibold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500">{note}</span>
      </span>
      <span className="text-sm font-bold text-gray-900">{money(amount)}</span>
    </button>
  )

  return (
    <div className="mb-3 space-y-2">
      {option('deposit', 'Pay deposit', info.remaining, `Due ${dueDate}${balanceDueDate ? ` · balance due ${balanceDueDate}` : ''}`)}
      {option('full', 'Pay full amount', info.dueNow, 'Settle the whole invoice now')}
    </div>
  )
}
