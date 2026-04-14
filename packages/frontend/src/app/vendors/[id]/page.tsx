'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import clientApi from '@/lib/clientApi'
import DashboardReturnButton from '@/components/DashboardReturnButton'
import { Phone, Mail, User, MessageSquare, LogIn } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  dj: '🎵 DJ',
  decorator: '🌸 Decorator',
  planner_coordinator: '📋 Planner/Coordinator',
  furniture: '🪑 Furniture',
  photographer: '📷 Photographer',
  musicians: '🎸 Musicians',
  mc_host: '🎤 MC/Host',
  other: '⭐ Other',
}

interface VendorProfile {
  id: string
  user_id: string
  business_name: string
  category: string
  categories?: string[]
  bio: string
  city: string
  state: string
  zip_code: string
  profile_image_url: string
  gallery_images?: string[]
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

interface Review {
  id: string
  rating: number
  review_text: string
  reviewer_name: string
  created_at: string
}

interface BookingForm {
  clientName: string
  clientEmail: string
  clientPhone: string
  smsOptIn: boolean
  eventName: string
  eventDate: string
  startTime: string
  endTime: string
  notes: string
  agreedAmount: string
}

export default function VendorPublicProfile({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [vendor, setVendor] = useState<VendorProfile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    clientName: '', clientEmail: '', clientPhone: '', smsOptIn: true,
    eventName: '', eventDate: '', startTime: '', endTime: '', notes: '', agreedAmount: '',
  })
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')

