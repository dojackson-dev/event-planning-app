'use client'

import { Plus, Trash2 } from 'lucide-react'

export interface EditableLine {
  /** Stable React key; never sent to the server. */
  key: string
  /** Present for a line that already exists on the server. */
  id?: string
  description: string
  quantity: string
  unit_price: string
}

let keyCounter = 0
export const newLine = (partial: Partial<EditableLine> = {}): EditableLine => ({
  key: `line-${Date.now()}-${keyCounter++}`,
  description: '',
  quantity: '1',
  unit_price: '',
  ...partial,
})

const num = (value: string) => {
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

export const lineAmount = (line: EditableLine) => num(line.quantity) * num(line.unit_price)

export const linesSubtotal = (lines: EditableLine[]) =>
  lines.reduce((sum, line) => sum + lineAmount(line), 0)

/** Returns a message for the first problem, or null when every line is usable. */
export function validateLines(lines: EditableLine[]): string | null {
  if (lines.length === 0) return 'Add at least one line item.'
  for (const [index, line] of lines.entries()) {
    const label = `Line ${index + 1}`
    if (!line.description.trim()) return `${label} needs a description.`
    if (!(num(line.quantity) > 0)) return `${label} needs a quantity greater than zero.`
    if (line.unit_price.trim() === '' || num(line.unit_price) < 0) return `${label} needs a price.`
  }
  return null
}

export const toPayloadItems = (lines: EditableLine[]) =>
  lines.map(line => ({
    ...(line.id ? { id: line.id } : {}),
    description: line.description.trim(),
    quantity: num(line.quantity),
    unit_price: num(line.unit_price),
  }))

interface LineItemsEditorProps {
  lines: EditableLine[]
  onChange: (lines: EditableLine[]) => void
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

/** Itemized lines: stacked on a phone, a single row on wider screens. */
export default function LineItemsEditor({ lines, onChange }: LineItemsEditorProps) {
  const update = (key: string, patch: Partial<EditableLine>) =>
    onChange(lines.map(line => (line.key === key ? { ...line, ...patch } : line)))

  return (
    <div>
      <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1 mb-2">
        <span className="col-span-6">Description</span>
        <span className="col-span-2 text-right">Qty</span>
        <span className="col-span-2 text-right">Unit price</span>
        <span className="col-span-2 text-right">Amount</span>
      </div>

      <div className="space-y-3">
        {lines.map((line, index) => (
          <div
            key={line.key}
            className="grid grid-cols-6 sm:grid-cols-12 gap-2 items-center rounded-lg border border-gray-100 bg-gray-50/60 p-3 sm:border-0 sm:bg-transparent sm:p-0"
          >
            <input
              className={`${inputClass} col-span-6`}
              placeholder="Item or service, e.g. Chicken plates"
              aria-label={`Line ${index + 1} description`}
              value={line.description}
              onChange={e => update(line.key, { description: e.target.value })}
            />
            <label className="col-span-2 text-xs text-gray-500 sm:sr-only">
              Qty
              <input
                className={`${inputClass} mt-1 sm:mt-0 text-right`}
                type="text"
                inputMode="decimal"
                aria-label={`Line ${index + 1} quantity`}
                value={line.quantity}
                onChange={e => update(line.key, { quantity: e.target.value })}
              />
            </label>
            <label className="col-span-2 text-xs text-gray-500 sm:sr-only">
              Unit price
              <input
                className={`${inputClass} mt-1 sm:mt-0 text-right`}
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                aria-label={`Line ${index + 1} unit price`}
                value={line.unit_price}
                onChange={e => update(line.key, { unit_price: e.target.value })}
              />
            </label>
            <div className="col-span-2 flex items-center justify-end gap-2">
              <span className="text-sm font-medium text-gray-800 whitespace-nowrap">
                ${lineAmount(line).toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => onChange(lines.filter(l => l.key !== line.key))}
                disabled={lines.length === 1}
                aria-label={`Remove line ${index + 1}`}
                className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-30"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange([...lines, newLine()])}
        className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        <Plus className="w-4 h-4" /> Add another item
      </button>
    </div>
  )
}
