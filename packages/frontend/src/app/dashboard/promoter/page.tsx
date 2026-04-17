'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import {
  Megaphone,
  Calendar,
  Ticket,
  DollarSign,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  User,
  ExternalLink,
  Plus,
} from 'lucide-react'

interface DashboardStats {
  totalEvents: number
  publishedEvents: number
  totalTicketsSold: number
  totalRevenue: number
}

interface PromoterProfile {
  id: string
  company_name: string | null
  contact_name: string
  email: string
  stripe_connect_status: string | null
  stripe_account_id: string | null
}

export default function PromoterDashboard() {
  const searchParams = useSearchParams()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [profile, setProfile] = useState<PromoterProfile | null>(null)
  const [connectStatus, setConnectStatus] = useState<string>('not_connected')
  const [loading, setLoading] = useState(true)
  const [connectLoading, setConnectLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connectSuccess = searchParams?.get('connect') === 'success'

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, dashRes, connectRes] = await Promise.all([
        api.get('/promoter/profile'),
        api.get('/promoter/dashboard'),
        api.get('/stripe/connect/promoter/status'),
      ])
      setProfile(profileRes.data)
      setStats(dashRes.data)
      setConnectStatus(connectRes.data.status)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load promoter data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleConnectStripe = async () => {
    if (!profile?.email) return
    setConnectLoading(true)
    try {
      const res = await api.post('/stripe/connect/promoter', { email: profile.email })
      window.location.href = res.data.url
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to start Stripe onboarding')
      setConnectLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Megaphone className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Promoter Dashboard</h1>
            <p className="text-sm text-gray-500">
              {profile?.company_name || profile?.contact_name || 'Your promoter hub'}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/promoter/profile"
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <User className="h-4 w-4" />
          Edit Profile
        </Link>
      </div>

      {/* Success banner */}
      {connectSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800 text-sm font-medium">
            Stripe Connect setup complete — payments are now enabled for your events!
          </p>
        </div>
      )}

      {/* Stripe Connect Banner */}
      {connectStatus !== 'active' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-800 font-medium text-sm">Connect your bank to accept ticket payments</p>
            <p className="text-amber-700 text-sm mt-0.5">
              Set up Stripe Connect to receive payouts from ticket sales. The platform takes a 3% fee.
            </p>
          </div>
          <button
            onClick={handleConnectStripe}
            disabled={connectLoading}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
          >
            <CreditCard className="h-4 w-4" />
            {connectLoading ? 'Loading...' : 'Connect Stripe'}
          </button>
        </div>
      )}

      {connectStatus === 'active' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-green-800 text-sm font-medium">Stripe Connect active — you can receive ticket payments</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-purple-500" />
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Events</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.totalEvents ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">{stats?.publishedEvents ?? 0} published</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Ticket className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Tickets Sold</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.totalTicketsSold ?? 0}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Revenue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">${(stats?.totalRevenue ?? 0).toFixed(2)}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Stripe</span>
          </div>
          <p className="text-sm font-semibold capitalize text-gray-900">
            {connectStatus === 'active' ? (
              <span className="text-green-600">Active</span>
            ) : connectStatus === 'pending' ? (
              <span className="text-amber-600">Pending</span>
            ) : (
              <span className="text-gray-500">Not connected</span>
            )}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/dashboard/promoter/profile"
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 group"
          >
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Edit Profile</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          </Link>

          <Link
            href="/dashboard/artists"
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 group"
          >
            <div className="flex items-center gap-3">
              <Megaphone className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Browse Artists</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          </Link>

          <Link
            href="/dashboard/promoter/invoices"
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 group"
          >
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-gray-700">Invoices</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          </Link>

          <Link
            href="/dashboard/promoter/bookings"
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 group"
          >
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Bookings</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          </Link>

          <Link
            href="/dashboard/promoter/events"
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 group"
          >
            <div className="flex items-center gap-3">
              <Ticket className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">My Events</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          </Link>

          <Link
            href="/dashboard/promoter/events/new"
            className="flex items-center justify-between p-3 border border-purple-200 bg-purple-50 rounded-lg hover:bg-purple-100 group"
          >
            <div className="flex items-center gap-3">
              <Plus className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium text-purple-700">Create Event</span>
            </div>
            <ArrowRight className="h-4 w-4 text-purple-400 group-hover:text-purple-600" />
          </Link>

          {connectStatus !== 'active' && (
            <button
              onClick={handleConnectStripe}
              disabled={connectLoading}
              className="flex items-center justify-between p-3 border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 group text-left disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-medium text-amber-700">Connect Stripe</span>
              </div>
              <ExternalLink className="h-4 w-4 text-amber-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
