'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import {
  ArrowLeft, Calendar, MapPin, User, Phone, Mail, DollarSign,
  Mic2, FileText, Loader2, ChevronDown, Pencil, Trash2, CheckCircle,
  Copy, CheckCircle2, Send,
} from 'lucide-react'

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'

interface ArtistInvoice {
  id: string
  invoice_number: string
  total_amount: number
  amount_due: number
  amount_paid: number
  status: string
  public_token: string
  issue_date?: string
  due_date?: string
  created_at: string
}

interface PromoterBooking {
  id: string
  event_name: string
  event_date?: string
  event_start_time?: string
  event_end_time?: string
  venue_name?: string
  venue_address?: string
  client_name: string
  client_email: string
  client_phone?: string
  agreed_amount?: number
  deposit_amount?: number
  status: string
  notes?: string
  promoter_invoice_id?: string
  artist_account_id?: string
  artist_name?: string
  created_at: string
  promoter_invoices?: {
    id: string
    invoice_number: string
    total_amount: number
    amount_due: number
    status: string
    public_token: string
  } | null
  artist_accounts?: {
    id: string
    artist_name: string
    stage_name: string | null
    artist_type: string
    booking_email?: string
    booking_phone?: string
    performance_fee_min?: number
    performance_fee_max?: number
  } | null
  artist_invoices?: ArtistInvoice[]
}

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-gray-100 text-gray-700',
  estimate_sent: 'bg-blue-100 text-blue-700',
  deposit_paid: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-600',
}

