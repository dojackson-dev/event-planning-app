'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
  completed: 'bg-blue-100 text-blue-700',
}

interface VendorProfile {
  id: string
  business_name: string
  category: string
  bio: string
  city: string
  state: string
  zip_code: string
  profile_image_url: string
  is_verified: boolean
  hourly_rate: number
  flat_rate: number
  phone: string
  email: string
  website: string
  instagram: string
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

export default function VendorDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'profile'>('overview')
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
      } catch (err: any) {
        if (err.response?.status === 401) {
          router.push('/vendors/login')
        } else if (err.response?.status === 404) {
          // No vendor profile yet — redirect to complete registration
          router.push('/vendors/register')
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [router])

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

  const stats = {
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    revenue: bookings
      .filter(b => b.payment_status === 'paid' || b.status === 'completed')
      .reduce((sum, b) => sum + (b.agreed_amount || 0), 0),
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-primary-600 font-bold text-lg">DoVenueSuite</Link>
            <span className="text-gray-300">|</span>
            <span className="text-gray-700 font-medium">Vendor Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/vendors" className="text-sm text-gray-500 hover:text-gray-700">View Directory</Link>
            {profile && (
              <Link href={`/vendors/${profile.id}`} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                My Public Profile →
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile header */}
        {profile && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex items-start gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-3xl flex-shrink-0">
              {profile.profile_image_url ? (
                <img src={profile.profile_image_url} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : '🎪'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{profile.business_name}</h1>
                {profile.is_verified && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">✓ Verified</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {[profile.city, profile.state].filter(Boolean).join(', ')}
                {profile.avgRating && ` · ⭐ ${profile.avgRating} (${profile.reviewCount} reviews)`}
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pending', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Confirmed', value: stats.confirmed, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Completed', value: stats.completed, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Revenue', value: `$${stats.revenue.toLocaleString()}`, color: 'text-primary-600', bg: 'bg-primary-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-6 gap-1 bg-white rounded-t-xl px-4 pt-4">
          {(['overview', 'bookings', 'profile'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 text-sm font-medium rounded-t-lg transition-colors capitalize ${
                activeTab === tab
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'overview' ? '📊 Overview' : tab === 'bookings' ? '📅 Bookings' : '✏️ Profile'}
            </button>
          ))}
        </div>

        {/* BOOKINGS TAB */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
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
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-3">📭</div>
                <p>No bookings yet.</p>
                <p className="text-sm mt-1">Once owners book you, they'll appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map(booking => (
                  <div key={booking.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{booking.event_name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-600'}`}>
                            {booking.status}
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
                        {booking.agreed_amount && (
                          <p className="text-sm font-medium text-gray-700 mt-1">
                            💰 ${booking.agreed_amount.toLocaleString()}
                            {booking.payment_status && ` · ${booking.payment_status.replace('_', ' ')}`}
                          </p>
                        )}
                        {booking.notes && (
                          <p className="text-sm text-gray-500 italic mt-1">"{booking.notes}"</p>
                        )}
                      </div>
                      {/* Action buttons for pending bookings */}
                      {booking.status === 'pending' && (
                        <div className="flex flex-col gap-2">
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
                        </div>
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
                ))}
              </div>
            )}
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Overview</h2>
            {bookings.filter(b => b.status === 'pending').length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 font-medium text-sm">
                  ⏳ You have {bookings.filter(b => b.status === 'pending').length} pending booking request{bookings.filter(b => b.status === 'pending').length > 1 ? 's' : ''} awaiting your response.
                </p>
                <button onClick={() => setActiveTab('bookings')} className="text-yellow-700 underline text-sm mt-1">
                  Review bookings →
                </button>
              </div>
            )}

            <div className="mt-4">
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

        {/* PROFILE TAB */}
        {activeTab === 'profile' && profile && (
          <EditProfileTab profile={profile} onUpdate={(updated) => setProfile(prev => prev ? { ...prev, ...updated } : prev)} />
        )}
      </div>
    </div>
  )
}

function EditProfileTab({ profile, onUpdate }: { profile: VendorProfile; onUpdate: (p: Partial<VendorProfile>) => void }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [bio, setBio] = useState(profile.bio || '')
  const [city, setCity] = useState(profile.city || '')
  const [state, setState] = useState(profile.state || '')
  const [zipCode, setZipCode] = useState(profile.zip_code || '')
  const [hourlyRate, setHourlyRate] = useState(profile.hourly_rate?.toString() || '')
  const [flatRate, setFlatRate] = useState(profile.flat_rate?.toString() || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [website, setWebsite] = useState(profile.website || '')
  const [instagram, setInstagram] = useState(profile.instagram || '')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await api.put('/vendors/account/me', {
        bio, city, state, zipCode,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        flatRate: flatRate ? parseFloat(flatRate) : undefined,
        phone, website, instagram,
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
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">About Your Business</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input type="text" value={state} onChange={e => setState(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
            <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
            <input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Flat Rate ($)</label>
            <input type="number" value={flatRate} onChange={e => setFlatRate(e.target.value)} min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
          <input type="url" value={website} onChange={e => setWebsite(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="https://..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
          <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="@handle" />
        </div>
        <button type="submit" disabled={saving} className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
