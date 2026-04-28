'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import {
  Calendar,
  Ticket,
  DollarSign,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Plus,
  TrendingUp,
  Eye,
  Zap,
  BookOpen,
  FileText,
  HelpCircle,
  ChevronRight,
  Mic2,
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
  phone: string | null
  stripe_connect_status: string | null
  stripe_account_id: string | null
  is_active: boolean
}

function PromoterDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [profile, setProfile] = useState<PromoterProfile | null>(null)
  const [connectStatus, setConnectStatus] = useState<string>('not_connected')
  const [loading, setLoading] = useState(true)
  const [connectLoading, setConnectLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTour, setShowTour] = useState(false)
  const [tourStep, setTourStep] = useState(0)

  const connectSuccess = searchParams?.get('connect') === 'success'
  const firstVisit = searchParams?.get('new') === 'true'

  useEffect(() => {
    if (firstVisit && !localStorage.getItem('promoter_tour_completed')) {
      setShowTour(true)
    }
  }, [firstVisit])

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

  const completeTour = () => {
    localStorage.setItem('promoter_tour_completed', 'true')
    setShowTour(false)
  }

  const tourSteps = [
    {
      title: 'Welcome to Your Promoter Hub!',
      description: 'Let\'s walk you through the key features. You can skip this anytime.',
      element: null,
    },
    {
      title: 'Dashboard Overview',
      description: 'Track your events, ticket sales, and revenue in real-time.',
      element: '.stats-grid',
    },
    {
      title: 'Create New Events',
      description: 'Use the quick actions below to create new events and start selling tickets.',
      element: '.quick-actions',
    },
    {
      title: 'Manage Everything',
      description: 'From invoices to bookings, everything is organized in the sidebar navigation.',
      element: null,
    },
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Promoter Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {profile?.company_name || profile?.contact_name || 'Promoter'}
          </p>
        </div>
        <Link
          href="/dashboard/promoter/profile"
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm transition-colors"
        >
          Edit Profile
        </Link>
      </div>

      {/* Success Banner */}
      {connectSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800 font-medium">
            Stripe Connect setup complete — you can now accept ticket payments!
          </p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Stripe Connect Banner */}
      {connectStatus !== 'active' && !connectSuccess && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-amber-900">Connect Your Stripe Account</h3>
            </div>
            <p className="text-amber-800 text-sm mb-3">
              Set up Stripe Connect to start accepting payments for ticket sales. The platform takes a 3% fee on all transactions.
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-100/50 px-3 py-2 rounded-lg w-fit">
              <Zap className="h-4 w-4" />
              You'll earn more when your Stripe account is active
            </div>
          </div>
          <button
            onClick={handleConnectStripe}
            disabled={connectLoading}
            className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap ml-6 transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            {connectLoading ? 'Loading...' : 'Connect Now'}
          </button>
        </div>
      )}

      {connectStatus === 'active' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-green-800 font-medium text-sm">✓ Stripe Connect is active and ready to receive payments</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-purple-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            {(stats?.totalEvents || 0) > 0 && (
              <TrendingUp className="h-4 w-4 text-green-500" />
            )}
          </div>
          <p className="text-gray-600 text-sm font-medium">Total Events</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalEvents ?? 0}</p>
          <p className="text-xs text-gray-500 mt-2">{stats?.publishedEvents ?? 0} published</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Ticket className="h-5 w-5 text-blue-600" />
            </div>
            {(stats?.totalTicketsSold || 0) > 0 && (
              <TrendingUp className="h-4 w-4 text-green-500" />
            )}
          </div>
          <p className="text-gray-600 text-sm font-medium">Tickets Sold</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalTicketsSold ?? 0}</p>
          <p className="text-xs text-gray-500 mt-2">All-time total</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-green-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            {(stats?.totalRevenue || 0) > 0 && (
              <TrendingUp className="h-4 w-4 text-green-500" />
            )}
          </div>
          <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">${(stats?.totalRevenue ?? 0).toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-2">After platform fees</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-orange-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CreditCard className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm font-medium">Stripe Status</p>
          <p className="text-sm font-bold mt-2">
            {connectStatus === 'active' ? (
              <span className="text-green-600">✓ Active</span>
            ) : connectStatus === 'pending' ? (
              <span className="text-amber-600">⏳ Pending</span>
            ) : (
              <span className="text-gray-500">Not Connected</span>
            )}
          </p>
          <p className="text-xs text-gray-500 mt-2">Payment processing</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <p className="text-gray-600 text-sm">Get started with your next event or manage existing ones</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/promoter/events/new"
            className="group bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6 hover:shadow-lg hover:border-purple-400 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <Plus className="h-5 w-5 text-purple-600" />
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-purple-600 transition-colors" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Create New Event</h3>
            <p className="text-sm text-gray-600">Launch a new event and start selling tickets</p>
          </Link>

          <Link
            href="/dashboard/promoter/events"
            className="group bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-400 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">My Events</h3>
            <p className="text-sm text-gray-600">View and manage all your events</p>
          </Link>

          <Link
            href="/dashboard/promoter/invoices"
            className="group bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 hover:shadow-lg hover:border-green-400 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-green-600 transition-colors" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Invoices</h3>
            <p className="text-sm text-gray-600">Create and send invoices to clients</p>
          </Link>
        </div>
      </div>

      {/* Additional Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/dashboard/promoter/bookings"
          className="group bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-purple-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Manage Bookings</h3>
              <p className="text-sm text-gray-600">Track bookings and manage client requests</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <BookOpen className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/promoter/artists"
          className="group bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-purple-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Book an Artist</h3>
              <p className="text-sm text-gray-600">Browse the artist directory and book talent for your events</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <Mic2 className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/promoter/profile"
          className="group bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-purple-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Profile Settings</h3>
              <p className="text-sm text-gray-600">Update your promoter profile and preferences</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <HelpCircle className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </Link>
      </div>

      {/* Getting Started Tips */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Getting Started Tips
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-3">
            <span className="text-purple-600 font-bold">1.</span>
            <span>Complete your profile with your company details and social media links</span>
          </li>
          <li className="flex gap-3">
            <span className="text-purple-600 font-bold">2.</span>
            <span>Connect your Stripe account to start receiving payments</span>
          </li>
          <li className="flex gap-3">
            <span className="text-purple-600 font-bold">3.</span>
            <span>Create your first event and set up ticket tiers</span>
          </li>
          <li className="flex gap-3">
            <span className="text-purple-600 font-bold">4.</span>
            <span>Share your event links with your audience and watch the sales roll in</span>
          </li>
        </ul>
      </div>

      {/* Tour Modal */}
      {showTour && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md shadow-2xl">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {tourSteps[tourStep].title}
              </h2>
              <p className="text-gray-600 mb-6">
                {tourSteps[tourStep].description}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={completeTour}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
                >
                  Skip Tour
                </button>
                <button
                  onClick={() => {
                    if (tourStep < tourSteps.length - 1) {
                      setTourStep(tourStep + 1)
                    } else {
                      completeTour()
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm transition-colors"
                >
                  {tourStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PromoterDashboard() {
  return (
    <Suspense fallback={<div className="p-8"><div className="animate-pulse h-8 bg-gray-200 rounded w-1/3"></div></div>}>
      <PromoterDashboardContent />
    </Suspense>
  )
}
