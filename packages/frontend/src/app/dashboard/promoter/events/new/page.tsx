'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { Plus, Trash2, Loader2, Tag, DollarSign, Users, Upload, X, AlertTriangle, CreditCard } from 'lucide-react'

interface TierForm {
  name: string
  price: string
  quantity: string
  description: string
}

const EVENT_CATEGORIES = [
  'Music', 'Comedy', 'Sports', 'Arts & Theater', 'Food & Drink',
  'Networking', 'Conference', 'Festival', 'Club Night', 'Other',
]

const VENUE_TYPES = [
  // Indoor
  'Church / House of Worship',
  'School / University Auditorium',
  'Community Center',
  'Convention Center',
  'Hotel Ballroom / Banquet Hall',
  'Restaurant / Bar',
  'Nightclub / Lounge',
  'Theater / Performing Arts Center',
  'Indoor Arena',
  'Warehouse / Industrial Loft',
  'Museum / Gallery',
  'Private Residence / Estate',
  // Outdoor
  'Outdoor Stadium',
  'Amphitheater',
  'Park / Open Field',
  'Rooftop',
  'Beach / Waterfront',
  'Fairgrounds / Expo Center',
  'Street / Public Plaza',
  // Generic
  'Indoor (Generic)',
  'Outdoor (Generic)',
  'Indoor + Outdoor (Mixed)',
  'Other',
]

