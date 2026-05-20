'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import { Plus, Trash2, Loader2, ChevronDown, BookOpen } from 'lucide-react'

interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
}

interface ArtistBooking {
  id: string
  event_name: string
  client_name: string
  client_email: string
  client_phone?: string
  event_date?: string
  venue_name?: string
  agreed_amount?: number
  status: string
}

const today = new Date().toISOString().split('T')[0]
const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
let idSeq = 1
const newItem = (): LineItem => ({ id: String(idSeq++), description: '', quantity: 1, unit_price: 0 })

export default function NewArtistInvoicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
      <NewArtistInvoiceForm />
    </Suspense>
  )
}

function NewArtistInvoiceForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [bookings, setBookings] = useState<ArtistBooking[]>([])
  const [showBookingPicker, setShowBookingPicker] = useState(false)
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [linkedBookingId, setLinkedBookingId] = useState<string | null>(null)
  const [linkedBookingName, setLinkedBookingName] = useState('')

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

  // Pre-fill from URL params (e.g. coming from promoter booking accept flow)
  useEffect(() => {
    const name = searchParams.get('client_name')
    const email = searchParams.get('client_email')
    const phone = searchParams.get('client_phone')
    const eventName = searchParams.get('event_name')
    const eventDate = searchParams.get('event_date')
    const amount = searchParams.get('amount')
    if (name) setClientName(name)
    if (email) setClientEmail(email)
    if (phone) setClientPhone(phone)
    if (eventName && amount && Number(amount) > 0) {
      const desc = eventName + (eventDate ? ` – ${new Date(eventDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '')
      setItems([{ id: String(idSeq++), description: desc, quantity: 1, unit_price: Number(amount) }])
    }
  }, [searchParams])

  // Load bookings on demand
  const openBookingPicker = async () => {
    setShowBookingPicker(true)
    if (bookings.length > 0) return
    setBookingsLoading(true)
    try {
      const [ownRes, promoterRes] = await Promise.allSettled([
        api.get('/artist-bookings/mine'),
        api.get('/promoter-bookings/for-artist'),
      ])
      const ownBookings: ArtistBooking[] = ownRes.status === 'fulfilled'
        ? (ownRes.value.data || []).filter((b: ArtistBooking) => b.status !== 'cancelled')
        : []
      const promoterBookings: ArtistBooking[] = promoterRes.status === 'fulfilled'
        ? (promoterRes.value.data || [])
            .filter((b: any) => b.status !== 'cancelled')
            .map((b: any) => ({
              id: b.id,
              event_name: b.event_name,
              client_name: b.promoter_accounts?.contact_name || b.promoter_accounts?.company_name || b.artist_name || '',
              client_email: b.promoter_accounts?.email || '',
              client_phone: b.promoter_accounts?.phone || '',
              event_date: b.event_date,
              venue_name: b.venue_name,
              agreed_amount: b.agreed_amount,
              status: b.status,
              _source: 'promoter',
            }))
        : []
      setBookings([...ownBookings, ...promoterBookings])
    } catch {
      // silently fail — user can still type manually
    } finally {
      setBookingsLoading(false)
    }
  }

  const applyBooking = (b: ArtistBooking) => {
    setClientName(b.client_name)
    setClientEmail(b.client_email)
    setClientPhone(b.client_phone || '')
    setLinkedBookingId(b.id)
    setLinkedBookingName(b.event_name)
    // Pre-fill one line item from agreed amount if available and current items are empty
    if (b.agreed_amount && b.agreed_amount > 0) {
      const desc = b.event_name + (b.event_date ? ` – ${new Date(b.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '')
      setItems([{ id: String(idSeq++), description: desc, quantity: 1, unit_price: b.agreed_amount }])
    }
    setShowBookingPicker(false)
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const baseAmount = Math.max(0, subtotal + taxAmount - discountAmount)
  const platformFee = Math.round(baseAmount * 0.03 * 100) / 100
  // Correct pass-through: total = (base + platformFee + $0.30) / (1 - 0.029)
  const total = Math.round(((baseAmount + platformFee + 0.30) / 0.971) * 100) / 100
  const processingFee = Math.round((total - baseAmount - platformFee) * 100) / 100

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
    <div className="bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
        )}

        {/* Client */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Client Details</h2>
            <button
              type="button"
              onClick={openBookingPicker}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-400 rounded-lg px-3 py-1.5 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Pull from Booking
            </button>
          </div>
          {linkedBookingName && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
              <span>Linked to: <span className="font-medium">{linkedBookingName}</span></span>
              <button
                type="button"
                onClick={() => { setLinkedBookingId(null); setLinkedBookingName('') }}
                className="text-blue-400 hover:text-blue-600 ml-2"
              >✕</button>
            </div>
          )}
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
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="flex flex-col gap-2">
                <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)}
                  placeholder="Description" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                <div className="flex gap-2 items-center">
                  <div className="flex-1 flex items-center gap-1">
                    <label className="text-xs text-gray-500 whitespace-nowrap">Qty</label>
                    <input type="number" value={item.quantity} min="0" step="0.01"
                      onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm text-center" />
                  </div>
                  <div className="flex-1 flex items-center gap-1">
                    <label className="text-xs text-gray-500 whitespace-nowrap">Price</label>
                    <input type="number" value={item.unit_price} min="0" step="0.01"
                      onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      placeholder="0.00" className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm text-right" />
                  </div>
                  <div className="text-sm text-right text-gray-700 font-medium whitespace-nowrap min-w-[64px]">
                    ${(item.quantity * item.unit_price).toFixed(2)}
                  </div>
                  <button onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:text-red-600 flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
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
            {baseAmount > 0 && (
              <>
                <div className="flex justify-between text-gray-500 border-t pt-1">
                  <span>Subtotal after adjustments</span><span>${baseAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>Platform fee (3%)</span><span>+${platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>Stripe processing (2.9% + $0.30)</span><span>+${processingFee.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t">
              <span>Client pays</span><span>${total.toFixed(2)}</span>
            </div>
            {baseAmount > 0 && (
              <div className="flex justify-between text-green-700 text-xs">
                <span>You receive (approx.)</span>
                <span>${baseAmount.toFixed(2)}</span>
              </div>
            )}
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
            {sending && <Loader2 className="w-4 h-4 animate-spin" />} Save &amp; Send
          </button>
        </div>
      </div>

      {/* Booking picker modal */}
      {showBookingPicker && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowBookingPicker(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-900">Select a Booking</h3>
              <button onClick={() => setShowBookingPicker(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {bookingsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-500">No active bookings found</div>
              ) : (
                bookings.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => applyBooking(b)}
                    className="w-full text-left px-5 py-3.5 hover:bg-blue-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900 text-sm">{b.event_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {b.client_name} · {b.client_email}
                      {b.event_date && ` · ${new Date(b.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      {b.agreed_amount ? ` · $${b.agreed_amount.toLocaleString()}` : ''}
                    </p>
                  </button>
                ))
              )}
            </div>
            <div className="px-5 py-3 border-t text-xs text-gray-400">
              Selecting a booking will fill in client details and performance fee.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
