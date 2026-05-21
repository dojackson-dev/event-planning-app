'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import {
  Loader2, MapPin, Globe, Instagram, Facebook, Phone, Mail,
  DollarSign, Star, Store, CheckCircle2, ChevronLeft,
} from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  dj: '🎧 DJ',
  decorator: '🌸 Decorator',
  planner_coordinator: '📋 Planner / Coordinator',
  furniture: '🪑 Furniture',
  photographer: '📸 Photographer',
  musicians: '🎵 Musicians',
  mc_host: '🎙️ MC / Host',
  graphic_designer: '🎨 Graphic Designer',
  other: '⭐ Other',
}

interface VendorProfile {
  id: string
  business_name: string
  category: string
  categories: string[]
  bio: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  address: string | null
  profile_image_url: string | null
  cover_image_url: string | null
  hourly_rate: number | null
  flat_rate: number | null
  rate_description: string | null
  phone: string | null
  email: string | null
  website: string | null
  instagram: string | null
  facebook: string | null
  is_verified: boolean
  avg_rating: number | null
  vendor_reviews: { id: string; rating: number; review_text: string | null; created_at: string }[]
  vendor_gallery: { id: string; image_url: string; caption: string | null }[]
}

export default function VendorDetailForPromoterPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [vendor, setVendor] = useState<VendorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Booking form
  const [showForm, setShowForm] = useState(false)
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [agreedAmount, setAgreedAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!id) return
    api.get(`/vendors/${id}`)
      .then(res => setVendor(res.data))
      .catch(() => setError('Vendor not found'))
      .finally(() => setLoading(false))
  }, [id])

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventName || !eventDate) { setFormError('Event name and date are required'); return }
    setFormError('')
    setSubmitting(true)
    try {
      await api.post('/vendors/bookings', {
        vendorAccountId: id,
        eventName,
        eventDate,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        venueName: venueName || undefined,
        venueAddress: venueAddress || undefined,
        agreedAmount: agreedAmount ? parseFloat(agreedAmount) : undefined,
        notes: notes || undefined,
      })
      setSuccess(true)
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to submit booking request')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
  if (error || !vendor) return <div className="flex items-center justify-center py-24"><p className="text-gray-500">{error || 'Vendor not found'}</p></div>

  const rateLabel = vendor.rate_description ||
    (vendor.flat_rate ? `$${vendor.flat_rate.toLocaleString()} flat` :
      vendor.hourly_rate ? `$${vendor.hourly_rate}/hr` : null)

  return (
    <div className="bg-gray-50">
      {/* Page Title Banner */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-4 py-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-white/70 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-white">{vendor.business_name}</h1>
            {vendor.is_verified && <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">✓ Verified</span>}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-white text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-50"
          >
            Book This Vendor
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Hero card */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {vendor.cover_image_url && (
            <img src={vendor.cover_image_url} alt="" className="w-full h-40 object-cover" />
          )}
          <div className="p-6 flex items-start gap-5">
            <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 -mt-2 border-2 border-white shadow">
              {vendor.profile_image_url ? (
                <img src={vendor.profile_image_url} alt={vendor.business_name} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <Store className="w-8 h-8 text-purple-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-purple-600 font-medium">{CATEGORY_LABELS[vendor.category] ?? vendor.category}</p>
              {(vendor.city || vendor.state) && (
                <p className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                  <MapPin className="w-4 h-4" />{[vendor.city, vendor.state].filter(Boolean).join(', ')}
                </p>
              )}
              {vendor.avg_rating != null && vendor.avg_rating > 0 && (
                <p className="flex items-center gap-1 text-sm text-amber-600 mt-1">
                  <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />{vendor.avg_rating.toFixed(1)} ({vendor.vendor_reviews.length} reviews)
                </p>
              )}
              {rateLabel && (
                <p className="flex items-center gap-1 text-sm text-green-700 mt-1 font-medium">
                  <DollarSign className="w-4 h-4" />{rateLabel}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {vendor.bio && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-900 mb-2">About</h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">{vendor.bio}</p>
          </div>
        )}

        {/* Contact */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Contact</h2>
          <div className="space-y-2">
            {vendor.phone && (
              <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-purple-600">
                <Phone className="w-4 h-4 text-gray-400" />{vendor.phone}
              </a>
            )}
            {vendor.email && (
              <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-purple-600">
                <Mail className="w-4 h-4 text-gray-400" />{vendor.email}
              </a>
            )}
            {vendor.website && (
              <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-purple-600 hover:underline">
                <Globe className="w-4 h-4" />{vendor.website}
              </a>
            )}
            {vendor.instagram && (
              <a href={`https://instagram.com/${vendor.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-700 hover:text-purple-600">
                <Instagram className="w-4 h-4 text-gray-400" />@{vendor.instagram.replace('@', '')}
              </a>
            )}
            {vendor.facebook && (
              <a href={vendor.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-700 hover:text-purple-600">
                <Facebook className="w-4 h-4 text-gray-400" />{vendor.facebook}
              </a>
            )}
          </div>
        </div>

        {/* Gallery */}
        {vendor.vendor_gallery?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Gallery</h2>
            <div className="grid grid-cols-3 gap-2">
              {vendor.vendor_gallery.map(g => (
                <img key={g.id} src={g.image_url} alt={g.caption || ''} className="w-full h-24 object-cover rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {vendor.vendor_reviews?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Reviews</h2>
            <div className="space-y-3">
              {vendor.vendor_reviews.slice(0, 5).map(r => (
                <div key={r.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-1 mb-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-amber-400 stroke-amber-400' : 'stroke-gray-300'}`} />
                    ))}
                  </div>
                  {r.review_text && <p className="text-sm text-gray-700">{r.review_text}</p>}
                  <p className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Book CTA */}
        <div className="text-center">
          <button
            onClick={() => setShowForm(true)}
            className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 text-sm"
          >
            Book {vendor.business_name}
          </button>
        </div>
      </div>

      {/* Booking modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="p-6">
              {success ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Booking Request Sent!</h3>
                  <p className="text-sm text-gray-500 mb-6">{vendor.business_name} has been notified and will confirm shortly.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => router.push('/dashboard/promoter/vendors/bookings')}
                      className="flex-1 py-2.5 bg-purple-600 text-white font-medium rounded-xl text-sm hover:bg-purple-700"
                    >
                      View My Bookings
                    </button>
                    <button
                      onClick={() => { setSuccess(false); setShowForm(false) }}
                      className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl text-sm hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBook} className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900">Book {vendor.business_name}</h3>
                    <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
                  </div>

                  {formError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{formError}</div>}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
                    <input value={eventName} onChange={e => setEventName(e.target.value)} required
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Summer Night Festival" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Date *</label>
                    <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                      <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                      <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name</label>
                    <input value={venueName} onChange={e => setVenueName(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="The Grand Ballroom" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Venue Address</label>
                    <input value={venueAddress} onChange={e => setVenueAddress(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="123 Main St, Atlanta, GA" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Agreed Amount ($)</label>
                    <input type="number" min="0" step="0.01" value={agreedAmount} onChange={e => setAgreedAmount(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="500.00" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      placeholder="Any special requirements..." />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={submitting}
                      className="flex-1 py-3 bg-purple-600 text-white font-semibold rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                      {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Send Booking Request'}
                    </button>
                    <button type="button" onClick={() => setShowForm(false)}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl text-sm hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
