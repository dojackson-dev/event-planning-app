'use client'

interface Props {
  deposit: string
  onDepositChange: (value: string) => void
  balanceDueDate: string
  onBalanceDueDateChange: (value: string) => void
  /** Invoice total the deposit must stay under. */
  total: number
  dueDate: string
}

export default function InvoiceDepositFields({
  deposit, onDepositChange, balanceDueDate, onBalanceDueDateChange, total, dueDate,
}: Props) {
  const depositValue = parseFloat(deposit)
  const hasDeposit = deposit !== '' && depositValue > 0
  const tooLarge = hasDeposit && total > 0 && depositValue >= total
  const dateOrder = hasDeposit && balanceDueDate !== '' && dueDate !== '' && balanceDueDate < dueDate

  return (
    <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-800">Deposit (optional)</h3>
        <p className="text-xs text-gray-500">
          Let the client pay a deposit first. The due date above is when the deposit is due, and the balance is due on the date below.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Deposit amount ($)</label>
          <input
            type="number" min="0" step="0.01" value={deposit}
            onChange={e => onDepositChange(e.target.value)}
            placeholder="No deposit"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Balance due date</label>
          <input
            type="date" value={balanceDueDate} disabled={!hasDeposit}
            onChange={e => onBalanceDueDateChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>
      </div>
      {tooLarge && <p className="text-xs text-red-600">The deposit must be less than the invoice total.</p>}
      {dateOrder && <p className="text-xs text-red-600">The balance due date cannot be before the deposit due date.</p>}
    </div>
  )
}
