'use client'

import { useState, useEffect, Suspense } from 'react'
import clientApi from '@/lib/clientApi'
import { useClientAuth } from '@/contexts/ClientAuthContext'
import {
  Store,
  Phone,
  Mail,
  Globe,
  Instagram,
  CheckCircle2,
  AlertCircle,
  MapPin,
  DollarSign,
  Search,
  Calendar,
  X,
  Loader2,
} from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  dj:                   '🎧 DJ',
  decorator:            '🎨 Decorator',
  planner_coordinator:  '📋 Planner / Coordinator',
  furniture:            '🪑 Furniture',
  photographer:         '📷 Photographer',
  musicians:            '🎵 Musicians',
  mc_host:              '🎤 MC / Host',
  other:                '⭐ Other',
}

const bookingStatusColor: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  pending:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  declined:  'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
}

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'dj', label: '🎧 DJ' },
  { value: 'decorator', label: '🎨 Decorator' },
  { value: 'planner_coordinator', label: '📋 Planner / Coordinator' },
  { value: 'furniture', label: '🪑 Furniture' },
  { value: 'photographer', label: '📷 Photographer' },
  { value: 'musicians', label: '🎵 Musicians' },
  { value: 'mc_host', label: '🎤 MC / Host' },
  { value: 'other', label: '⭐ Other' },
]

interface VendorBrowse {
  id: string
  business_name: string
  category: string
  city: string
  state: string
  bio: string
  profile_image_url: string
  hourly_rate: number | null
  flat_rate: number | null
  is_verified: boolean
  phone: string | null
  email: string | null
  website: string | null
  instagram: string | null
}

interface BookForm {
  eventName: string
  eventDate: string
  startTime: string
  endTime: string
  venueName: string
  notes: string
}

