'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import {
  Mic2,
  User,
  FileText,
  DollarSign,
  LogOut,
  ChevronRight,
  MapPin,
  Instagram,
  Globe,
  CheckCircle,
  AlertCircle,
  Calendar,
  Receipt,
} from 'lucide-react'
import ConnectBankButton from '@/components/ConnectBankButton'
import AddRoleCard from '@/components/AddRoleCard'
import RoleSwitcher from '@/components/RoleSwitcher'

interface ArtistProfile {
  id: string
  artist_name: string
  stage_name: string | null
  artist_type: string
  location: string | null
  profile_image_url: string | null
  available_for_booking: boolean
  performance_fee_min: number | null
  performance_fee_max: number | null
  instagram: string | null
  website: string | null
  description: string | null
  genres: string[]
}

interface PromoterBooking {
  id: string
  event_name: string
  event_date?: string
  event_start_time?: string
  venue_name?: string
  agreed_amount?: number
  status: string
  promoter_accounts?: {
    company_name?: string
    contact_name?: string
    email?: string
    phone?: string
  } | null
}

const ARTIST_TYPE_ICONS: Record<string, string> = {
  musician: '🎵', dj: '🎧', comedian: '🎤', dancer: '💃',
  magician: '🎩', spoken_word: '📖', mc_host: '🎙️', other: '⭐',
}

