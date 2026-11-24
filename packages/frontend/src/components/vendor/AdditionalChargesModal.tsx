'use client'

import { useState } from 'react'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import api from '@/lib/api'

interface ChargeRow {
  key: number
  description: string
  quantity: string
  unit_price: string
}

let nextKey = 1
const blankRow = (): ChargeRow => ({ key: nextKey++, description: '', quantity: '1', unit_price: '' })

interface Props {
  invoiceId: string
  invoiceNumber: string
  /** What has been paid so far; shown so the vendor sees the new balance. */
  amountPaid: number
  totalAmount: number
  taxRate: number
  onClose: () => void
  onAdded: (message: string) => void
}

/** Adds charges to an invoice after it went out, including one the client has already paid. */
export default function AdditionalChargesModal({ invoiceId, invoiceNumber, amountPaid, totalAmount, taxRate, onClose, onAdded }: Props) {
  const [rows, setRows] = useState<ChargeRow[]>([blankRow()])
  const [notify, setNotify] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (key: number, field: keyof ChargeRow, value: string) =>
    setRows(prev => prev.map(r => (r.key === key ? { ...r, [field]: value } : r)))

  const added = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0)
  const withTax = added * (1 + taxRate / 100)
  const newBalance = Math.max(0, totalAmount + withTax - amountPaid)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const charges = rows.map(r => ({
      description: r.description.trim(),
      quantity: Number(r.quantity),
      unit_price: Number(r.unit_price),
    }))
    if (charges.some(c => !c.description || !(c.quantity > 0) || !(c.unit_price > 0))) {
      setError('Each charge needs a description, a quantity and an amount above $0.')
      return
    }
    setSaving(true)
    try {
      await api.post(`/vendor-invoices/${invoiceId}/additional-charges`, { charges, notify_client: notify })
      onAdded(notify ? 'Charge added and the client was notified.' : 'Charge added.')
    } catch (err: any) {
      const detail = err?.response?.data?.message
      setError((Array.isArray(detail) ? detail.join(' ') : detail) || 'Could not add the charge. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="charge-title">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h2 id="charge-title" className="font-semibold text-gray-900">Add additional charge</h2>
            <p className="text-sm text-gray-500">Invoice {invoiceNumber}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {rows.map((r, i) => (
            <div key={r.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor={`desc-${r.key}`} className="text-sm font-medium text-gray-700">Charge {rows.length > 1 ? i + 1 : ''}</label>
                {rows.length > 1 && (
                  <button type="button" onClick={() => setRows(prev => prev.filter(x => x.key !== r.key))} aria-label="Remove charge" className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <input
                id={`desc-${r.key}`}
                value={r.description}
                onChange={e => update(r.key, 'description', e.target.value)}
                maxLength={200}
                placeholder="e.g. Delivery, overtime, damaged item"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`qty-${r.key}`} className="block text-xs text-gray-500 mb-1">Quantity</label>
                  <input
                    id={`qty-${r.key}`}
                    type="number" min="0" step="any" inputMode="decimal"
                    value={r.quantity}
                    onChange={e => update(r.key, 'quantity', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor={`price-${r.key}`} className="block text-xs text-gray-500 mb-1">Amount each ($)</label>
                  <input
                    id={`price-${r.key}`}
                    type="number" min="0" step="0.01" inputMode="decimal"
                    value={r.unit_price}
                    onChange={e => update(r.key, 'unit_price', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          ))}

          {rows.length < 10 && (
            <button type="button" onClick={() => setRows(prev => [...prev, blankRow()])} className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">
              <Plus className="w-4 h-4" /> Add another charge
            </button>
          )}

          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>New charges{taxRate > 0 ? ` (incl. ${taxRate}% tax)` : ''}</span>
              <span>${withTax.toFixed(2)}</span>
            </div>
            {amountPaid > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Already paid</span>
                <span>-${amountPaid.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
              <span>Balance the client will owe</span>
              <span>${newBalance.toFixed(2)}</span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} className="rounded border-gray-300" />
            Email and text the client the new balance
          </label>

          {error && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Add charge
          </button>
        </div>
      </form>
    </div>
  )
}
