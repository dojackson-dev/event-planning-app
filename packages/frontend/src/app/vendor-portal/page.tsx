'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import {
  Store,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Phone,
  Mail,
  Globe,
  Instagram,
  Star,
  LogOut,
  MapPin,
  User,
} from 'lucide-react'
import RoleSwitcher from '@/components/RoleSwitcher'

interface VendorAccount {
  id: string
  business_name: string
  category: string
  city: string
  state: string
  zip_code: string
  phone: string
  email: string
  website: string
  instagram: string
  bio: string
  hourly_rate: number
  flat_rate: number
  rate_description: string
  is_verified: boolean
  profile_image_url: string
}

interface VendorBooking {
  id: string
  event_name: string
  event_date: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed'
  agreed_amount: number
  deposit_amount: number
  notes: string
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <AlertCircle className="w-4 h-4" /> },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700 border-green-200',    icon: <CheckCircle2 className="w-4 h-4" /> },
  declined:  { label: 'Declined',  color: 'bg-red-100 text-red-700 border-red-200',          icon: <XCircle className="w-4 h-4" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600 border-gray-200',       icon: <XCircle className="w-4 h-4" /> },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700 border-blue-200',       icon: <CheckCircle2 className="w-4 h-4" /> },
}

const CATEGORY_LABELS: Record<string, string> = {
  dj: '🎧 DJ',
  decorator: '🎨 Decorator',
  planner_coordinator: '📋 Planner / Coordinator',
  furniture: '🪑 Furniture',
  photographer: '📷 Photographer',
  musicians: '🎵 Musicians',
  mc_host: '🎤 MC / Host',
  other: '⭐ Other',
}

