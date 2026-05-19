'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { Loader2, Save, Trash2, FileText, ExternalLink } from 'lucide-react'

interface BookingDetail {
  id: string
  event_name: string
  client_name: string
  client_email: string
  client_phone?: string
  event_date?: string
  event_start_time?: string
  event_end_time?: string
  venue_name?: string
  venue_address?: string
  agreed_amount?: number
  deposit_amount?: number
  notes?: string
  status: string
  artist_invoices?: {
    id: string
    invoice_number: string
    total_amount: number
    amount_due: number
    status: string
    public_token?: string
  }
}

const STATUS_OPTIONS = [
  { value: 'inquiry', label: 'Inquiry' },
  { value: 'estimate_sent', label: 'Estimate Sent' },
  { value: 'deposit_paid', label: 'Deposit Paid' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-gray-100 text-gray-700',
  estimate_sent: 'bg-blue-100 text-blue-700',
  deposit_paid: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-600',
}

export default function ArtistBookingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    event_name: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    event_date: '',
    event_start_time: '',
    event_end_time: '',
    venue_name: '',
    venue_address: '',
    agreed_amount: '',
    deposit_amount: '',
    notes: '',
    status: 'inquiry',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get(`/artist-bookings/${id}`)
      .then(res => {
        const b: BookingDetail = res.data
        setBooking(b)
        setForm({
          event_name: b.event_name || '',
          client_name: b.client_name || '',
          client_email: b.client_email || '',
          client_phone: b.client_phone || '',
          event_date: b.event_date || '',
          event_start_time: b.event_start_time || '',
          event_end_time: b.event_end_time || '',
          venue_name: b.venue_name || '',
          venue_address: b.venue_address || '',
          agreed_amount: b.agreed_amount != null ? String(b.agreed_amount) : '',
          deposit_amount: b.deposit_amount != null ? String(b.deposit_amount) : '',
          notes: b.notes || '',
          status: b.status || 'inquiry',
        })
      })
      .catch(() => setError('Booking not found'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(''); setSaved(false)
    try {
      const payload: Record<string, any> = { ...form }
      if (payload.agreed_amount) payload.agreed_amount = parseFloat(payload.agreed_amount)
      else delete payload.agreed_amount
      if (payload.deposit_amount) payload.deposit_amount = parseFloat(payload.deposit_amount)
      else delete payload.deposit_amount
      ;['client_phone', 'event_start_time', 'event_end_time', 'venue_address', 'notes'].forEach(k => {
        if (!payload[k]) payload[k] = null
      })
      if (!payload.event_date) payload.event_date = null
      if (!payload.venue_name) payload.venue_name = null

      await api.put(`/artist-bookings/${id}`, payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save booking')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/artist-bookings/${id}`)
      router.push('/artist/dashboard/bookings')
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to delete booking')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">{error}</p>
        <Link href="/artist/dashboard/bookings" className="text-blue-600 text-sm hover:underline">← Back to Bookings</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/artist/dashboard/bookings" className="text-sm text-gray-500 hover:text-gray-700">← Bookings</Link>
            <span className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{booking?.event_name}</span>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[form.status] || 'bg-gray-100 text-gray-700'}`}>
            {STATUS_OPTIONS.find(s => s.value === form.status)?.label || form.status}
          </span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Invoice info banner */}
        {booking?.artist_invoices && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Invoice #{booking.artist_invoices.invoice_number}</p>
                <p className="text-xs text-blue-600">
                  Total: ${Number(booking.artist_invoices.total_amount).toFixed(2)} ·
                  Due: ${Number(booking.artist_invoices.amount_due).toFixed(2)} ·
                  {' '}<span className="capitalize">{booking.artist_invoices.status}</span>
                </p>
              </div>
            </div>
            {booking.artist_invoices.public_token && (
              <a href={`/invoice/${booking.artist_invoices.public_token}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs text-blue-700 hover:underline flex-shrink-0">
                View <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
          {saved && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">Changes saved!</div>}

          {/* Event details */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Event Details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
              <input value={form.event_name} onChange={e => set('event_name', e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
                <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input type="time" value={form.event_start_time} onChange={e => set('event_start_time', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input type="time" value={form.event_end_time} onChange={e => set('event_end_time', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name</label>
              <input value={form.venue_name} onChange={e => set('venue_name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue Address</label>
              <input value={form.venue_address} onChange={e => set('venue_address', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Client info */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Client Information</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input value={form.client_name} onChange={e => set('client_name', e.target.value)} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.client_phone} onChange={e => set('client_phone', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Email *</label>
              <input type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Financial */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Financials</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agreed Amount ($)</label>
                <input type="number" min="0" step="0.01" value={form.agreed_amount} onChange={e => set('agreed_amount', e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Amount ($)</label>
                <input type="number" min="0" step="0.01" value={form.deposit_amount} onChange={e => set('deposit_amount', e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              placeholder="Anything relevant to this booking..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Changes
          </button>
        </form>

        {/* Delete */}
        <div className="mt-6 bg-white border border-red-100 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Danger Zone</h3>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" /> Delete Booking
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-700">Are you sure? This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={handleDelete} disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Yes, Delete
                </button>
                <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
