'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { Plus, Trash2, FileText, Loader2, Save, Calendar, ChevronDown } from 'lucide-react'

interface LineItem {
  description: string
  quantity: number
  unit_price: number
}

// Unified booking option (from either vendor_bookings or vendor_booking_requests)
interface BookingOption {
  id: string
  source: 'booking' | 'request'
  label: string
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  event_name: string | null
  event_date: string | null
  amount: number | null
}

export default function NewVendorInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [bookingOptions, setBookingOptions] = useState<BookingOption[]>([])
  const [selectedBookingId, setSelectedBookingId] = useState<string>('')

  const [clientName, setClientName] = useState(() => searchParams.get('clientName') || '')
  const [clientEmail, setClientEmail] = useState(() => searchParams.get('clientEmail') || '')
  const [clientPhone, setClientPhone] = useState(() => searchParams.get('clientPhone') || '')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [taxRate, setTaxRate] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, unit_price: 0 }])

  // Pre-select booking from URL param if provided
  const preselectedBookingId = searchParams.get('bookingId') || ''

  useEffect(() => {
    const fetchAll = async () => {
      const combined: BookingOption[] = []
      try {
        // Fetch owner-created bookings (vendor_bookings)
        const res1 = await api.get('/vendors/bookings/mine')
        const bookings: any[] = res1.data || []
        bookings
          .filter(b => b.status !== 'cancelled')
          .forEach(b => {
            const clientLabel = b.client_name || b.event_name || 'Unnamed Booking'
            combined.push({
              id: b.id,
              source: 'booking',
              label: `${clientLabel}${b.event_name && b.client_name ? ` — ${b.event_name}` : ''}${b.event_date ? ` (${b.event_date})` : ''}${b.agreed_amount ? ` · $${Number(b.agreed_amount).toFixed(2)}` : ''}`,
              client_name: b.client_name,
              client_email: b.client_email,
              client_phone: b.client_phone,
              event_name: b.event_name,
              event_date: b.event_date,
              amount: b.agreed_amount ? Number(b.agreed_amount) : null,
            })
          })
      } catch { /* silently ignore */ }
      try {
        // Fetch client-direct booking requests (vendor_booking_requests)
        const res2 = await api.get('/vendors/booking-requests/mine')
        const requests: any[] = res2.data || []
        requests
          .filter(r => r.status !== 'declined' && r.status !== 'cancelled')
          .forEach(r => {
            combined.push({
              id: r.id,
              source: 'request',
              label: `${r.client_name}${r.event_name ? ` — ${r.event_name}` : ''}${r.event_date ? ` (${r.event_date})` : ''}${r.quoted_amount ? ` · $${Number(r.quoted_amount).toFixed(2)}` : ''} [Request]`,
              client_name: r.client_name,
              client_email: r.client_email,
              client_phone: r.client_phone,
              event_name: r.event_name,
              event_date: r.event_date,
              amount: r.quoted_amount ? Number(r.quoted_amount) : null,
            })
          })
      } catch { /* silently ignore */ }
      setBookingOptions(combined)
      // Auto-select and auto-fill if bookingId in URL
      if (preselectedBookingId) {
        setSelectedBookingId(preselectedBookingId)
        const opt = combined.find(o => o.id === preselectedBookingId)
        if (opt) {
          if (opt.client_name) setClientName(opt.client_name)
          if (opt.client_email) setClientEmail(opt.client_email)
          if (opt.client_phone) setClientPhone(opt.client_phone)
          if (opt.amount) {
            setItems([{ description: opt.event_name || 'Vendor Services', quantity: 1, unit_price: opt.amount }])
          }
        }
      }
    }
    fetchAll()
  }, [])

  // When a booking is selected from dropdown, pre-fill client fields
  const handleBookingSelect = (bookingId: string) => {
    setSelectedBookingId(bookingId)
    if (!bookingId) return
    const opt = bookingOptions.find(o => o.id === bookingId)
    if (!opt) return
    if (opt.client_name) setClientName(opt.client_name)
    if (opt.client_email) setClientEmail(opt.client_email)
    if (opt.client_phone) setClientPhone(opt.client_phone)
    if (opt.amount && items.length === 1 && !items[0].description) {
      setItems([{ description: opt.event_name || 'Vendor Services', quantity: 1, unit_price: opt.amount }])
    }
  }

  const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0 }])
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))
  const updateItem = (idx: number, field: keyof LineItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = Math.max(0, subtotal + taxAmount - discountAmount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!clientName.trim() || !clientEmail.trim() || !dueDate) {
      setError('Client name, email, and due date are required.')
      return
    }
    if (items.some(i => !i.description.trim())) {
      setError('All line items must have a description.')
      return
    }

    setSaving(true)
    try {
      const res = await api.post('/vendor-invoices', {
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone || undefined,
        issue_date: issueDate,
        due_date: dueDate,
        tax_rate: taxRate,
        discount_amount: discountAmount,
        notes: notes || undefined,
        terms: terms || undefined,
        items: items.map(i => ({
          description: i.description,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
        })),
      })
      router.push(`/vendor-portal/invoices/${res.data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create invoice. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/vendor-portal/invoices" className="text-sm text-gray-400 hover:text-gray-600 mb-1 inline-block">
          ← Back to Invoices
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <FileText className="w-6 h-6 text-primary-600" />
          New Invoice
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Booking selector — always visible */}
        <div className="bg-white rounded-xl border border-primary-200 p-5 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-500" />
            Link to a Booking Request <span className="text-xs font-normal text-gray-400">(optional — auto-fills client info)</span>
          </h2>
          {bookingOptions.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No active bookings found.</p>
          ) : (
            <div className="relative">
              <select
                value={selectedBookingId}
                onChange={e => handleBookingSelect(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none pr-8 bg-white"
              >
                <option value="">-- Select a booking --</option>
                {bookingOptions.map(o => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-4">Client Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client Name *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client Email *</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client Phone</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-4">Invoice Dates</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Issue Date</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={e => setIssueDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date *</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-4">Line Items</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                <span className="col-span-6">Description</span>
                <span className="col-span-2 text-right">Qty</span>
                <span className="col-span-2 text-right">Unit Price</span>
                <span className="col-span-1 text-right">Amount</span>
                <span className="col-span-1" />
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className="col-span-6 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Service description"
                    value={item.description}
                    onChange={e => updateItem(idx, 'description', e.target.value)}
                    required
                  />
                  <input
                    className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                  />
                  <input
                    className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={item.unit_price || ''}
                    onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                  />
                  <p className="col-span-1 text-right text-sm font-medium text-gray-700">
                    ${(item.quantity * item.unit_price).toFixed(2)}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="col-span-1 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors disabled:opacity-30"
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-4">Totals</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxRate}
                  onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Discount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax ({taxRate}%)</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              {total > 0 && (
                <>
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>Platform fee (5%)</span>
                    <span>-${(total * 0.05).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-green-700">
                    <span>Your net payout</span>
                    <span>${(total * 0.95).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-4">Notes & Terms</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (visible to client)</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Thank you for your business!"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Terms</label>
                <textarea
                  rows={2}
                  value={terms}
                  onChange={e => setTerms(e.target.value)}
                  placeholder="Payment due within 30 days."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/vendor-portal/invoices"
              className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