export default function VendorPortalPage() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const [account, setAccount] = useState<VendorAccount | null>(null)
  const [bookings, setBookings] = useState<VendorBooking[]>([])
  const [loadingAccount, setLoadingAccount] = useState(true)
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings'>('overview')
  const [statusFilter, setStatusFilter] = useState('')
  const [respondingId, setRespondingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAccount()
    fetchBookings()
  }, [])

  const fetchAccount = async () => {
    try {
      const res = await api.get('/vendors/account/me')
      setAccount(res.data)
    } catch {
      // No account yet
    } finally {
      setLoadingAccount(false)
    }
  }

  const fetchBookings = async () => {
    try {
      const res = await api.get('/vendors/bookings/mine')
      setBookings(res.data || [])
    } catch {
      // silently fail
    } finally {
      setLoadingBookings(false)
    }
  }

  const handleRespond = async (bookingId: string, status: 'confirmed' | 'declined') => {
    setRespondingId(bookingId)
    try {
      await api.put(`/vendors/bookings/${bookingId}`, { status })
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
    } catch {
      alert('Failed to update booking. Please try again.')
    } finally {
      setRespondingId(null)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const filteredBookings = statusFilter
    ? bookings.filter(b => b.status === statusFilter)
    : bookings

  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const pendingCount = counts['pending'] || 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6 text-primary-600" />
            <div>
              <p className="font-semibold text-gray-900 leading-none">
                {account?.business_name || 'Vendor Portal'}
              </p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Role switcher — shows only when user also has an owner role */}
            <RoleSwitcher variant="banner" />

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl w-fit mb-6 shadow-sm">
          {[
            { id: 'overview', label: 'My Profile' },
            { id: 'bookings', label: `Booking Requests${pendingCount > 0 ? ` (${pendingCount} new)` : ''}` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'bookings')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ───────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            {loadingAccount ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mr-3" />
                Loading profile…
              </div>
            ) : !account ? (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                <Store className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-semibold text-gray-700 text-lg mb-1">No vendor profile found</p>
                <p className="text-gray-400 text-sm">Contact DoVenueSuite support to set up your vendor account.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile card */}
                <div className="md:col-span-1 bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center text-center shadow-sm">
                  {account.profile_image_url ? (
                    <img
                      src={account.profile_image_url}
                      alt={account.business_name}
                      className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-primary-100"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary-50 flex items-center justify-center mb-4 border-4 border-primary-100">
                      <User className="w-10 h-10 text-primary-400" />
                    </div>
                  )}
                  <h2 className="text-xl font-bold text-gray-900">{account.business_name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{CATEGORY_LABELS[account.category] || account.category}</p>
                  {account.is_verified && (
                    <span className="mt-2 inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  )}
                  {(account.city || account.state) && (
                    <p className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {[account.city, account.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>

                {/* Details */}
                <div className="md:col-span-2 space-y-4">
                  {account.bio && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">About</h3>
                      <p className="text-gray-700 text-sm leading-relaxed">{account.bio}</p>
                    </div>
                  )}

                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Rates</h3>
                    <div className="flex gap-4 flex-wrap">
                      {account.hourly_rate > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-primary-500" />
                          <span className="font-semibold text-gray-900">${account.hourly_rate}/hr</span>
                        </div>
                      )}
                      {account.flat_rate > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-primary-500" />
                          <span className="font-semibold text-gray-900">${account.flat_rate} flat rate</span>
                        </div>
                      )}
                      {account.rate_description && (
                        <p className="text-xs text-gray-400 w-full mt-1">{account.rate_description}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Contact</h3>
                    <div className="space-y-2">
                      {account.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Phone className="w-4 h-4 text-gray-400" /> {account.phone}
                        </div>
                      )}
                      {account.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Mail className="w-4 h-4 text-gray-400" /> {account.email}
                        </div>
                      )}
                      {account.website && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <a href={account.website} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">{account.website}</a>
                        </div>
                      )}
                      {account.instagram && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Instagram className="w-4 h-4 text-gray-400" /> @{account.instagram.replace('@', '')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── BOOKINGS TAB ───────────────────────────── */}
        {activeTab === 'bookings' && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Pending',   value: counts['pending']   || 0, color: 'text-yellow-600' },
                { label: 'Confirmed', value: counts['confirmed'] || 0, color: 'text-green-600' },
                { label: 'Completed', value: counts['completed'] || 0, color: 'text-blue-600' },
                { label: 'Total',     value: bookings.length,           color: 'text-gray-700' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 flex-wrap mb-4">
              {[
                { value: '', label: `All (${bookings.length})` },
                { value: 'pending',   label: `Pending (${counts['pending']   || 0})` },
                { value: 'confirmed', label: `Confirmed (${counts['confirmed'] || 0})` },
                { value: 'completed', label: `Completed (${counts['completed'] || 0})` },
                { value: 'declined',  label: `Declined (${counts['declined']  || 0})` },
                { value: 'cancelled', label: `Cancelled (${counts['cancelled'] || 0})` },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                    statusFilter === f.value
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-primary-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loadingBookings ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mr-3" />
                Loading bookings…
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No bookings yet</p>
                <p className="text-sm mt-1">Booking requests from venue owners will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map(booking => {
                  const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
                  return (
                    <div key={booking.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{booking.event_name}</h3>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${status.color}`}>
                              {status.icon} {status.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 mt-1.5 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(booking.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            {booking.start_time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {booking.start_time}{booking.end_time ? ` – ${booking.end_time}` : ''}
                              </span>
                            )}
                            {booking.agreed_amount > 0 && (
                              <span className="flex items-center gap-1 font-medium text-gray-700">
                                <DollarSign className="w-3.5 h-3.5" />
                                ${booking.agreed_amount.toLocaleString()}
                                {booking.deposit_amount > 0 && <span className="text-xs text-gray-400 font-normal">&nbsp;(${booking.deposit_amount} deposit)</span>}
                              </span>
                            )}
                          </div>
                          {booking.notes && (
                            <p className="mt-1.5 text-xs text-gray-400 italic">{booking.notes}</p>
                          )}
                        </div>

                        {/* Actions — only for pending */}
                        {booking.status === 'pending' && (
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleRespond(booking.id, 'declined')}
                              disabled={respondingId === booking.id}
                              className="px-4 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleRespond(booking.id, 'confirmed')}
                              disabled={respondingId === booking.id}
                              className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                            >
                              {respondingId === booking.id ? 'Saving…' : 'Confirm'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