export default function NewPromoterEventPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const errorRef = useRef<HTMLDivElement>(null)

  // Event fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [venueType, setVenueType] = useState('')
  const [category, setCategory] = useState('')
  const [ageRestriction, setAgeRestriction] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState('')
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null)

  // Ticket tiers
  const [tiers, setTiers] = useState<TierForm[]>([])

  const hasPaidTiers = tiers.some(t => parseFloat(t.price) > 0)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.replace('/login'); return }
    api.get('/promoter/profile')
      .then(r => setStripeConnected(r.data?.stripe_connect_status === 'active'))
      .catch((e) => {
        if (e.response?.status === 404 || e.response?.status === 401) {
          router.replace('/login')
        } else {
          setStripeConnected(false)
        }
      })
  }, [router])

  // Scroll to error when it changes
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [error])

  function addTier() {
    setTiers(prev => [...prev, { name: '', price: '', quantity: '', description: '' }])
  }

  function removeTier(i: number) {
    setTiers(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateTier(i: number, field: keyof TierForm, value: string) {
    setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t))
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Banner image must be under 5 MB')
      return
    }
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
    setImageUrl('')
  }

  function removeBanner() {
    setBannerFile(null)
    setBannerPreview('')
    if (bannerInputRef.current) bannerInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent, saveStatus?: 'draft' | 'published') => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let finalImageUrl = imageUrl

      if (bannerFile) {
        setUploadingBanner(true)
        const form = new FormData()
        form.append('file', bannerFile)
        const uploadRes = await api.post('/upload/event-banner', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setUploadingBanner(false)
        finalImageUrl = uploadRes.data.url
      }

      const ticket_tiers = tiers.map(t => ({
        name: t.name,
        price: parseFloat(t.price) || 0,
        quantity: parseInt(t.quantity) || 0,
        description: t.description || undefined,
      }))

      const res = await api.post('/promoter-events', {
        title,
        description: description || undefined,
        event_date: eventDate,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        venue_name: venueName || undefined,
        venue_address: venueAddress || undefined,
        city: city || undefined,
        state: state || undefined,
        venue_type: venueType || undefined,
        category: category || undefined,
        age_restriction: ageRestriction || undefined,
        image_url: finalImageUrl || undefined,
        status: saveStatus ?? status,
        ticket_tiers: ticket_tiers.length > 0 ? ticket_tiers : undefined,
      })
      router.push(`/dashboard/promoter/events/${res.data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Title row */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-5 text-center">
          <h1 className="text-2xl font-bold text-gray-900">New Event</h1>
        </div>
      </div>

      {/* Sticky nav bar */}
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard/promoter/events" className="text-sm text-gray-500 hover:text-gray-700">← Events</Link>
        </div>
      </nav>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {error && <div ref={errorRef} className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm font-medium">{error}</div>}

        {/* Basic Details */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Event Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Summer Night Festival" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Tell people about your event..." />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                <option value="">Select category</option>
                {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age Restriction</label>
              <select value={ageRestriction} onChange={e => setAgeRestriction(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                <option value="">All ages</option>
                <option value="18+">18+</option>
                <option value="21+">21+</option>
              </select>
            </div>
          </div>
          {/* Banner Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Banner</label>
            <p className="text-xs text-gray-400 mb-2">
              Recommended: <strong>1920 × 1080 px (16:9)</strong> · JPG, PNG, or WEBP · Max 5 MB — works great on mobile and desktop
            </p>
            {bannerPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                <div className="w-full" style={{ aspectRatio: '16/9' }}>
                  <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={removeBanner}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                  {bannerFile?.name}
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition">
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Click or drag to upload banner</span>
                <span className="text-xs text-gray-400">JPG, PNG, WEBP — max 5 MB</span>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleBannerChange}
                />
              </label>
            )}
            {!bannerPreview && (
              <input
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                className="w-full mt-2 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-500"
                placeholder="Or paste an image URL..."
              />
            )}
          </div>
        </div>

        {/* Venue */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Venue</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name</label>
            <input value={venueName} onChange={e => setVenueName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="The Venue at..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
            <input value={venueAddress} onChange={e => setVenueAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input value={city} onChange={e => setCity(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input value={state} onChange={e => setState(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g. GA" maxLength={2} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue Type</label>
            <select value={venueType} onChange={e => setVenueType(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
              <option value="">Select venue type</option>
              <optgroup label="Indoor">
                {VENUE_TYPES.slice(0, 12).map(v => <option key={v} value={v}>{v}</option>)}
              </optgroup>
              <optgroup label="Outdoor">
                {VENUE_TYPES.slice(12, 19).map(v => <option key={v} value={v}>{v}</option>)}
              </optgroup>
              <optgroup label="General">
                {VENUE_TYPES.slice(19).map(v => <option key={v} value={v}>{v}</option>)}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Ticket Tiers */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Ticket Tiers</h2>
            <button type="button" onClick={addTier}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-sm hover:bg-purple-100">
              <Plus className="w-3.5 h-3.5" /> Add Tier
            </button>
          </div>
          {tiers.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center">
              <Tag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No ticket tiers yet</p>
              <p className="text-xs text-gray-400 mt-1">Add tiers for VIP, General Admission, etc.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tiers.map((tier, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Tier {i + 1}</span>
                    <button type="button" onClick={() => removeTier(i)}
                      className="text-gray-400 hover:text-red-500 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                    <input value={tier.name} onChange={e => updateTier(i, 'name', e.target.value)} required
                      placeholder="e.g. VIP, General Admission"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Price *
                      </label>
                      <input type="number" min="0" step="0.01" value={tier.price}
                        onChange={e => updateTier(i, 'price', e.target.value)} required
                        placeholder="0.00"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Capacity *
                      </label>
                      <input type="number" min="1" value={tier.quantity}
                        onChange={e => updateTier(i, 'quantity', e.target.value)} required
                        placeholder="100"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <input value={tier.description} onChange={e => updateTier(i, 'description', e.target.value)}
                      placeholder="What's included..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stripe warning — shown when paid tiers exist but no Stripe connected */}
        {hasPaidTiers && stripeConnected === false && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">Stripe account required for paid tickets</p>
              <p className="text-sm text-amber-700 mt-0.5">
                You can save this event as a draft, but you must connect Stripe before publishing paid tickets.
              </p>
              <a href="/dashboard/promoter/profile" className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-amber-800 underline hover:text-amber-900">
                <CreditCard className="w-3.5 h-3.5" /> Go to Profile Settings
              </a>
            </div>
          </div>
        )}

        {/* Status + Submit */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Publish Settings</h2>
          <div className="flex gap-3">
            <label className={`flex-1 flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition ${status === 'draft' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" className="sr-only" checked={status === 'draft'} onChange={() => setStatus('draft')} />
              <div>
                <p className="text-sm font-semibold text-gray-800">Save as Draft</p>
                <p className="text-xs text-gray-500">Not visible to public yet</p>
              </div>
            </label>
            <label className={`flex-1 flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition ${
              hasPaidTiers && stripeConnected === false
                ? 'border-gray-200 opacity-50 cursor-not-allowed'
                : status === 'published' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                className="sr-only"
                checked={status === 'published'}
                disabled={hasPaidTiers && stripeConnected === false}
                onChange={() => !(hasPaidTiers && stripeConnected === false) && setStatus('published')}
              />
              <div>
                <p className="text-sm font-semibold text-gray-800">Publish Now</p>
                <p className="text-xs text-gray-500">
                  {hasPaidTiers && stripeConnected === false
                    ? 'Connect Stripe first to publish paid events'
                    : 'Visible on public events page'}
                </p>
              </div>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || uploadingBanner || (hasPaidTiers && stripeConnected === false && status === 'published')}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-3 rounded-xl hover:bg-purple-700 disabled:opacity-60">
          {(loading || uploadingBanner) ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {uploadingBanner ? 'Uploading banner…' : status === 'published' ? 'Create & Publish Event' : 'Save Draft'}
        </button>
      </form>
    </div>
  )
}
