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
  FileText,
  Link2,
  Plus,
  Send,
  Eye,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
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
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed' | 'paid'
  agreed_amount: number
  deposit_amount: number
  notes: string
  created_at: string
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

const INVOICE_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     color: 'bg-gray-100 text-gray-600 border-gray-200',       icon: <Clock className="w-3 h-3" /> },
  sent:      { label: 'Sent',      color: 'bg-blue-100 text-blue-700 border-blue-200',        icon: <Send className="w-3 h-3" /> },
  viewed:    { label: 'Viewed',    color: 'bg-purple-100 text-purple-700 border-purple-200',  icon: <Eye className="w-3 h-3" /> },
  paid:      { label: 'Paid',      color: 'bg-green-100 text-green-700 border-green-200',     icon: <CheckCircle2 className="w-3 h-3" /> },
  overdue:   { label: 'Overdue',   color: 'bg-red-100 text-red-700 border-red-200',           icon: <AlertCircle className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 border-gray-200',        icon: <XCircle className="w-3 h-3" /> },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <AlertCircle className="w-4 h-4" /> },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700 border-green-200',    icon: <CheckCircle2 className="w-4 h-4" /> },
  paid:      { label: 'Paid',      color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <DollarSign className="w-4 h-4" /> },
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
  const [invoices, setInvoices] = useState<VendorInvoice[]>([])
  const [loadingAccount, setLoadingAccount] = useState(true)
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [loadingInvoices, setLoadingInvoices] = useState(true)
  const [bookingsError, setBookingsError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'invoices'>('overview')
  const [statusFilter, setStatusFilter] = useState('')
  const [respondingId, setRespondingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAccount()
    fetchBookings()
    fetchInvoices()
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
      setBookingsError('')
    } catch (e: any) {
      setBookingsError(e.response?.data?.message || 'Failed to load bookings')
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

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/vendor-invoices/mine')
      setInvoices(res.data || [])
    } catch {
      // silently fail
    } finally {
      setLoadingInvoices(false)
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
        {/* Quick action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Link
            href="/vendor-portal/invoices"
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-primary-300 hover:shadow-md transition-all flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Invoices</p>
              <p className="text-xs text-gray-400">Create & send invoices</p>
            </div>
          </Link>
          <Link
            href="/vendor-portal/booking-requests"
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-primary-300 hover:shadow-md transition-all flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Booking Requests</p>
              <p className="text-xs text-gray-400">{pendingCount > 0 ? `${pendingCount} new request${pendingCount > 1 ? 's' : ''}` : 'Manage requests'}</p>
            </div>
          </Link>
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
        <Link
          href="/vendor-portal/invoices"
          className="flex items-center gap-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl p-4 mb-6 shadow-md hover:from-primary-700 hover:to-primary-800 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-bold text-sm">✨ New Feature: External Invoicing</p>
              <span className="bg-white/25 text-white text-xs font-semibold px-2 py-0.5 rounded-full">New</span>
            </div>
            <p className="text-primary-100 text-xs leading-snug">
              Send invoices to clients outside DoVenue Suite. They pay via a secure link — no account needed. You get paid directly.
            </p>
          </div>
          <span className="text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all text-lg flex-shrink-0">→</span>
        </Link>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl w-fit mb-6 shadow-sm">
          {[
            { id: 'overview', label: 'My Profile' },
            { id: 'bookings', label: `Bookings${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
            { id: 'invoices', label: `Invoices${invoices.length > 0 ? ` (${invoices.length})` : ''}` },
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

        {/* ── INVOICES TAB ───────────────────────────── */}
        {activeTab === 'invoices' && (
          <>
            {/* Summary stats */}
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
                    { label: 'Total Invoiced', value: `$${totals.total.toFixed(2)}`, color: 'text-gray-900' },
                    { label: 'Collected',      value: `$${totals.paid.toFixed(2)}`,  color: 'text-green-600' },
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

            {/* Header / New Invoice btn */}
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
                <Link
                  href="/vendor-portal/invoices/new"
                  className="mt-4 inline-flex items-center gap-2 text-primary-600 text-sm hover:underline"
                >
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

        {/* ── BOOKINGS TAB ───────────────────────────── */}
        {activeTab === 'bookings' && (
          <>
            {/* Stats row */}
            {(() => {
              const revenue = bookings
                .filter(b => b.status === 'paid' || b.status === 'completed')
                .reduce((sum, b) => sum + (Number(b.agreed_amount) || 0), 0)
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Pending',   value: String(counts['pending']   || 0),                                    color: 'text-yellow-600' },
                    { label: 'Confirmed', value: String(counts['confirmed'] || 0),                                   color: 'text-green-600'  },
                    { label: 'Completed', value: String((counts['completed'] || 0) + (counts['paid'] || 0)),         color: 'text-blue-600'   },
                    { label: 'Revenue',   value: `$${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-emerald-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Filter pills */}
            <div className="flex gap-2 flex-wrap mb-4">
              {[
                { value: '', label: `All (${bookings.length})` },
                { value: 'pending',   label: `Pending (${counts['pending']   || 0})` },
                { value: 'confirmed', label: `Confirmed (${counts['confirmed'] || 0})` },
                { value: 'paid',      label: `Paid (${counts['paid']      || 0})` },
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
            ) : bookingsError ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600 text-sm">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-60" />
                {bookingsError}
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