const STATUS_LABELS: Record<string, string> = {
  inquiry: 'Inquiry',
  estimate_sent: 'Estimate Sent',
  deposit_paid: 'Deposit Paid',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const ALL_STATUSES = ['inquiry', 'estimate_sent', 'deposit_paid', 'confirmed', 'completed', 'cancelled']

function fmt(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
}

export default function PromoterBookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [booking, setBooking] = useState<PromoterBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusOpen, setStatusOpen] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copiedPay, setCopiedPay] = useState(false)
  const [sendingInv, setSendingInv] = useState(false)
  const [invSendResult, setInvSendResult] = useState<string | null>(null)

  useEffect(() => {
    api.get(`/promoter-bookings/${id}`)
      .then(r => setBooking(r.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load booking'))
      .finally(() => setLoading(false))
  }, [id])

  const updateStatus = async (newStatus: string) => {
    if (!booking) return
    setStatusSaving(true)
    setStatusOpen(false)
    try {
      const res = await api.put(`/promoter-bookings/${id}`, { status: newStatus })
      setBooking(res.data)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to update status')
    } finally {
      setStatusSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this booking? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api.delete(`/promoter-bookings/${id}`)
      router.push('/dashboard/promoter/bookings')
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to delete booking')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error || 'Booking not found'}</p>
        <Link href="/dashboard/promoter/bookings" className="text-blue-600 text-sm hover:underline">← Back to bookings</Link>
      </div>
    )
  }

  const artistDisplay = booking.artist_accounts?.stage_name || booking.artist_accounts?.artist_name || booking.artist_name
  const invoiceUrl = booking.promoter_invoices
    ? `/dashboard/promoter/invoices/${booking.promoter_invoices.id}`
    : null
  const payLink = booking.promoter_invoices?.public_token
    ? `${FRONTEND_URL}/promoter-pay/${booking.promoter_invoices.public_token}`
    : null

  const handleCopyPayLink = () => {
    if (!payLink) return
    navigator.clipboard.writeText(payLink)
    setCopiedPay(true)
    setTimeout(() => setCopiedPay(false), 2000)
  }

  const handleSendInvoice = async () => {
    if (!booking.promoter_invoices?.id) return
    setSendingInv(true); setInvSendResult(null)
    try {
      await api.post(`/promoter-invoices/${booking.promoter_invoices.id}/send`)
      setInvSendResult('sent')
      // Refresh booking to update invoice status
      const r = await api.get(`/promoter-bookings/${booking.id}`)
      setBooking(r.data)
    } catch (e: any) {
      setInvSendResult(e.response?.data?.message || 'Failed to send')
    } finally {
      setSendingInv(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/promoter/bookings" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="font-semibold text-gray-800 truncate">{booking.event_name}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Status picker */}
            <div className="relative">
              <button
                onClick={() => setStatusOpen(v => !v)}
                disabled={statusSaving}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_COLORS[booking.status]} hover:opacity-80`}
              >
                {statusSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {STATUS_LABELS[booking.status]}
                <ChevronDown className="w-3 h-3" />
              </button>
              {statusOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                  {ALL_STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(s)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${s === booking.status ? 'font-semibold' : ''}`}
                    >
                      {STATUS_LABELS[s]}
                      {s === booking.status && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link
              href={`/dashboard/promoter/bookings/new?edit=${id}`}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
              title="Delete"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

        {/* Event details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900 text-lg">{booking.event_name}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {booking.event_date && (
              <div className="flex items-start gap-2 text-gray-600">
                <Calendar className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                <div>
                  <p>{fmt(booking.event_date)}</p>
                  {(booking.event_start_time || booking.event_end_time) && (
                    <p className="text-gray-400 text-xs">
                      {booking.event_start_time?.slice(0, 5)}{booking.event_end_time ? ` – ${booking.event_end_time.slice(0, 5)}` : ''}
                    </p>
                  )}
                </div>
              </div>
            )}
            {(booking.venue_name || booking.venue_address) && (
              <div className="flex items-start gap-2 text-gray-600">
                <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                <div>
                  {booking.venue_name && <p>{booking.venue_name}</p>}
                  {booking.venue_address && <p className="text-gray-400 text-xs">{booking.venue_address}</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Financials */}
        {(booking.agreed_amount != null || booking.deposit_amount != null) && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Financials</h3>
            <div className="flex gap-6">
              {booking.agreed_amount != null && (
                <div>
                  <p className="text-xs text-gray-400">Agreed Amount</p>
                  <p className="text-xl font-bold text-gray-900">${Number(booking.agreed_amount).toLocaleString()}</p>
                </div>
              )}
              {booking.deposit_amount != null && (
                <div>
                  <p className="text-xs text-gray-400">Deposit</p>
                  <p className="text-lg font-semibold text-gray-700">${Number(booking.deposit_amount).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Client info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Client</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <User className="w-4 h-4 text-gray-400" /> {booking.client_name}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Mail className="w-4 h-4 text-gray-400" />
              <a href={`mailto:${booking.client_email}`} className="text-blue-600 hover:underline">{booking.client_email}</a>
            </div>
            {booking.client_phone && (
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${booking.client_phone}`} className="hover:underline">{booking.client_phone}</a>
              </div>
            )}
          </div>
        </div>

        {/* Artist */}
        {artistDisplay && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Artist</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Mic2 className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{artistDisplay}</p>
                  {booking.artist_accounts?.artist_type && (
                    <p className="text-xs text-gray-500 capitalize">{booking.artist_accounts.artist_type.replace('_', ' ')}</p>
                  )}
                </div>
              </div>
              {booking.artist_account_id && (
                <Link
                  href={`/dashboard/promoter/artists/${booking.artist_account_id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View profile →
                </Link>
              )}
            </div>
            {booking.artist_accounts?.booking_email && (
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <a href={`mailto:${booking.artist_accounts.booking_email}`} className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600">
                  <Mail className="w-3.5 h-3.5" /> {booking.artist_accounts.booking_email}
                </a>
                {booking.artist_accounts.booking_phone && (
                  <a href={`tel:${booking.artist_accounts.booking_phone}`} className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600">
                    <Phone className="w-3.5 h-3.5" /> {booking.artist_accounts.booking_phone}
                  </a>
                )}
              </div>
            )}
            {/* Artist response status */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                booking.status === 'confirmed'
                  ? 'bg-green-100 text-green-700'
                  : booking.status === 'cancelled'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                Artist: {booking.status === 'confirmed' ? '✓ Accepted' : booking.status === 'cancelled' ? '✕ Declined' : '⏳ Awaiting response'}
              </span>
            </div>
          </div>
        )}

        {/* Artist Invoice(s) — invoices sent by the artist to the promoter */}
        {booking.artist_invoices && booking.artist_invoices.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Artist Invoice</h3>
            <div className="space-y-3">
              {booking.artist_invoices.map(ai => (
                <div key={ai.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ai.invoice_number}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      ${Number(ai.total_amount).toLocaleString()} ·{' '}
                      <span className={`font-medium capitalize ${
                        ai.status === 'paid' ? 'text-green-600'
                        : ai.status === 'sent' || ai.status === 'viewed' ? 'text-blue-600'
                        : 'text-gray-500'
                      }`}>{ai.status}</span>
                      {ai.status !== 'paid' && ai.amount_due > 0 && (
                        <span className="text-gray-400"> · ${Number(ai.amount_due).toLocaleString()} due</span>
                      )}
                    </p>
                  </div>
                  <a
                    href={`${FRONTEND_URL}/artist-pay/${ai.public_token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" /> View
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoice */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Invoice</h3>
          </div>
          {invSendResult && invSendResult !== 'sent' && (
            <p className="text-xs text-red-500 mb-2">{invSendResult}</p>
          )}
          {booking.promoter_invoices ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{booking.promoter_invoices.invoice_number}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    ${Number(booking.promoter_invoices.total_amount).toLocaleString()} ·{' '}
                    <span className={`font-medium capitalize ${
                      booking.promoter_invoices.status === 'paid' ? 'text-green-600'
                      : booking.promoter_invoices.status === 'sent' || booking.promoter_invoices.status === 'viewed' ? 'text-blue-600'
                      : 'text-gray-500'
                    }`}>{booking.promoter_invoices.status}</span>
                  </p>
                </div>
                {invoiceUrl && (
                  <Link href={invoiceUrl} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> View
                  </Link>
                )}
              </div>
              <div className="flex gap-2">
                {booking.promoter_invoices.status !== 'paid' && booking.promoter_invoices.status !== 'cancelled' && (
                  <button
                    onClick={handleSendInvoice}
                    disabled={sendingInv}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50">
                    {sendingInv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {invSendResult === 'sent' ? 'Sent!' : booking.promoter_invoices.status === 'draft' ? 'Send to Client' : 'Resend'}
                  </button>
                )}
                {payLink && (
                  <button
                    onClick={handleCopyPayLink}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50">
                    {copiedPay ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPay ? 'Copied!' : 'Copy Pay Link'}
                  </button>
                )}
              </div>
              {booking.promoter_invoices.status === 'paid' && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Payment received
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">No invoice linked yet</p>
              <Link
                href={`/dashboard/promoter/invoices/new?client_name=${encodeURIComponent(booking.client_name)}&client_email=${encodeURIComponent(booking.client_email)}&client_phone=${encodeURIComponent(booking.client_phone || '')}&event_name=${encodeURIComponent(booking.event_name)}&event_date=${encodeURIComponent(booking.event_date || '')}&amount=${booking.agreed_amount ?? ''}&booking_id=${booking.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
              >
                <DollarSign className="w-3.5 h-3.5" /> Create Invoice
              </Link>
            </div>
          )}
        </div>

        {/* Notes */}
        {booking.notes && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{booking.notes}</p>
          </div>
        )}
      </div>

      {/* Close status dropdown on outside click */}
      {statusOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
      )}
    </div>
  )
}
