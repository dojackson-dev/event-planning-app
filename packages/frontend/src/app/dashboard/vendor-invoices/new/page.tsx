'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Plus, Trash2, Loader2, Send } from 'lucide-react'

interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
}

const today = new Date().toISOString().split('T')[0]
const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

let idSeq = 1
const newItem = (): LineItem => ({ id: String(idSeq++), description: '', quantity: 1, unit_price: 0 })

export default function NewVendorInvoicePage() {
  const router = useRouter()

  // Client
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')

  // Dates
  const [issueDate, setIssueDate] = useState(today)
  const [dueDate, setDueDate] = useState(in30)

  // Items
  const [items, setItems] = useState<LineItem[]>([newItem()])

  // Totals addons
  const [taxRate, setTaxRate] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)

  // Notes
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('Payment due by the due date listed above.')

  // UI
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = Math.max(0, subtotal + taxAmount - discountAmount)

  const addItem = () => setItems(prev => [...prev, newItem()])
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id))
  const updateItem = (id: string, field: keyof LineItem, value: string | number) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))

  const buildPayload = () => ({
    client_name: clientName,
    client_email: clientEmail,
    client_phone: clientPhone || undefined,
    issue_date: issueDate,
    due_date: dueDate,
    tax_rate: taxRate || 0,
    discount_amount: discountAmount || 0,
    notes: notes || undefined,
    terms: terms || undefined,
    items: items.filter(i => i.description.trim()).map(({ id: _id, ...rest }) => rest),
  })

  const validate = (): string | null => {
    if (!clientName.trim()) return 'Client name is required'
    if (!clientEmail.trim()) return 'Client email is required'
    if (items.filter(i => i.description.trim()).length === 0) return 'Add at least one line item'
    return null
  }

  const handleSaveDraft = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setSaving(true); setError('')
    try {
      const { data } = await api.post('/vendor-invoices', buildPayload())
      router.push(`/dashboard/vendor-invoices/${data.id}`)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save invoice')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndSend = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setSending(true); setError('')
    try {
      const { data } = await api.post('/vendor-invoices', buildPayload())
      await api.post(`/vendor-invoices/${data.id}/send`)
      router.push(`/dashboard/vendor-invoices/${data.id}`)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to send invoice')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800 text-sm">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
      </div>

      <div className="space-y-6">
        {/* Client info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Client Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Client full name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
              <input
                type="email"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
                placeholder="client@email.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Dates</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Line Items</h2>
          <div className="space-y-3">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase px-1">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-1 text-right">Total</div>
              <div className="col-span-1"></div>
            </div>
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6">
                  <input
                    value={item.description}
                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Service description…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div className="col-span-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unit_price}
                      onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg pl-5 pr-2 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
                <div className="col-span-1 text-right text-sm font-semibold text-gray-700">
                  ${(item.quantity * item.unit_price).toFixed(2)}
                </div>
                <div className="col-span-1 text-right">
                  <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addItem}
            className="mt-4 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>

          {/* Totals */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
            <div className="w-60 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600 gap-2">
                <span>Tax</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={taxRate}
                    onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-14 border border-gray-300 rounded px-1 py-0.5 text-xs text-right"
                  />
                  <span className="text-xs">%</span>
                  <span className="ml-1">${taxAmount.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-gray-600 gap-2">
                <span>Discount</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs">$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={discountAmount}
                    onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-16 border border-gray-300 rounded px-1 py-0.5 text-xs text-right"
                  />
                </div>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Notes & Terms</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes (shown to client)</label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional notes for your client…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Terms</label>
              <textarea
                rows={2}
                value={terms}
                onChange={e => setTerms(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Fee notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          A 5% platform fee applies to all payments processed through DoVenue Suite, in addition to Stripe's standard card processing fees.
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pb-8">
          <button
            onClick={handleSaveDraft}
            disabled={saving || sending}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Save Draft'}
          </button>
          <button
            onClick={handleSaveAndSend}
            disabled={saving || sending}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Save & Send to Client
          </button>
        </div>
      </div>
    </div>
  )
}