  // Detect whether the visitor is logged in as a client (via client portal)
  const [isClientLoggedIn, setIsClientLoggedIn] = useState(false)
  const [clientSession, setClientSession] = useState<{ firstName: string; lastName: string; phone: string } | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('client_token')
      const sessionStr = localStorage.getItem('client_session')
      if (token && sessionStr) {
        try {
          const sess = JSON.parse(sessionStr)
          setIsClientLoggedIn(true)
          setClientSession(sess)
        } catch { /* ignore */ }
      }
    }
  }, [])

  useEffect(() => {
    const loadVendor = async () => {
      try {
        const [vendorRes, reviewsRes] = await Promise.all([
          api.get(`/vendors/${params.id}`),
          api.get(`/vendors/${params.id}/reviews`),
        ])
        setVendor(vendorRes.data)
        setReviews(reviewsRes.data)
      } catch {
        router.push('/vendors')
      } finally {
        setLoading(false)
      }
    }
    loadVendor()
  }, [params.id, router])

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBookingSubmitting(true)
    setBookingError('')
    try {
      if (isClientLoggedIn) {
        // Client portal path — booking is tied to the client's account
        await clientApi.post('/vendors/book', {
          vendorAccountId: params.id,
          eventName: bookingForm.eventName,
          eventDate: bookingForm.eventDate,
          startTime: bookingForm.startTime || undefined,
          endTime: bookingForm.endTime || undefined,
          notes: bookingForm.notes || undefined,
        })
      } else {
        // Owner / anonymous path — captures contact info manually
        await api.post('/vendors/bookings', {
          vendorAccountId: params.id,
          clientName: bookingForm.clientName || undefined,
          clientEmail: bookingForm.clientEmail || undefined,
          clientPhone: bookingForm.clientPhone || undefined,
          smsOptIn: bookingForm.clientPhone ? bookingForm.smsOptIn : false,
          eventName: bookingForm.eventName,
          eventDate: bookingForm.eventDate,
          startTime: bookingForm.startTime || undefined,
          endTime: bookingForm.endTime || undefined,
          notes: bookingForm.notes || undefined,
          agreedAmount: bookingForm.agreedAmount ? parseFloat(bookingForm.agreedAmount) : undefined,
        })
      }
      setBookingSuccess(true)
      setBookingOpen(false)
      setBookingForm({ clientName: '', clientEmail: '', clientPhone: '', smsOptIn: true, eventName: '', eventDate: '', startTime: '', endTime: '', notes: '', agreedAmount: '' })
    } catch (err: any) {
      setBookingError(err.response?.data?.message || 'Failed to send booking request')
    } finally {
      setBookingSubmitting(false)
    }
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setReviewSubmitting(true)
    setReviewError('')
    try {
      const res = await clientApi.post('/vendors/review', {
        vendorAccountId: params.id,
        rating: reviewForm.rating,
        reviewText: reviewForm.text,
      })
      setReviews(prev => [res.data, ...prev])
      setReviewForm({ rating: 5, text: '' })
    } catch (err: any) {
      setReviewError(err.response?.data?.message || 'Failed to submit review')
    } finally {
      setReviewSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!vendor) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-primary-600 font-bold text-lg">DoVenueSuite</Link>
          <div className="flex items-center gap-3">
            <Link href="/vendors" className="text-sm text-gray-500 hover:text-gray-700">← All Vendors</Link>
            <button
              onClick={() => setBookingOpen(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700"
            >
              Book Now
            </button>
            <DashboardReturnButton />
          </div>
        </div>
      </nav>

      {/* Success Banner */}
      {bookingSuccess && (
        <div className="bg-green-600 text-white text-center py-3 text-sm font-medium">
          ✅ Booking request sent! The vendor will confirm shortly.
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="px-6 pt-6 pb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 rounded-full border-4 border-white bg-white shadow overflow-hidden flex-shrink-0">
                {vendor.profile_image_url ? (
                  <img src={vendor.profile_image_url} alt={vendor.business_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary-100 flex items-center justify-center text-3xl">
                    {CATEGORY_LABELS[vendor.category]?.split(' ')[0] || '🎪'}
                  </div>
                )}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">{vendor.business_name}</h1>
                  {vendor.is_verified && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">✓ Verified</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {(vendor.categories?.length ? vendor.categories : [vendor.category]).map(cat => (
                    <span key={cat} className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {CATEGORY_LABELS[cat] || cat}
                    </span>
                  ))}
                  {(vendor.city || vendor.state) && (
                    <span className="text-gray-400 text-xs ml-1">· {[vendor.city, vendor.state].filter(Boolean).join(', ')}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Rating */}
            {(vendor.avgRating || 0) > 0 && (
              <div className="flex items-center gap-1 mb-3">
                {[1,2,3,4,5].map(i => (
                  <span key={i} className={i <= Math.round(vendor.avgRating || 0) ? 'text-yellow-400' : 'text-gray-200'}>★</span>
                ))}
                <span className="text-sm font-medium text-gray-700 ml-1">{vendor.avgRating}</span>
                <span className="text-sm text-gray-400">({vendor.reviewCount} review{vendor.reviewCount !== 1 ? 's' : ''})</span>
              </div>
            )}

            {vendor.bio && <p className="text-gray-600 leading-relaxed mb-4">{vendor.bio}</p>}

            {/* Pricing */}
            {(vendor.hourly_rate || vendor.flat_rate) && (
              <div className="flex flex-wrap gap-3 mb-4">
                {vendor.hourly_rate > 0 && (
                  <div className="bg-gray-50 rounded-lg px-4 py-2 text-sm">
                    <span className="text-gray-500">Hourly rate</span>
                    <span className="font-bold text-gray-900 ml-2">${vendor.hourly_rate}/hr</span>
                  </div>
                )}
                {vendor.flat_rate > 0 && (
                  <div className="bg-gray-50 rounded-lg px-4 py-2 text-sm">
                    <span className="text-gray-500">Flat rate</span>
                    <span className="font-bold text-gray-900 ml-2">${vendor.flat_rate.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Contact links */}
            <div className="flex flex-wrap gap-3">
              {vendor.phone && (
                <a href={`tel:${vendor.phone}`} className="text-sm text-primary-600 hover:text-primary-700 font-medium">📞 {vendor.phone}</a>
              )}
              {vendor.website && (
                <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:text-primary-700 font-medium">🌐 Website</a>
              )}
              {vendor.instagram && (
                <a href={`https://instagram.com/${vendor.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:text-primary-700 font-medium">📷 Instagram</a>
              )}
            </div>
          </div>
        </div>

        {/* Gallery */}
        {vendor.gallery_images && vendor.gallery_images.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Portfolio</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {vendor.gallery_images.map((img, i) => (
                <img key={i} src={img} alt="" className="w-full h-40 object-cover rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {/* Book CTA */}
        <div className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-xl p-6 mb-6 text-white text-center">
          <h2 className="text-xl font-bold mb-2">Ready to book {vendor.business_name}?</h2>
          <p className="text-primary-100 text-sm mb-4">Send a booking request and they'll confirm within 24 hours.</p>
          {isClientLoggedIn ? (
            <div className="space-y-2">
              <p className="text-primary-200 text-xs">
                Booking as <span className="font-semibold text-white">{[clientSession?.firstName, clientSession?.lastName].filter(Boolean).join(' ') || clientSession?.phone}</span>
                {' — '}
                <Link href="/client-portal/vendors" className="underline hover:text-white">view in your portal</Link>
              </p>
              <button
                onClick={() => setBookingOpen(true)}
                className="bg-white text-primary-700 font-bold px-8 py-3 rounded-xl hover:bg-primary-50 transition-colors"
              >
                Book This Vendor
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => setBookingOpen(true)}
                className="bg-white text-primary-700 font-bold px-8 py-3 rounded-xl hover:bg-primary-50 transition-colors"
              >
                Book This Vendor
              </button>
              <p className="text-primary-200 text-xs">
                Already have a client account?{' '}
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem('post_login_redirect', window.location.pathname)
                    }
                    router.push('/client-login')
                  }}
                  className="underline hover:text-white font-medium"
                >
                  Log in to book through your portal
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Reviews */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Reviews</h2>

          {/* Leave a review */}
          <div className="border border-gray-100 rounded-xl p-4 mb-6 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Leave a Review</h3>
            {isClientLoggedIn ? (
              <>
                {reviewError && <div className="text-sm text-red-600 mb-2">{reviewError}</div>}
                <form onSubmit={handleReviewSubmit} className="space-y-3">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm(f => ({ ...f, rating: star }))}
                        className={`text-2xl transition-colors ${star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-200'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewForm.text}
                    onChange={e => setReviewForm(f => ({ ...f, text: e.target.value }))}
                    rows={3}
                    placeholder="Share your experience..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none bg-white"
                  />
                  <button
                    type="submit"
                    disabled={reviewSubmitting || !reviewForm.text}
                    className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
                  >
                    {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-3">
                <p className="text-sm text-gray-500 mb-2">You must be logged in to leave a review.</p>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem('post_login_redirect', window.location.pathname)
                    }
                    router.push('/client-login')
                  }}
                  className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700"
                >
                  Log in to leave a review
                </button>
              </div>
            )}
          </div>

          {reviews.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No reviews yet. Be the first!</p>
          ) : (
            <div className="space-y-4">
              {reviews.map(r => (
                <div key={r.id} className="border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">
                      {[1,2,3,4,5].map(i => (
                        <span key={i} className={i <= r.rating ? 'text-yellow-400' : 'text-gray-200'}>★</span>
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{r.reviewer_name || 'Anonymous'}</span>
                    <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.review_text && <p className="text-gray-600 text-sm">{r.review_text}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {bookingOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Book {vendor.business_name}</h2>
                <button onClick={() => setBookingOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>

              {bookingError && <div className="bg-red-50 text-red-700 rounded p-3 text-sm mb-4">{bookingError}</div>}

              <form onSubmit={handleBookingSubmit} className="space-y-4">
                {/* Client Info — only shown when not logged into client portal */}
                {!isClientLoggedIn && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Information</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={bookingForm.clientName}
                        onChange={e => setBookingForm(f => ({ ...f, clientName: e.target.value }))}
                        placeholder="Jane Doe"
                        className="w-full pl-9 pr-3 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Your Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={bookingForm.clientEmail}
                        onChange={e => setBookingForm(f => ({ ...f, clientEmail: e.target.value }))}
                        placeholder="you@example.com"
                        className="w-full pl-9 pr-3 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Your Phone {bookingForm.smsOptIn ? <span className="text-red-500">*</span> : <span className="text-gray-400">(optional)</span>}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={bookingForm.clientPhone}
                        onChange={e => setBookingForm(f => ({ ...f, clientPhone: e.target.value }))}
                        placeholder="(555) 000-0000"
                        className="w-full pl-9 pr-3 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                      />
                    </div>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={bookingForm.smsOptIn}
                        onChange={e => setBookingForm(f => ({ ...f, smsOptIn: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-primary-400" />
                        Text me when my booking is confirmed
                      </span>
                    </label>
                    {bookingForm.smsOptIn && !bookingForm.clientPhone && (
                      <p className="text-xs text-amber-600 mt-1">Enter your phone number above to receive texts.</p>
                    )}
                  </div>
                </div>
                )}

                {isClientLoggedIn && clientSession && (
                  <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-primary-700">
                    <LogIn className="h-4 w-4 flex-shrink-0" />
                    Booking as <strong>{[clientSession.firstName, clientSession.lastName].filter(Boolean).join(' ') || clientSession.phone}</strong>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
                  <input
                    type="text"
                    value={bookingForm.eventName}
                    onChange={e => setBookingForm(f => ({ ...f, eventName: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g. Smith Wedding Reception"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Date *</label>
                  <input
                    type="date"
                    value={bookingForm.eventDate}
                    onChange={e => setBookingForm(f => ({ ...f, eventDate: e.target.value }))}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={bookingForm.startTime}
                      onChange={e => setBookingForm(f => ({ ...f, startTime: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={bookingForm.endTime}
                      onChange={e => setBookingForm(f => ({ ...f, endTime: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget / Agreed Amount ($)</label>
                  <input
                    type="number"
                    value={bookingForm.agreedAmount}
                    onChange={e => setBookingForm(f => ({ ...f, agreedAmount: e.target.value }))}
                    min="0" step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Special Requests</label>
                  <textarea
                    value={bookingForm.notes}
                    onChange={e => setBookingForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    placeholder="Any special requirements or notes..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBookingOpen(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50"
                  >
                    {bookingSubmitting ? 'Sending...' : 'Send Request'}
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