function ClientVendorsPageContent() {
  const { client } = useClientAuth()
  const [tab, setTab] = useState<'booked' | 'browse'>('booked')

  // Booked vendors tab
  const [vendorBookings, setVendorBookings] = useState<any[]>([])
  const [loadingBooked, setLoadingBooked] = useState(true)

  // Browse tab
  const [browseVendors, setBrowseVendors] = useState<VendorBrowse[]>([])
  const [loadingBrowse, setLoadingBrowse] = useState(false)
  const [browseCategory, setBrowseCategory] = useState('')
  const [browseSearch, setBrowseSearch] = useState('')

  // Booking modal
  const [bookingVendor, setBookingVendor] = useState<VendorBrowse | null>(null)
  const [bookForm, setBookForm] = useState<BookForm>({
    eventName: '', eventDate: '', startTime: '', endTime: '', venueName: '', notes: '',
  })
  const [bookSubmitting, setBookSubmitting] = useState(false)
  const [bookError, setBookError] = useState('')
  const [bookSuccess, setBookSuccess] = useState<string | null>(null)

  useEffect(() => {
    clientApi.get('/vendors')
      .then((res) => setVendorBookings(res.data))
      .catch(console.error)
      .finally(() => setLoadingBooked(false))
  }, [])

  const loadBrowse = async (category: string) => {
    setLoadingBrowse(true)
    try {
      const res = await clientApi.get('/vendors/browse', { params: category ? { category } : {} })
      setBrowseVendors(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingBrowse(false)
    }
  }

  const handleTabChange = (t: 'booked' | 'browse') => {
    setTab(t)
    if (t === 'browse' && browseVendors.length === 0) {
      loadBrowse('')
    }
  }

  const handleCategoryChange = (cat: string) => {
    setBrowseCategory(cat)
    loadBrowse(cat)
  }

  const openBookModal = (vendor: VendorBrowse) => {
    setBookingVendor(vendor)
    setBookForm({ eventName: '', eventDate: '', startTime: '', endTime: '', venueName: '', notes: '' })
    setBookError('')
    setBookSuccess(null)
  }

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookingVendor) return
    setBookSubmitting(true)
    setBookError('')
    try {
      await clientApi.post('/vendors/book', {
        vendorAccountId: bookingVendor.id,
        eventName: bookForm.eventName,
        eventDate: bookForm.eventDate,
        startTime: bookForm.startTime || undefined,
        endTime: bookForm.endTime || undefined,
        venueName: bookForm.venueName || undefined,
        notes: bookForm.notes || undefined,
      })
      setBookSuccess(bookingVendor.business_name)
      setBookingVendor(null)
      // Refresh booked vendors list
      const res = await clientApi.get('/vendors')
      setVendorBookings(res.data)
    } catch (err: any) {
      setBookError(err.response?.data?.message || 'Failed to send booking request')
    } finally {
      setBookSubmitting(false)
    }
  }

  const filteredBrowse = browseVendors.filter(v =>
    !browseSearch ||
    v.business_name.toLowerCase().includes(browseSearch.toLowerCase()) ||
    (v.city || '').toLowerCase().includes(browseSearch.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Store className="h-6 w-6 text-primary-600" />
          Vendors
        </h1>
      </div>

      {/* Success banner */}
      {bookSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-green-700 text-sm font-medium">
            ✅ Booking request sent to {bookSuccess}! They'll confirm shortly.
          </p>
          <button onClick={() => setBookSuccess(null)} className="text-green-500 hover:text-green-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => handleTabChange('booked')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'booked' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Your Booked Vendors
          {vendorBookings.length > 0 && (
            <span className="ml-2 bg-primary-100 text-primary-700 text-xs px-1.5 py-0.5 rounded-full">
              {vendorBookings.length}
            </span>
          )}
        </button>
        <button
          onClick={() => handleTabChange('browse')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'browse' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Find a Vendor
        </button>
      </div>

      {/* ─── Booked Vendors Tab ─── */}
      {tab === 'booked' && (
        <>
          {loadingBooked ? (
            <div className="flex items-center justify-center h-48 text-gray-500">Loading vendors...</div>
          ) : vendorBookings.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Store className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">No vendors booked yet.</p>
              <button
                onClick={() => handleTabChange('browse')}
                className="text-sm text-primary-600 font-medium hover:text-primary-700"
              >
                Browse vendors →
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {vendorBookings.map((vb: any) => {
                const v = vb.vendor
                return (
                  <div key={vb.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start gap-3">
                        {v?.profile_image_url ? (
                          <img src={v.profile_image_url} alt={v.business_name} className="h-14 w-14 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="h-14 w-14 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <Store className="h-7 w-7 text-primary-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 truncate">{v?.business_name ?? 'Vendor'}</h3>
                            {v?.is_verified && (
                              <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" aria-label="Verified" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{CATEGORY_LABELS[v?.category] ?? v?.category}</p>
                          {(v?.city || v?.state) && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {[v.city, v.state].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${bookingStatusColor[vb.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {vb.status}
                        </span>
                      </div>

                      {v?.bio && <p className="mt-3 text-sm text-gray-600 line-clamp-2">{v.bio}</p>}

                      {/* Event info */}
                      {(vb.event_name || vb.event_date) && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="h-3.5 w-3.5" />
                          {vb.event_name}{vb.event_date ? ` · ${new Date(vb.event_date + 'T00:00:00').toLocaleDateString()}` : ''}
                        </div>
                      )}

                      {/* Booking Details */}
                      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
                        {vb.agreed_amount != null && (
                          <div>
                            <p className="text-xs text-gray-500 flex items-center gap-1"><DollarSign className="h-3 w-3" />Agreed Amount</p>
                            <p className="font-semibold text-gray-900">${Number(vb.agreed_amount).toFixed(2)}</p>
                          </div>
                        )}
                        {vb.deposit_amount != null && (
                          <div>
                            <p className="text-xs text-gray-500">Deposit</p>
                            <p className="font-semibold text-gray-900">${Number(vb.deposit_amount).toFixed(2)}</p>
                          </div>
                        )}
                      </div>

                      {/* Contact */}
                      <div className="mt-3 flex items-center gap-3 flex-wrap">
                        {v?.phone && (
                          <a href={`tel:${v.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600">
                            <Phone className="h-3.5 w-3.5" />{v.phone}
                          </a>
                        )}
                        {v?.email && (
                          <a href={`mailto:${v.email}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600">
                            <Mail className="h-3.5 w-3.5" />{v.email}
                          </a>
                        )}
                        {v?.website && (
                          <a href={v.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600">
                            <Globe className="h-3.5 w-3.5" />Website
                          </a>
                        )}
                        {v?.instagram && (
                          <a href={`https://instagram.com/${v.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600">
                            <Instagram className="h-3.5 w-3.5" />{v.instagram}
                          </a>
                        )}
                      </div>

                      {vb.notes && (
                        <p className="mt-3 text-xs text-gray-400 italic">"{vb.notes}"</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ─── Browse Vendors Tab ─── */}
      {tab === 'browse' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={browseSearch}
                onChange={e => setBrowseSearch(e.target.value)}
                placeholder="Search vendors by name or city…"
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={browseCategory}
              onChange={e => handleCategoryChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {loadingBrowse ? (
            <div className="flex items-center justify-center h-48 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading vendors…
            </div>
          ) : filteredBrowse.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Store className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No vendors found.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredBrowse.map(v => (
                <div key={v.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      {v.profile_image_url ? (
                        <img src={v.profile_image_url} alt={v.business_name} className="h-14 w-14 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <Store className="h-7 w-7 text-primary-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-semibold text-gray-900 truncate">{v.business_name}</h3>
                          {v.is_verified && <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" aria-label="Verified" />}
                        </div>
                        <p className="text-sm text-gray-500">{CATEGORY_LABELS[v.category] ?? v.category}</p>
                        {(v.city || v.state) && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {[v.city, v.state].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>

                    {v.bio && <p className="text-sm text-gray-600 line-clamp-2 mb-3">{v.bio}</p>}

                    {(v.hourly_rate || v.flat_rate) && (
                      <div className="flex gap-2 flex-wrap mb-3">
                        {v.hourly_rate && v.hourly_rate > 0 && (
                          <span className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-gray-600">
                            ${v.hourly_rate}/hr
                          </span>
                        )}
                        {v.flat_rate && v.flat_rate > 0 && (
                          <span className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-gray-600">
                            ${v.flat_rate.toLocaleString()} flat
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 flex-wrap mb-4">
                      {v.phone && (
                        <a href={`tel:${v.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600">
                          <Phone className="h-3.5 w-3.5" />{v.phone}
                        </a>
                      )}
                      {v.website && (
                        <a href={v.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600">
                          <Globe className="h-3.5 w-3.5" />Website
                        </a>
                      )}
                    </div>

                    <button
                      onClick={() => openBookModal(v)}
                      className="w-full bg-primary-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
                    >
                      Book {v.business_name}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Booking Modal ─── */}
      {bookingVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold text-gray-900">Book {bookingVendor.business_name}</h2>
                <button onClick={() => setBookingVendor(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Booking as <span className="font-medium text-gray-700">{[client?.firstName, client?.lastName].filter(Boolean).join(' ') || client?.phone}</span>
              </p>

              {bookError && (
                <div className="bg-red-50 text-red-700 rounded-lg px-3 py-2 text-sm mb-4 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />{bookError}
                </div>
              )}

              <form onSubmit={handleBookSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
                  <input
                    type="text"
                    value={bookForm.eventName}
                    onChange={e => setBookForm(f => ({ ...f, eventName: e.target.value }))}
                    required
                    placeholder="e.g. Smith Wedding Reception"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Date *</label>
                  <input
                    type="date"
                    value={bookForm.eventDate}
                    onChange={e => setBookForm(f => ({ ...f, eventDate: e.target.value }))}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input type="time" value={bookForm.startTime} onChange={e => setBookForm(f => ({ ...f, startTime: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input type="time" value={bookForm.endTime} onChange={e => setBookForm(f => ({ ...f, endTime: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Venue / Location</label>
                  <input
                    type="text"
                    value={bookForm.venueName}
                    onChange={e => setBookForm(f => ({ ...f, venueName: e.target.value }))}
                    placeholder="Venue name or address"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={bookForm.notes}
                    onChange={e => setBookForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    placeholder="Any special requirements…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBookingVendor(null)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookSubmitting}
                    className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {bookSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {bookSubmitting ? 'Sending…' : 'Send Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ClientVendorsPage() {
  return (
    <Suspense>
      <ClientVendorsPageContent />
    </Suspense>
  )
}
