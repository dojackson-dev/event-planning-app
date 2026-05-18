'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import RoleSwitcher from '@/components/RoleSwitcher'
import {
  Store,
  Calendar,
  FileText,
  Link2,
  LogOut,
  ChevronRight,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'

interface VendorProfile {
  id: string
  business_name: string
  category: string
  email: string
  profile_image_url?: string
}

interface Booking {
  id: string
  event_name: string
  event_date: string
  venue_name?: string
  status: string
  agreed_amount: number
}

export default function VendorDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [vendorInvoices, setVendorInvoices] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.replace('/vendors/login'); return }

    const loadData = async () => {
      try {
        const [profileRes, bookingsRes, requestsRes, invoicesRes] = await Promise.all([
          api.get('/vendors/account/me'),
          api.get('/vendors/bookings/mine'),
          api.get('/vendors/booking-requests/mine').catch(() => ({ data: [] })),
          api.get('/vendor-invoices/mine').catch(() => ({ data: [] })),
        ])
        setProfile(profileRes.data)
        setBookings(bookingsRes.data || [])
        setVendorInvoices(invoicesRes.data || [])
        setPendingRequests((requestsRes.data || []).filter((r: any) => r.status === 'pending').length)
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

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_role')
    router.push('/vendors/login')
  }

  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const pendingCount = (counts['pending'] || 0) + pendingRequests

  const stats = {
    pending:   pendingCount,
    confirmed: counts['confirmed'] || 0,
    completed: (counts['completed'] || 0) + (counts['paid'] || 0),
    revenue: bookings
      .filter(b => b.status === 'paid' || b.status === 'completed')
      .reduce((sum, b) => sum + (b.agreed_amount || 0), 0)
      + vendorInvoices
      .filter((inv: any) => inv.status === 'paid')
      .reduce((sum: number, inv: any) => sum + Number(inv.amount_paid || inv.total_amount || 0), 0),
  }

  const upcomingConfirmed = bookings
    .filter(b => b.status === 'confirmed' && new Date(b.event_date + 'T12:00:00') >= new Date())
    .sort((a, b) => new Date(a.event_date + 'T12:00:00').getTime() - new Date(b.event_date + 'T12:00:00').getTime())
    .slice(0, 5)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600" />
      </div>
    )
  }

  const navLinks = [
    { href: '/vendors/dashboard/bookings',  label: `📋 Bookings${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
    { href: '/vendor-portal/booking-requests', label: `📩 Requests${pendingRequests > 0 ? ` (${pendingRequests})` : ''}` },
    { href: '/vendors/dashboard/calendar',  label: '📆 Calendar' },
    { href: '/vendors/dashboard/earnings',  label: '💰 Earnings' },
    { href: '/vendors/dashboard/invoices',  label: '🧾 Invoices' },
    { href: '/vendors/dashboard/contracts', label: '📄 Contracts' },
    { href: '/vendors/dashboard/reviews',   label: '⭐ Reviews' },
    { href: '/vendors/dashboard/profile',   label: '✏️ Profile' },
    { href: '/vendors/dashboard/payouts',   label: '🏦 Payouts' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b sticky top-0 z-10">
        {/* Row 1: brand */}
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
          <div className="flex items-center gap-3">
            <Store className="w-5 h-5 text-primary-600" />
            <div>
              <p className="font-semibold text-gray-900 leading-none">
                {profile?.business_name || 'Vendor Dashboard'}
              </p>
              <p className="text-xs text-gray-400">{profile?.email}</p>
            </div>
          </div>
        </div>
        {/* Row 2: actions */}
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 h-11 flex items-center gap-2">
            <RoleSwitcher variant="banner" />
            <div className="flex-1" />
            <Link
              href="/vendors/settings"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Welcome heading */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back, {profile?.business_name || 'Vendor'}!
            </h1>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5" />
              {profile?.category || 'Vendor'} · {profile?.email}
            </p>
          </div>
        </div>

        {/* Quick Overview - only shown when there are pending bookings */}
        {pendingRequests > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Overview</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 font-medium text-sm">
                ⏳ You have {pendingRequests} pending booking request{pendingRequests > 1 ? 's' : ''} awaiting your response.
              </p>
              <Link href="/vendor-portal/booking-requests" className="text-yellow-700 underline text-sm mt-1 inline-block">
                Review requests →
              </Link>
            </div>
          </div>
        )}

        {/* Quick action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Link href="/vendors/dashboard/invoices"
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-primary-200 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-50 rounded-lg"><FileText className="h-5 w-5 text-primary-600" /></div>
              <div>
                <p className="font-semibold text-gray-900">Invoices</p>
                <p className="text-xs text-gray-500">Create &amp; send invoices</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Link>

          <Link href="/vendor-portal/booking-requests"
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-yellow-200 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg"><Calendar className="h-5 w-5 text-yellow-600" /></div>
              <div>
                <p className="font-semibold text-gray-900">Booking Requests</p>
                <p className="text-xs text-gray-500">
                  {pendingRequests > 0 ? `${pendingRequests} new request${pendingRequests > 1 ? 's' : ''}` : 'Manage requests'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Link>

          <Link href="/vendor-portal/booking-link"
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-green-200 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg"><Link2 className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="font-semibold text-gray-900">Booking Link</p>
                <p className="text-xs text-gray-500">Share your booking page</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Link>

          <Link href="/vendors/dashboard/contracts"
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-purple-200 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg"><FileText className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="font-semibold text-gray-900">Contracts</p>
                <p className="text-xs text-gray-500">View &amp; sign contracts</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
          <Link href="/vendors/dashboard/bookings"
            className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100 hover:shadow-md hover:border-yellow-200 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Pending</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting response</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-500" />
              </div>
            </div>
          </Link>

          <Link href="/vendors/dashboard/bookings"
            className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100 hover:shadow-md hover:border-green-200 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Confirmed</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.confirmed}</p>
                <p className="text-xs text-gray-500 mt-1">Active bookings</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
              </div>
            </div>
          </Link>

          <Link href="/vendors/dashboard/bookings"
            className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Completed</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.completed}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
              </div>
            </div>
          </Link>

          <Link href="/vendors/dashboard/earnings"
            className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Revenue</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">${stats.revenue.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Collected</p>
              </div>
              <div className="bg-primary-50 p-3 rounded-lg">
                <DollarSign className="h-8 w-8 sm:h-10 sm:w-10 text-primary-600" />
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation links grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {navLinks.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white text-gray-600 border border-gray-200 px-3 py-2.5 text-sm font-medium rounded-xl text-center hover:bg-gray-50 hover:border-primary-300 transition-colors whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Upcoming Confirmed Events */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-primary-600 mr-2" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Upcoming Confirmed Events</h2>
            </div>
            <Link href="/vendors/dashboard/bookings"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center">
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          {upcomingConfirmed.length === 0 ? (
            <p className="text-sm text-gray-500 px-5 py-4">No upcoming confirmed events.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {upcomingConfirmed.map(b => (
                <Link
                  key={b.id}
                  href="/vendors/dashboard/bookings"
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{b.event_name}</p>
                    {b.venue_name && <p className="text-xs text-gray-500 mt-0.5">📍 {b.venue_name}</p>}
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm text-gray-700 font-medium">
                      {new Date(b.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {b.agreed_amount > 0 && <p className="text-xs text-gray-500">${b.agreed_amount.toLocaleString()}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