export default function ArtistDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const [profile, setProfile] = useState<ArtistProfile | null>(null)
  const [rider, setRider] = useState<any>(null)
  const [promoterBookings, setPromoterBookings] = useState<PromoterBooking[]>([])
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const email = user?.email || ''

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.replace('/artist/login'); return }

    const load = async () => {
      try {
        const [profileRes, riderRes, pbRes] = await Promise.allSettled([
          api.get('/artists/me/profile'),
          api.get('/artists/me/rider'),
          api.get('/promoter-bookings/for-artist'),
        ])
        if (profileRes.status === 'fulfilled') {
          setProfile(profileRes.value.data)
        } else if ((profileRes.reason as any)?.response?.status === 401) {
          router.push('/artist/login')
          return
        } else if ((profileRes.reason as any)?.response?.status === 404) {
          router.push('/artist/register')
          return
        }
        if (riderRes.status === 'fulfilled') setRider(riderRes.value.data)
        if (pbRes.status === 'fulfilled') setPromoterBookings(pbRes.value.data || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_role')
    router.push('/artist/login')
  }

  const respondToBooking = async (bookingId: string, action: 'accept' | 'decline') => {
    setActionLoading(prev => ({ ...prev, [bookingId]: true }))
    try {
      const res = await api.patch(`/promoter-bookings/${bookingId}/artist-respond`, { action })
      const updated = res.data
      setPromoterBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...updated } : b))

      if (action === 'accept') {
        // Immediately navigate to new invoice pre-filled with promoter info
        const pa = updated.promoter_accounts || {}
        const params = new URLSearchParams({
          client_name: pa.contact_name || pa.company_name || '',
          client_email: pa.email || '',
          client_phone: pa.phone || '',
          event_name: updated.event_name || '',
          event_date: updated.event_date || '',
          amount: String(updated.agreed_amount ?? ''),
        })
        router.push(`/artist/dashboard/invoices/new?${params.toString()}`)
      }
    } catch (e: any) {
      console.error('Failed to respond to booking', e)
      setActionLoading(prev => ({ ...prev, [bookingId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
      </div>
    )
  }

  const navLinks = [
    { href: '/artist/dashboard/profile', label: '✏️ Edit Profile' },
    { href: '/artist/dashboard/rider', label: '📋 My Rider' },
  ]

  const feeRange = (() => {
    if (!profile) return null
    const { performance_fee_min: min, performance_fee_max: max } = profile
    if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()}`
    if (min) return `From $${min.toLocaleString()}`
    if (max) return `Up to $${max.toLocaleString()}`
    return null
  })()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mic2 className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-semibold text-gray-900 leading-none">
                {profile?.stage_name || profile?.artist_name || 'Artist Dashboard'}
              </p>
              <p className="text-xs text-gray-400">
                {ARTIST_TYPE_ICONS[profile?.artist_type ?? ''] ?? '⭐'} {profile?.artist_type?.replace('_', ' ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RoleSwitcher variant="banner" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome heading */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back, {profile?.stage_name || profile?.artist_name || 'Artist'}!
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {ARTIST_TYPE_ICONS[profile?.artist_type ?? ''] ?? '⭐'} {profile?.artist_type?.replace('_', ' ')} · {profile?.location || 'Artist Dashboard'}
            </p>
          </div>
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            {profile?.profile_image_url ? (
              <img src={profile.profile_image_url} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl flex-shrink-0">
                {ARTIST_TYPE_ICONS[profile?.artist_type ?? ''] ?? '⭐'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">
                {profile?.stage_name || profile?.artist_name}
              </h1>
              {profile?.stage_name && (
                <p className="text-sm text-gray-500">{profile.artist_name}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-2">
                {profile?.location && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="h-3.5 w-3.5" /> {profile.location}
                  </span>
                )}
                {feeRange && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <DollarSign className="h-3.5 w-3.5" /> {feeRange}
                  </span>
                )}
              </div>
            </div>
            <div>
              {profile?.available_for_booking ? (
                <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                  <CheckCircle className="h-3.5 w-3.5" /> Available
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  <AlertCircle className="h-3.5 w-3.5" /> Not available
                </span>
              )}
            </div>
          </div>
          {profile?.description && (
            <p className="text-sm text-gray-600 mt-4 line-clamp-3">{profile.description}</p>
          )}
          {profile?.genres && profile.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.genres.map(g => (
                <span key={g} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">{g}</span>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/artist/dashboard/profile"
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-blue-200 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Edit Profile</p>
                <p className="text-xs text-gray-500">Update your artist info</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Link>

          <Link href="/artist/dashboard/rider"
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-purple-200 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">My Rider</p>
                <p className="text-xs text-gray-500">
                  {rider ? 'Rider on file — click to edit' : 'Set up your technical rider'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Link>
        </div>

        {/* Profile completeness nudge */}
        {(!profile?.description || !rider) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-2">Complete your profile to get discovered</p>
            <ul className="space-y-1">
              {!profile?.description && (
                <li className="text-sm text-amber-700 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <Link href="/artist/dashboard/profile" className="underline">Add a bio</Link>
                </li>
              )}
              {!rider && (
                <li className="text-sm text-amber-700 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <Link href="/artist/dashboard/rider" className="underline">Set up your rider</Link>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Invoices & Bookings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/artist/dashboard/invoices"
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-green-200 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg"><Receipt className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="font-semibold text-gray-900">Invoices</p>
                <p className="text-xs text-gray-500">Create &amp; send invoices</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Link>
          <Link href="/artist/dashboard/bookings"
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-orange-200 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg"><Calendar className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="font-semibold text-gray-900">Bookings</p>
                <p className="text-xs text-gray-500">Track your events</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Link>
          <Link href="/artist/dashboard/calendar"
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-sky-200 transition-all flex items-center justify-between sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-50 rounded-lg"><Calendar className="h-5 w-5 text-sky-600" /></div>
              <div>
                <p className="font-semibold text-gray-900">Calendar</p>
                <p className="text-xs text-gray-500">View bookings by month</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Link>
        </div>

        {/* Pending promoter booking requests */}
        {promoterBookings.filter(b => b.status === 'inquiry').length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-purple-900 mb-2">
              🎤 {promoterBookings.filter(b => b.status === 'inquiry').length} Promoter Booking Request{promoterBookings.filter(b => b.status === 'inquiry').length > 1 ? 's' : ''} Pending
            </p>
            <div className="space-y-2">
              {promoterBookings.filter(b => b.status === 'inquiry').map(b => {
                const promoterName = b.promoter_accounts?.company_name || b.promoter_accounts?.contact_name || 'Promoter'
                return (
                  <div key={b.id} className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{b.event_name}</p>
                      <p className="text-xs text-gray-500">by {promoterName}{b.agreed_amount ? ` · $${Number(b.agreed_amount).toLocaleString()}` : ''}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => respondToBooking(b.id, 'accept')}
                        disabled={!!actionLoading[b.id]}
                        className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading[b.id] ? '...' : '✓ Accept'}
                      </button>
                      <button
                        onClick={() => respondToBooking(b.id, 'decline')}
                        disabled={!!actionLoading[b.id]}
                        className="px-3 py-1 bg-white border border-red-300 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-50"
                      >
                        {actionLoading[b.id] ? '...' : '✕'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Payouts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-semibold text-gray-900 mb-1">Payouts</p>
          <p className="text-xs text-gray-500 mb-4">Connect your bank account to accept payments via Stripe.</p>
          <ConnectBankButton role="artist" email={email} />
        </div>

        {/* Add Vendor Role */}
        <AddRoleCard targetRole="vendor" />

        {/* Social links */}
        {(profile?.instagram || profile?.website) && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4">
            {profile.instagram && (
              <a href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-pink-600 hover:text-pink-700">
                <Instagram className="h-4 w-4" /> {profile.instagram}
              </a>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700">
                <Globe className="h-4 w-4" /> Website
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
