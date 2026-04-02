'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import ImageUpload from '@/components/ImageUpload'
import ConnectBankButton from '@/components/ConnectBankButton'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
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
  MapPin,
  User,
  FileText,
  Link2,
  Plus,
  Send,
  Eye,
} from 'lucide-react'

// ─── Status configs ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
  completed: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <AlertCircle className="w-4 h-4" /> },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700 border-green-200',    icon: <CheckCircle2 className="w-4 h-4" /> },
  paid:      { label: 'Paid',      color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <DollarSign className="w-4 h-4" /> },
  declined:  { label: 'Declined',  color: 'bg-red-100 text-red-700 border-red-200',          icon: <XCircle className="w-4 h-4" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600 border-gray-200',       icon: <XCircle className="w-4 h-4" /> },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700 border-blue-200',       icon: <CheckCircle2 className="w-4 h-4" /> },
}

const INVOICE_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     color: 'bg-gray-100 text-gray-600 border-gray-200',       icon: <Clock className="w-3 h-3" /> },
  sent:      { label: 'Sent',      color: 'bg-blue-100 text-blue-700 border-blue-200',        icon: <Send className="w-3 h-3" /> },
  viewed:    { label: 'Viewed',    color: 'bg-purple-100 text-purple-700 border-purple-200',  icon: <Eye className="w-3 h-3" /> },
  paid:      { label: 'Paid',      color: 'bg-green-100 text-green-700 border-green-200',     icon: <CheckCircle2 className="w-3 h-3" /> },
  overdue:   { label: 'Overdue',   color: 'bg-red-100 text-red-700 border-red-200',           icon: <AlertCircle className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 border-gray-200',        icon: <XCircle className="w-3 h-3" /> },
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

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface VendorProfile {
  id: string
  business_name: string
  category: string
  bio: string
  address: string
  city: string
  state: string
  zip_code: string
  profile_image_url: string
  cover_image_url: string
  is_verified: boolean
  hourly_rate: number
  flat_rate: number
  rate_description: string
  phone: string
  email: string
  website: string
  instagram: string
  facebook: string
  avgRating?: number
  reviewCount?: number
}

interface Booking {
  id: string
  event_name: string
  event_date: string
  start_time: string
  end_time: string
  venue_name: string
  status: string
  agreed_amount: number
  deposit_amount: number
  payment_status: string
  notes: string
}

interface VendorInvoice {
  id: string
  invoice_number: string
  client_name: string
  client_email: string
  total_amount: number
  amount_due: number
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
  issue_date: string
  due_date: string
}

interface Review {
  id: string
  rating: number
  review_text: string
  created_at: string
  reviewer_user_id: string
}

type TabId = 'overview' | 'bookings' | 'calendar' | 'earnings' | 'reviews' | 'invoices' | 'profile' | 'payouts'

// ─── Main Component ───────────────────────────────────────────────────────────


export default function VendorDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [invoices, setInvoices] = useState<VendorInvoice[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingInvoices, setLoadingInvoices] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profileRes, bookingsRes] = await Promise.all([
          api.get('/vendors/account/me'),
          api.get('/vendors/bookings/mine'),
        ])
        setProfile(profileRes.data)
        setBookings(bookingsRes.data)
        try {
          const revRes = await api.get(`/vendors/${profileRes.data.id}/reviews`)
          setReviews(revRes.data || [])
        } catch {}
      } catch (err: any) {
        if (err.response?.status === 401) {
          router.push('/vendors/login')
        } else if (err.response?.status === 404) {
          router.push('/vendors/register')
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [router])

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const res = await api.get('/vendor-invoices/mine')
        setInvoices(res.data || [])
      } catch {}
      finally { setLoadingInvoices(false) }
    }
    loadInvoices()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_role')
    router.push('/vendors/login')
  }

  const updateBookingStatus = async (bookingId: string, status: string) => {
    setUpdating(bookingId)
    try {
      await api.put(`/vendors/bookings/${bookingId}`, { status })
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(null)
    }
  }

  const filteredBookings = statusFilter === 'all'
    ? bookings
    : bookings.filter(b => b.status === statusFilter)

  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const pendingCount = counts['pending'] || 0

  const stats = {
    pending: pendingCount,
    confirmed: counts['confirmed'] || 0,
    completed: (counts['completed'] || 0) + (counts['paid'] || 0),
    revenue: bookings
      .filter(b => b.status === 'paid' || b.status === 'completed')
      .reduce((sum, b) => sum + (b.agreed_amount || 0), 0),
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600" />
      </div>
    )
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview',  label: '📊 Overview' },
    { id: 'bookings',  label: `📋 Bookings${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
    { id: 'calendar',  label: '📆 Calendar' },
    { id: 'earnings',  label: '💰 Earnings' },
    { id: 'invoices',  label: `🧾 Invoices${invoices.length > 0 ? ` (${invoices.length})` : ''}` },
    { id: 'reviews',   label: `⭐ Reviews${reviews.length > 0 ? ` (${reviews.length})` : ''}` },
    { id: 'profile',   label: '✏️ Profile' },
    { id: 'payouts',   label: '🏦 Payouts' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="w-5 h-5 text-primary-600" />
            <div>
              <p className="font-semibold text-gray-900 leading-none">
                {profile?.business_name || 'Vendor Dashboard'}
              </p>
              <p className="text-xs text-gray-400">{profile?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/vendors" className="text-sm text-gray-500 hover:text-gray-700">Directory</Link>
            {profile && (
              <Link href={`/vendors/${profile.id}`} className="text-sm text-gray-500 hover:text-gray-700">
                My Profile
              </Link>
            )}
            <Link href="/vendors/settings" className="text-sm text-gray-500 hover:text-gray-700">⚙️ Settings</Link>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Quick action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => setActiveTab('invoices')}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-primary-300 hover:shadow-md transition-all flex items-center gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Invoices</p>
              <p className="text-xs text-gray-400">Create &amp; send invoices</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-primary-300 hover:shadow-md transition-all flex items-center gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Booking Requests</p>
              <p className="text-xs text-gray-400">
                {pendingCount > 0 ? `${pendingCount} new request${pendingCount > 1 ? 's' : ''}` : 'Manage requests'}
              </p>
            </div>
          </button>

          <Link
            href="/vendor-portal/booking-link"
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-primary-300 hover:shadow-md transition-all flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <Link2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Booking Link</p>
              <p className="text-xs text-gray-400">Share your booking page</p>
            </div>
          </Link>
        </div>

        {/* Invoice feature spotlight */}
        <button
          onClick={() => setActiveTab('invoices')}
          className="w-full flex items-center gap-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl p-4 mb-6 shadow-md hover:from-primary-700 hover:to-primary-800 transition-all group text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-bold text-sm">✨ External Invoicing</p>
              <span className="bg-white/25 text-white text-xs font-semibold px-2 py-0.5 rounded-full">New</span>
            </div>
            <p className="text-primary-100 text-xs leading-snug">
              Send invoices to clients outside DoVenue Suite. They pay via a secure link — no account needed. You get paid directly.
            </p>
          </div>
          <span className="text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all text-lg flex-shrink-0">→</span>
        </button>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Pending',   value: stats.pending,                       color: 'text-yellow-600', bg: 'bg-yellow-50',  border: 'border-yellow-200', tab: 'bookings'  as TabId },
            { label: 'Confirmed', value: stats.confirmed,                      color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-200',  tab: 'bookings'  as TabId },
            { label: 'Completed', value: stats.completed,                      color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200',   tab: 'bookings'  as TabId },
            { label: 'Revenue',   value: `$${stats.revenue.toLocaleString()}`, color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-200', tab: 'earnings' as TabId },
          ].map(s => (
            <button
              key={s.label}
              onClick={() => setActiveTab(s.tab)}
              className={`${s.bg} border ${s.border} rounded-xl p-4 text-left hover:opacity-80 transition-opacity w-full`}
            >
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 text-sm font-medium rounded-xl transition-colors text-center whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Overview</h2>

            {pendingCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-5">
                <p className="text-yellow-800 font-medium text-sm">
                  ⏳ You have {pendingCount} pending booking request{pendingCount > 1 ? 's' : ''} awaiting your response.
                </p>
                <button onClick={() => setActiveTab('bookings')} className="text-yellow-700 underline text-sm mt-1">
                  Review bookings →
                </button>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Upcoming Confirmed Events</h3>
              {bookings.filter(b => b.status === 'confirmed' && new Date(b.event_date) >= new Date()).length === 0 ? (
                <p className="text-sm text-gray-400">No upcoming events.</p>
              ) : (
                <div className="space-y-2">
                  {bookings
                    .filter(b => b.status === 'confirmed' && new Date(b.event_date) >= new Date())
                    .slice(0, 5)
                    .map(b => (
                      <div key={b.id} className="flex items-center justify-between text-sm border-b pb-2">
                        <span className="font-medium">{b.event_name}</span>
                        <span className="text-gray-500">{new Date(b.event_date).toLocaleDateString()}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BOOKINGS TAB ─────────────────────────────────────────── */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Booking Requests</h2>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="declined">Declined</option>
                <option value="completed">Completed</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Pending',   value: String(counts['pending']   || 0), color: 'text-yellow-600' },
                { label: 'Confirmed', value: String(counts['confirmed'] || 0), color: 'text-green-600'  },
                { label: 'Completed', value: String((counts['completed'] || 0) + (counts['paid'] || 0)), color: 'text-blue-600' },
                { label: 'Revenue',   value: `$${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-emerald-600' },
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
                <p className="text-sm mt-1">Once owners book you, they'll appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map(booking => {
                  const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
                  return (
                    <div key={booking.id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{booking.event_name}</h3>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${statusCfg.color}`}>
                              {statusCfg.icon} {statusCfg.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            📅 {new Date(booking.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            {booking.start_time && ` · ${booking.start_time}`}
                            {booking.end_time && ` – ${booking.end_time}`}
                          </p>
                          {booking.venue_name && (
                            <p className="text-sm text-gray-500">📍 {booking.venue_name}</p>
                          )}
                          {booking.agreed_amount > 0 && (
                            <p className="text-sm font-medium text-gray-700 mt-1">
                              💰 ${booking.agreed_amount.toLocaleString()}
                              {booking.deposit_amount > 0 && <span className="text-xs text-gray-400 font-normal"> ({booking.deposit_amount} deposit)</span>}
                              {booking.payment_status && <span className="text-xs text-gray-400 font-normal"> · {booking.payment_status.replace('_', ' ')}</span>}
                            </p>
                          )}
                          {booking.notes && (
                            <p className="text-sm text-gray-500 italic mt-1">"{booking.notes}"</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
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
                              className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                            >
                              Mark Complete
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
        )}

        {/* ── CALENDAR TAB ─────────────────────────────────────────── */}
        {activeTab === 'calendar' && (
          <VendorCalendarTab bookings={bookings} />
        )}

        {/* ── EARNINGS TAB ─────────────────────────────────────────── */}
        {activeTab === 'earnings' && (() => {
          const paid = bookings.filter(b => b.status === 'paid' || b.status === 'completed')
          const confirmed = bookings.filter(b => b.status === 'confirmed')
          const totalEarned = paid.reduce((s, b) => s + (b.agreed_amount || 0), 0)
          const totalPending = confirmed.reduce((s, b) => s + (b.agreed_amount || 0), 0)

          const byMonth: Record<string, number> = {}
          paid.forEach(b => {
            const month = new Date(b.event_date).toLocaleString('default', { month: 'short', year: 'numeric' })
            byMonth[month] = (byMonth[month] || 0) + (b.agreed_amount || 0)
          })
          const months = Object.entries(byMonth).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())

          return (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Earnings Breakdown</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 font-medium">Total Earned</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">${totalEarned.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{paid.length} paid booking{paid.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 font-medium">Pending (Confirmed)</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">${totalPending.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{confirmed.length} upcoming booking{confirmed.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-primary-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 font-medium">Avg per Booking</p>
                  <p className="text-2xl font-bold text-primary-600 mt-1">
                    ${paid.length > 0 ? Math.round(totalEarned / paid.length).toLocaleString() : '0'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">from completed events</p>
                </div>
              </div>

              {months.length > 0 ? (
                <>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Monthly Breakdown</h3>
                  <div className="space-y-2">
                    {months.map(([month, amount]) => {
                      const pct = Math.round((amount / totalEarned) * 100)
                      return (
                        <div key={month} className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 w-28 flex-shrink-0">{month}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-semibold text-gray-800 w-24 text-right">${amount.toLocaleString()}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <p className="text-3xl mb-2">💸</p>
                  <p>No completed earnings yet.</p>
                  <p className="text-sm mt-1">Earnings appear once bookings are paid or marked complete.</p>
                </div>
              )}

              {paid.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Paid Booking History</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
                          <th className="pb-2 pr-4">Event</th>
                          <th className="pb-2 pr-4">Date</th>
                          <th className="pb-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paid.map(b => (
                          <tr key={b.id}>
                            <td className="py-2 pr-4 font-medium text-gray-800">{b.event_name}</td>
                            <td className="py-2 pr-4 text-gray-500">{new Date(b.event_date).toLocaleDateString()}</td>
                            <td className="py-2 text-right font-semibold text-green-700">${(b.agreed_amount || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* ── INVOICES TAB ─────────────────────────────────────────── */}
        {activeTab === 'invoices' && (
          <>
            {(() => {
              const totals = invoices.reduce(
                (acc, inv) => {
                  acc.total += Number(inv.total_amount)
                  if (inv.status === 'paid') acc.paid += Number(inv.total_amount)
                  if (['sent', 'viewed', 'overdue'].includes(inv.status)) acc.outstanding += Number(inv.amount_due)
                  return acc
                },
                { total: 0, paid: 0, outstanding: 0 },
              )
              return (
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Total Invoiced', value: `$${totals.total.toFixed(2)}`,      color: 'text-gray-900'   },
                    { label: 'Collected',      value: `$${totals.paid.toFixed(2)}`,        color: 'text-green-600'  },
                    { label: 'Outstanding',    value: `$${totals.outstanding.toFixed(2)}`, color: 'text-orange-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              )
            })()}

            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-700 text-sm">All Invoices</h2>
              <Link
                href="/vendor-portal/invoices/new"
                className="inline-flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> New Invoice
              </Link>
            </div>

            {loadingInvoices ? (
              <div className="flex justify-center py-16 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mr-3" />
                Loading invoices…
              </div>
            ) : invoices.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No invoices yet</p>
                <Link href="/vendor-portal/invoices/new" className="mt-4 inline-flex items-center gap-2 text-primary-600 text-sm hover:underline">
                  <Plus className="w-4 h-4" /> Create your first invoice
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map(inv => {
                  const cfg = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.draft
                  return (
                    <Link
                      key={inv.id}
                      href={`/vendor-portal/invoices/${inv.id}`}
                      className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-primary-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <DollarSign className="w-8 h-8 text-primary-400 bg-primary-50 rounded-lg p-1.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{inv.invoice_number}</p>
                          <p className="text-xs text-gray-500 truncate">{inv.client_name} · {inv.client_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="font-bold text-gray-900 text-sm">${Number(inv.total_amount).toFixed(2)}</p>
                          <p className="text-xs text-gray-400">Due {inv.due_date}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── REVIEWS TAB ──────────────────────────────────────────── */}
        {activeTab === 'reviews' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">My Reviews</h2>
              {reviews.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-yellow-500">
                    {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}
                  </span>
                  <div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <span key={n} className={`text-lg ${n <= Math.round(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              )}
            </div>
            {reviews.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">⭐</p>
                <p className="font-medium">No reviews yet</p>
                <p className="text-sm mt-1">Reviews appear here once event owners rate your services</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <span key={n} className={`text-base ${n <= review.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {review.review_text && (
                      <p className="text-sm text-gray-700">&ldquo;{review.review_text}&rdquo;</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE TAB ──────────────────────────────────────────── */}
        {activeTab === 'profile' && profile && (
          <EditProfileTab
            profile={profile}
            onUpdate={(updated) => setProfile(prev => prev ? { ...prev, ...updated } : prev)}
          />
        )}

        {/* ── PAYOUTS TAB ──────────────────────────────────────────── */}
        {activeTab === 'payouts' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">🏦 Bank Account &amp; Payouts</h2>
            <p className="text-sm text-gray-500 mb-6">
              Connect your bank account to receive payments from event owners directly through DoVenueSuite. Powered by Stripe.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">💰 How vendor payouts work</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Event owners pay you directly through DoVenueSuite</li>
                <li>• DoVenueSuite collects a <strong>5% platform fee</strong> per payout</li>
                <li>• Funds arrive in your bank within 2 business days</li>
                <li>• Stripe handles all payment compliance and security</li>
              </ul>
            </div>
            {profile && (
              <ConnectBankButton role="vendor" email={profile.email || ''} />
            )}
          </div>
        )}

      </div>
    </div>
  )
}








const BOOKING_STATUS_DOT: Record<string, string> = {
  pending:   'bg-yellow-400',
  confirmed: 'bg-green-500',
  completed: 'bg-blue-500',
  declined:  'bg-red-400',
  cancelled: 'bg-gray-400',
}

function VendorCalendarTab({ bookings }: { bookings: Booking[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selected, setSelected] = useState<Booking | null>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd   = endOfMonth(currentDate)
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd     = endOfWeek(monthEnd,   { weekStartsOn: 0 })
  const days       = eachDayOfInterval({ start: calStart, end: calEnd })

  // Parse event_date as local date to avoid UTC-offset shift
  const parseLocal = (s: string) => {
    const [y, m, d] = s.split('T')[0].split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  const bookingsOnDay = (day: Date) =>
    bookings.filter(b => isSameDay(parseLocal(b.event_date), day))

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-900">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentDate(d => subMonths(d, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(d => addMonths(d, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-t border-gray-100">
        {days.map(day => {
          const dayBookings = bookingsOnDay(day)
          const inMonth = isSameMonth(day, currentDate)
          const today   = isToday(day)
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[72px] border-r border-b border-gray-100 p-1 ${inMonth ? 'bg-white' : 'bg-gray-50'}`}
            >
              <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full mb-0.5 ${
                today
                  ? 'bg-primary-600 text-white'
                  : inMonth ? 'text-gray-700' : 'text-gray-300'
              }`}>
                {format(day, 'd')}
              </span>
              <div className="space-y-0.5">
                {dayBookings.slice(0, 3).map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelected(b)}
                    className={`w-full text-left truncate text-xs px-1 py-0.5 rounded font-medium flex items-center gap-1 ${
                      b.status === 'pending'   ? 'bg-yellow-50 text-yellow-700' :
                      b.status === 'confirmed' ? 'bg-green-50 text-green-700'  :
                      b.status === 'completed' ? 'bg-blue-50 text-blue-600'    :
                      'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${BOOKING_STATUS_DOT[b.status] || 'bg-gray-400'}`} />
                    <span className="truncate">{b.event_name}</span>
                  </button>
                ))}
                {dayBookings.length > 3 && (
                  <p className="text-xs text-gray-400 pl-1">+{dayBookings.length - 3} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 flex-wrap">
        {[
          { label: 'Pending',   color: 'bg-yellow-400' },
          { label: 'Confirmed', color: 'bg-green-500'  },
          { label: 'Completed', color: 'bg-blue-500'   },
          { label: 'Declined',  color: 'bg-red-400'    },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-2 h-2 rounded-full ${l.color}`} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-lg leading-snug">{selected.event_name}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0">✕</button>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium text-gray-700">📅 Date: </span>
                {parseLocal(selected.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              {(selected.start_time || selected.end_time) && (
                <p>
                  <span className="font-medium text-gray-700">🕐 Time: </span>
                  {[selected.start_time, selected.end_time].filter(Boolean).join(' – ')}
                </p>
              )}
              {selected.venue_name && (
                <p><span className="font-medium text-gray-700">📍 Venue: </span>{selected.venue_name}</p>
              )}
              {selected.agreed_amount != null && (
                <p><span className="font-medium text-gray-700">💰 Amount: </span>${selected.agreed_amount.toLocaleString()}</p>
              )}
              {selected.notes && (
                <p className="italic text-gray-500">"{selected.notes}"</p>
              )}
              <p>
                <span className="font-medium text-gray-700">Status: </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selected.status] || 'bg-gray-100 text-gray-600'}`}>
                  {selected.status}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EditProfileTab({ profile, onUpdate }: { profile: VendorProfile; onUpdate: (p: Partial<VendorProfile>) => void }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [logoUrl, setLogoUrl] = useState(profile.profile_image_url || '')
  const [coverUrl, setCoverUrl] = useState(profile.cover_image_url || '')

  const [bio, setBio] = useState(profile.bio || '')
  const [address, setAddress] = useState(profile.address || '')
  const [city, setCity] = useState(profile.city || '')
  const [state, setState] = useState(profile.state || '')
  const [zipCode, setZipCode] = useState(profile.zip_code || '')
  const [hourlyRate, setHourlyRate] = useState(profile.hourly_rate?.toString() || '')
  const [flatRate, setFlatRate] = useState(profile.flat_rate?.toString() || '')
  const [rateDesc, setRateDesc] = useState(profile.rate_description || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [website, setWebsite] = useState(profile.website || '')
  const [instagram, setInstagram] = useState(profile.instagram || '')
  const [facebook, setFacebook] = useState(profile.facebook || '')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await api.put('/vendors/account/me', {
        bio, address, city, state, zipCode,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        flatRate: flatRate ? parseFloat(flatRate) : undefined,
        rateDescription: rateDesc,
        phone, website, instagram, facebook: facebook || undefined,
        profileImageUrl: logoUrl || undefined,
        coverImageUrl: coverUrl || undefined,
      })
      onUpdate(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Profile</h2>
      {error && <div className="bg-red-50 text-red-700 rounded p-3 text-sm mb-4">{error}</div>}
      {saved && <div className="bg-green-50 text-green-700 rounded p-3 text-sm mb-4">✓ Profile saved!</div>}
      <form onSubmit={handleSave} className="space-y-5">

        {/* Images */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Profile / Logo</label>
            <ImageUpload
              currentUrl={logoUrl}
              uploadType="vendor-logo"
              shape="square"
              onUpload={(url) => setLogoUrl(url)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cover Photo</label>
            <ImageUpload
              currentUrl={coverUrl}
              uploadType="vendor-logo"
              shape="landscape"
              onUpload={(url) => setCoverUrl(url)}
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">About Your Business</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder="Tell clients what makes your business special — experience, style, what to expect…"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
          <AddressAutocomplete
            value={address}
            onChange={setAddress}
            onSelect={({ address: a, city: c, state: s, zip: z }) => {
              setAddress(a)
              setCity(c)
              setState(s)
              setZipCode(z)
            }}
            placeholder="Start typing your street address…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p className="text-xs text-gray-400 mt-1">Selecting a suggestion auto-fills city, state &amp; zip. Only shown to booked clients.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Dallas"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input type="text" value={state} onChange={e => setState(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="TX" maxLength={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
            <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="75001"
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Pricing</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hourly Rate ($)</label>
              <input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} min="0" step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Flat Rate ($)</label>
              <input type="number" value={flatRate} onChange={e => setFlatRate(e.target.value)} min="0" step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="mt-2">
            <label className="block text-xs text-gray-500 mb-1">Rate Description</label>
            <input type="text" value={rateDesc} onChange={e => setRateDesc(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. 4-hour minimum, travel included within 50 miles"
            />
          </div>
        </div>

        {/* Contact */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Contact</label>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="(555) 000-0000"
            />
          </div>
        </div>

        {/* Online Presence */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Online Presence</label>
          <div className="space-y-2">
            <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="https://yourwebsite.com"
            />
            <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Instagram handle (@yourhandle)"
            />
            <input type="text" value={facebook} onChange={e => setFacebook(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Facebook page URL or @handle"
            />
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
