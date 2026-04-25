'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import VendorNav from '@/components/VendorNav'
import { AlertCircle, CheckCircle2, XCircle, DollarSign, Pencil, X } from 'lucide-react'
import type { VendorProfile, Booking } from '@/lib/vendorTypes'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <AlertCircle className="w-4 h-4" /> },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700 border-green-200',    icon: <CheckCircle2 className="w-4 h-4" /> },
  paid:      { label: 'Paid',      color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <DollarSign className="w-4 h-4" /> },
  declined:  { label: 'Declined',  color: 'bg-red-100 text-red-700 border-red-200',          icon: <XCircle className="w-4 h-4" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600 border-gray-200',       icon: <XCircle className="w-4 h-4" /> },
  completed: { label: 'Paid',      color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <DollarSign className="w-4 h-4" /> },
}

export default function BookingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [editAgreed, setEditAgreed] = useState('')
  const [editDeposit, setEditDeposit] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.replace('/vendors/login'); return }

    const load = async () => {
      try {
        const [profileRes, bookingsRes] = await Promise.all([
          api.get('/vendors/account/me'),
          api.get('/vendors/bookings/mine'),
        ])
        setProfile(profileRes.data)
        setBookings(bookingsRes.data || [])
      } catch (err: any) {
        if (err.response?.status === 401) router.replace('/vendors/login')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const updateBookingStatus = async (bookingId: string, status: string) => {
    setUpdating(bookingId)
    try {
      await api.put(`/vendors/bookings/${bookingId}`, { status })
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
      if (selectedBooking?.id === bookingId) setSelectedBooking(prev => prev ? { ...prev, status } : prev)
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(null)
    }
  }

  const openEdit = (booking: Booking) => {
    setSelectedBooking(booking)
    setEditAgreed(booking.agreed_amount > 0 ? String(booking.agreed_amount) : '')
    setEditDeposit(booking.deposit_amount > 0 ? String(booking.deposit_amount) : '')
    setEditNotes(booking.notes || '')
    setSaved(false)
  }

  const saveEdit = async () => {
    if (!selectedBooking) return
    setSaving(true)
    try {
      const payload: Record<string, any> = { notes: editNotes || undefined }
      if (editAgreed !== '') payload.agreedAmount = parseFloat(editAgreed)
      if (editDeposit !== '') payload.depositAmount = parseFloat(editDeposit)
      const { data } = await api.put(`/vendors/bookings/${selectedBooking.id}`, payload)
      const updated = { ...selectedBooking, ...data, agreed_amount: payload.agreedAmount ?? selectedBooking.agreed_amount, deposit_amount: payload.depositAmount ?? selectedBooking.deposit_amount, notes: editNotes || selectedBooking.notes }
      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? updated : b))
      setSelectedBooking(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error(err)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const filteredBookings = (statusFilter === 'all'
    ? bookings
    : statusFilter === 'paid'
      ? bookings.filter(b => b.status === 'paid' || b.status === 'completed')
      : bookings.filter(b => b.status === statusFilter)
  ).slice().sort((a, b) => {
    const aDate = new Date(a.event_date)
    const bDate = new Date(b.event_date)
    const aFuture = aDate >= today
    const bFuture = bDate >= today
    if (aFuture && bFuture) return aDate.getTime() - bDate.getTime()   // nearest upcoming first
    if (!aFuture && !bFuture) return bDate.getTime() - aDate.getTime() // most-recently-expired first, oldest last
    return aFuture ? -1 : 1                                             // upcoming before past
  })

  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const revenue = bookings
    .filter(b => b.status === 'paid' || b.status === 'completed')
    .reduce((sum, b) => sum + (b.agreed_amount || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VendorNav profile={profile} currentPage="Bookings" />

      {/* ── Booking Detail / Edit Modal ── */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mt-8 mb-8">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedBooking.event_name}</h2>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium mt-1 ${(STATUS_CONFIG[selectedBooking.status] || STATUS_CONFIG.pending).color}`}>
                  {(STATUS_CONFIG[selectedBooking.status] || STATUS_CONFIG.pending).icon}
                  {(STATUS_CONFIG[selectedBooking.status] || STATUS_CONFIG.pending).label}
                </span>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Event Details (read-only) */}
            <div className="px-6 py-4 space-y-2 border-b bg-gray-50">
              <p className="text-sm text-gray-600">
                📅 {new Date(selectedBooking.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                {selectedBooking.start_time && ` · ${selectedBooking.start_time}`}
                {selectedBooking.end_time && ` – ${selectedBooking.end_time}`}
              </p>
              {selectedBooking.venue_name && <p className="text-sm text-gray-600">📍 {selectedBooking.venue_name}</p>}
              {selectedBooking.client_name && <p className="text-sm text-gray-600">👤 {selectedBooking.client_name}</p>}
            </div>

            {/* Editable fields */}
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agreed Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                    <input
                      type="number" step="0.01" min="0"
                      value={editAgreed}
                      onChange={e => setEditAgreed(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                    <input
                      type="number" step="0.01" min="0"
                      value={editDeposit}
                      onChange={e => setEditDeposit(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Add details, requirements, or a quote breakdown…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <button
                onClick={saveEdit}
                disabled={saving || saved}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                  saved
                    ? 'bg-green-600 text-white cursor-default'
                    : 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50'
                }`}
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
              </button>
            </div>

            {/* Status actions */}
            {selectedBooking.status === 'pending' && (
              <div className="px-6 pb-5 flex gap-3">
                <button
                  onClick={() => updateBookingStatus(selectedBooking.id, 'confirmed')}
                  disabled={updating === selectedBooking.id}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  ✓ Accept
                </button>
                <button
                  onClick={() => updateBookingStatus(selectedBooking.id, 'declined')}
                  disabled={updating === selectedBooking.id}
                  className="flex-1 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                >
                  ✗ Decline
                </button>
              </div>
            )}
            {selectedBooking.status === 'confirmed' && (
              <div className="px-6 pb-5">
                <button
                  onClick={() => updateBookingStatus(selectedBooking.id, 'completed')}
                  disabled={updating === selectedBooking.id}
                  className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  Mark as Paid
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/vendors/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          ← Back to Dashboard
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-lg font-bold text-gray-900">Booking Requests</h1>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="declined">Declined</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Pending',   value: String(counts['pending']   || 0), color: 'text-yellow-600' },
              { label: 'Confirmed', value: String(counts['confirmed'] || 0), color: 'text-green-600'  },
              { label: 'Paid', value: String((counts['completed'] || 0) + (counts['paid'] || 0)), color: 'text-emerald-600' },
              { label: 'Revenue',   value: `$${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-emerald-600' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {filteredBookings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">📭</div>
              <p>No bookings yet.</p>
              <p className="text-sm mt-1">Once owners book you, they&apos;ll appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map(booking => {
                const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
                const isPast = new Date(booking.event_date) < today
                return (
                  <div
                    key={booking.id}
                    className="rounded-xl p-4 transition-all hover:shadow-md cursor-pointer"
                    style={{
                      outline: isPast ? '1.5px solid #d1d5db' : '2px solid #60a5fa',
                      outlineOffset: '-1px',
                      background: isPast ? '#f9fafb' : '#ffffff',
                      opacity: isPast ? 0.75 : 1,
                    }}
                    onClick={() => openEdit(booking)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{booking.event_name}</h3>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${statusCfg.color}`}>
                            {statusCfg.icon} {statusCfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          📅 {new Date(booking.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          {booking.start_time && ` · ${booking.start_time}`}
                          {booking.end_time && ` – ${booking.end_time}`}
                        </p>
                        {booking.venue_name && (
                          <p className="text-sm text-gray-500">📍 {booking.venue_name}</p>
                        )}
                        {booking.agreed_amount > 0 && (
                          <p className="text-sm font-medium text-gray-700 mt-1">
                            💰 ${booking.agreed_amount.toLocaleString()}
                            {booking.deposit_amount > 0 && (
                              <span className="text-xs text-gray-400 font-normal"> (${booking.deposit_amount} deposit)</span>
                            )}
                            {booking.payment_status && booking.status !== 'paid' && booking.status !== 'completed' && (
                              <span className="text-xs text-gray-400 font-normal"> · {booking.payment_status.replace('_', ' ')}</span>
                            )}
                          </p>
                        )}
                        {booking.notes && (
                          <p className="text-sm text-gray-500 italic mt-1">&ldquo;{booking.notes}&rdquo;</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => openEdit(booking)}
                          className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Details
                        </button>
                        {booking.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                              disabled={updating === booking.id}
                              className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              ✓ Accept
                            </button>
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'declined')}
                              disabled={updating === booking.id}
                              className="border border-red-300 text-red-600 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                            >
                              ✗ Decline
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'completed')}
                            disabled={updating === booking.id}
                            className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
