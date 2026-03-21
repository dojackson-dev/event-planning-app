'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import {
  Calendar, User, Mail, Phone, MapPin, Clock,
  CheckCircle2, XCircle, AlertCircle, Loader2, ChevronDown, DollarSign,
} from 'lucide-react'

interface BookingRequest {
  id: string
  client_name: string
  client_email: string
  client_phone: string | null
  event_name: string | null
  event_date: string | null
  start_time: string | null
  end_time: string | null
  venue_name: string | null
  venue_address: string | null
  notes: string | null
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled'
  quoted_amount: number | null
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700 border-green-200',    icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  declined:  { label: 'Declined',  color: 'bg-red-100 text-red-700 border-red-200',          icon: <XCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 border-gray-200',       icon: <XCircle className="w-3.5 h-3.5" /> },
}

export default function BookingRequestsPage() {
  const [requests, setRequests] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [quotedAmounts, setQuotedAmounts] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const res = await api.get('/vendors/booking-requests/mine')
      setRequests(res.data || [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const handleRespond = async (id: string, status: 'confirmed' | 'declined') => {
    setRespondingId(id)
    try {
      const quotedAmount = quotedAmounts[id] ? Number(quotedAmounts[id]) : undefined
      const res = await api.put(`/vendors/booking-requests/${id}`, { status, quotedAmount })
      setRequests(prev => prev.map(r => r.id === id ? res.data : r))
    } catch {
      alert('Failed to update request. Please try again.')
    } finally {
      setRespondingId(null)
    }
  }

  const filtered = filter ? requests.filter(r => r.status === filter) : requests
  const counts = requests.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/vendor-portal" className="text-sm text-gray-400 hover:text-gray-600 mb-2 inline-block">
          ← Vendor Portal
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <Calendar className="w-6 h-6 text-primary-600" />
          Booking Requests
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Pending',   value: counts['pending']   || 0, color: 'text-yellow-600' },
            { label: 'Confirmed', value: counts['confirmed'] || 0, color: 'text-green-600' },
            { label: 'Declined',  value: counts['declined']  || 0, color: 'text-red-500' },
            { label: 'Total',     value: requests.length,         color: 'text-gray-700' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap mb-4">
          {[
            { value: '', label: `All (${requests.length})` },
            { value: 'pending',   label: `Pending (${counts['pending'] || 0})` },
            { value: 'confirmed', label: `Confirmed (${counts['confirmed'] || 0})` },
            { value: 'declined',  label: `Declined (${counts['declined'] || 0})` },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                filter === f.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-primary-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No booking requests yet</p>
            <p className="text-sm mt-1">Share your booking link so clients can reach out.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(req => {
              const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending
              const isExpanded = expandedId === req.id
              const isPending = req.status === 'pending'

              return (
                <div key={req.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Header row */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{req.client_name}</p>
                          {req.event_name && (
                            <span className="text-xs text-gray-400 hidden sm:inline">— {req.event_name}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {req.client_email && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="w-4 h-4 text-gray-400" /> {req.client_email}
                          </div>
                        )}
                        {req.client_phone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400" /> {req.client_phone}
                          </div>
                        )}
                        {req.event_date && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400" /> {req.event_date}
                            {(req.start_time || req.end_time) && (
                              <span className="text-gray-400">
                                {req.start_time && `· ${req.start_time}`}
                                {req.end_time && ` – ${req.end_time}`}
                              </span>
                            )}
                          </div>
                        )}
                        {req.venue_name && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-4 h-4 text-gray-400" /> {req.venue_name}
                          </div>
                        )}
                      </div>

                      {req.notes && (
                        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">{req.notes}</div>
                      )}

                      {/* Actions for pending requests */}
                      {isPending && (
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Quote amount (optional)"
                              value={quotedAmounts[req.id] ?? ''}
                              onChange={e => setQuotedAmounts(prev => ({ ...prev, [req.id]: e.target.value }))}
                              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-48"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRespond(req.id, 'confirmed')}
                              disabled={respondingId === req.id}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
                            >
                              {respondingId === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              Confirm
                            </button>
                            <button
                              onClick={() => handleRespond(req.id, 'declined')}
                              disabled={respondingId === req.id}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Decline
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Show quoted amount if set */}
                      {!isPending && req.quoted_amount && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          Quoted: <span className="font-semibold">${Number(req.quoted_amount).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
