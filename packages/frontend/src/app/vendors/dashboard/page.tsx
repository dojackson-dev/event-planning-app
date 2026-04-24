'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import {
  Store,
  Calendar,
  FileText,
  Link2,
  Building2,
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
  const { roles, switchRole, loading: authLoading } = useAuth()
  const [isAlsoOwner, setIsAlsoOwner] = useState(false)
  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  // Update switcher whenever AuthContext finishes loading roles
  useEffect(() => {
    if (!authLoading) {
      const hasOwner = roles.includes(UserRole.OWNER)
      console.log('[VendorDashboard] roles from context:', roles, 'isAlsoOwner:', hasOwner)
      setIsAlsoOwner(hasOwner)
    }
  }, [roles, authLoading])

  // Read roles from localStorage as soon as component mounts (client-only)
  useEffect(() => {
    try {
      const storedRoles: string[] = JSON.parse(localStorage.getItem('user_roles') || '[]')
      console.log('[VendorDashboard] stored roles:', storedRoles)
      setIsAlsoOwner(storedRoles.includes(UserRole.OWNER))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.replace('/vendors/login'); return }

    const loadData = async () => {
      try {
        const [profileRes, bookingsRes] = await Promise.all([
          api.get('/vendors/account/me'),
          api.get('/vendors/bookings/mine'),
        ])
        setProfile(profileRes.data)
        setBookings(bookingsRes.data || [])
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

  const pendingCount = counts['pending'] || 0

  const stats = {
    pending:   pendingCount,
    confirmed: counts['confirmed'] || 0,
    completed: (counts['completed'] || 0) + (counts['paid'] || 0),
    revenue: bookings
      .filter(b => b.status === 'paid' || b.status === 'completed')
      .reduce((sum, b) => sum + (b.agreed_amount || 0), 0),
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
    { href: '/vendors/dashboard/bookings', label: `📋 Bookings${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
    { href: '/vendors/dashboard/calendar',  label: '📆 Calendar' },
    { href: '/vendors/dashboard/earnings',  label: '💰 Earnings' },
    { href: '/vendors/dashboard/invoices',  label: '🧾 Invoices' },
    { href: '/vendors/dashboard/reviews',   label: '⭐ Reviews' },
    { href: '/vendors/dashboard/profile',   label: '✏️ Profile' },
    { href: '/vendors/dashboard/payouts',   label: '🏦 Payouts' },
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
            {isAlsoOwner && (
              <button
                onClick={() => switchRole(UserRole.OWNER)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5" />
                Switch to Owner
              </button>
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

        {/* Suite title */}
        <div className="mb-6 bg-blue-600 rounded-xl px-6 py-4 text-center">
          <h1 className="text-2xl font-bold text-white">VendorSuite</h1>
          <p className="text-sm text-blue-100 mt-0.5">Welcome back, {profile?.business_name || 'Vendor'}</p>
        </div>

        {/* Quick Overview - only shown when there are pending bookings */}
        {pendingCount > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Overview</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 font-medium text-sm">
                ⏳ You have {pendingCount} pending booking request{pendingCount > 1 ? 's' : ''} awaiting your response.
              </p>
              <Link href="/vendors/dashboard/bookings" className="text-yellow-700 underline text-sm mt-1 inline-block">
                Review bookings →
              </Link>
            </div>
          </div>
        )}

        {/* Quick action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Link
            href="/vendors/dashboard/invoices"
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-primary-300 hover:shadow-md transition-all flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Invoices</p>
              <p className="text-xs text-gray-400">Create &amp; send invoices</p>
            </div>
          </Link>

          <Link
            href="/vendors/dashboard/bookings"
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-primary-300 hover:shadow-md transition-all flex items-center gap-3"
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

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Pending',   value: String(stats.pending),               color: 'text-yellow-600',  bg: 'bg-yellow-50',  border: 'border-yellow-200',  href: '/vendors/dashboard/bookings' },
            { label: 'Confirmed', value: String(stats.confirmed),              color: 'text-green-600',   bg: 'bg-green-50',   border: 'border-green-200',   href: '/vendors/dashboard/bookings' },
            { label: 'Completed', value: String(stats.completed),              color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',    href: '/vendors/dashboard/bookings' },
            { label: 'Revenue',   value: `$${stats.revenue.toLocaleString()}`, color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-200', href: '/vendors/dashboard/earnings' },
          ].map(s => (
            <Link
              key={s.label}
              href={s.href}
              className={`${s.bg} border ${s.border} rounded-xl p-4 text-left hover:opacity-80 transition-opacity`}
            >
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </Link>
          ))}
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
        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
          <div className="bg-blue-600 px-5 py-3">
            <h3 className="text-sm font-semibold text-white">Upcoming Confirmed Events</h3>
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
