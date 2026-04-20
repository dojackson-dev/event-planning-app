'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Plus, Trash2, Loader2 } from 'lucide-react'

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

export default function NewArtistInvoicePage() {
  const router = useRouter()

  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [issueDate, setIssueDate] = useState(today)
  const [dueDate, setDueDate] = useState(in30)
  const [items, setItems] = useState<LineItem[]>([newItem()])
  const [taxRate, setTaxRate] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('Payment due by the due date listed above.')
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
    items: items.map(({ description, quantity, unit_price }) => ({ description, quantity, unit_price })),
  })

  const handleSave = async () => {
    if (!clientName || !clientEmail) { setError('Client name and email are required.'); return }
    setSaving(true); setError('')
    try {
      const res = await api.post('/artist-invoices', buildPayload())
      router.push(`/artist/dashboard/invoices/${res.data.id}`)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to create invoice.')
      setSaving(false)
    }
  }

  const handleSaveAndSend = async () => {
    if (!clientName || !clientEmail) { setError('Client name and email are required.'); return }
    setSending(true); setError('')
    try {
      const res = await api.post('/artist-invoices', buildPayload())
      await api.post(`/artist-invoices/${res.data.id}/send`)
      router.push(`/artist/dashboard/invoices/${res.data.id}`)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to create or send invoice.')
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/artist/dashboard/invoices" className="text-sm text-gray-500 hover:text-gray-700">← Invoices</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-800">New Invoice</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
        )}

        {/* Client */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Client Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input value={clientName} onChange={e => setClientName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Client name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
              <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="client@email.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(optional)" />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Dates</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Issue Date</label>
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Line Items</h2>
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex gap-2 items-start">
                <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)}
                  placeholder="Description" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                <input type="number" value={item.quantity} min="0" step="0.01"
                  onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                  className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm text-center" />
                <input type="number" value={item.unit_price} min="0" step="0.01"
                  onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00" className="w-24 border border-gray-300 rounded-lg px-2 py-2 text-sm text-right" />
                <div className="w-20 py-2 text-sm text-right text-gray-700 font-medium">
                  ${(item.quantity * item.unit_price).toFixed(2)}
                </div>
                <button onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addItem}
            className="flex items-center gap-1 text-blue-600 text-sm hover:text-blue-700 font-medium">
            <Plus className="w-4 h-4" /> Add Item
          </button>

          {/* Totals */}
          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-600">
              <label className="flex items-center gap-2">
                Tax Rate
                <input type="number" value={taxRate} min="0" max="100" step="0.1"
                  onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-16 border border-gray-300 rounded px-2 py-0.5 text-xs text-right" />
                %
              </label>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-600">
              <label className="flex items-center gap-2">
                Discount
                <input type="number" value={discountAmount} min="0" step="0.01"
                  onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-20 border border-gray-300 rounded px-2 py-0.5 text-xs text-right" />
              </label>
              <span>-${Number(discountAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t">
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Notes & Terms</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Optional notes for the client..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payment Terms</label>
            <input value={terms} onChange={e => setTerms(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link href="/artist/dashboard/invoices" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
            Cancel
          </Link>
          <button onClick={handleSave} disabled={saving || sending}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Draft
          </button>
          <button onClick={handleSaveAndSend} disabled={saving || sending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {sending && <Loader2 className="w-4 h-4 animate-spin" />} Save & Send
          </button>
        </div>
      </div>
    </div>
  )
}
