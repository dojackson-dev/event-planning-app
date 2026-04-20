'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import ImageUpload from '@/components/ImageUpload'
import { ArrowLeft, Save, CheckCircle } from 'lucide-react'

const ARTIST_TYPES = [
  { value: 'musician', label: 'Musician / Band' },
  { value: 'dj', label: 'DJ' },
  { value: 'comedian', label: 'Comedian' },
  { value: 'dancer', label: 'Dancer / Dance Group' },
  { value: 'magician', label: 'Magician' },
  { value: 'spoken_word', label: 'Spoken Word' },
  { value: 'mc_host', label: 'MC / Host' },
  { value: 'other', label: 'Other' },
]

const TRAVEL_OPTIONS = [
  'Local only',
  'Regional (within 200 miles)',
  'National',
  'International',
]

export default function ArtistProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')

  const [form, setForm] = useState({
    artistName: '',
    stageName: '',
    agentName: '',
    bookingContactName: '',
    bookingEmail: '',
    bookingPhone: '',
    agency: '',
    location: '',
    artistType: '',
    genres: '',
    description: '',
    performanceFeeMin: '',
    performanceFeeMax: '',
    travelAvailability: '',
    setLengthMinutes: '',
    equipmentNeeds: '',
    hospitalityRequirements: '',
    website: '',
    instagram: '',
    youtube: '',
    spotify: '',
    epkUrl: '',
    availableForBooking: true,
  })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.replace('/artist/login'); return }

    api.get('/artists/me/profile').then(res => {
      const p = res.data
      if (!p) { router.replace('/artist/register'); return }
      setProfileImageUrl(p.profile_image_url || '')
      setCoverImageUrl(p.cover_image_url || '')
      setForm({
        artistName: p.artist_name || '',
        stageName: p.stage_name || '',
        agentName: p.agent_name || '',
        bookingContactName: p.booking_contact_name || '',
        bookingEmail: p.booking_email || '',
        bookingPhone: p.booking_phone || '',
        agency: p.agency || '',
        location: p.location || '',
        artistType: p.artist_type || '',
        genres: Array.isArray(p.genres) ? p.genres.join(', ') : '',
        description: p.description || '',
        performanceFeeMin: p.performance_fee_min ?? '',
        performanceFeeMax: p.performance_fee_max ?? '',
        travelAvailability: p.travel_availability || '',
        setLengthMinutes: p.set_length_minutes ?? '',
        equipmentNeeds: p.equipment_needs || '',
        hospitalityRequirements: p.hospitality_requirements || '',
        website: p.website || '',
        instagram: p.instagram || '',
        youtube: p.youtube || '',
        spotify: p.spotify || '',
        epkUrl: p.epk_url || '',
        availableForBooking: p.available_for_booking ?? true,
      })
    }).catch(() => router.replace('/artist/login'))
      .finally(() => setLoading(false))
  }, [router])

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.put('/artists/me/profile', {
        artistName: form.artistName,
        stageName: form.stageName || undefined,
        agentName: form.agentName || undefined,
        bookingContactName: form.bookingContactName || undefined,
        bookingEmail: form.bookingEmail || undefined,
        bookingPhone: form.bookingPhone || undefined,
        agency: form.agency || undefined,
        location: form.location || undefined,
        artistType: form.artistType,
        genres: form.genres ? form.genres.split(',').map(g => g.trim()).filter(Boolean) : [],
        description: form.description || undefined,
        performanceFeeMin: form.performanceFeeMin !== '' ? Number(form.performanceFeeMin) : undefined,
        performanceFeeMax: form.performanceFeeMax !== '' ? Number(form.performanceFeeMax) : undefined,
        travelAvailability: form.travelAvailability || undefined,
        setLengthMinutes: form.setLengthMinutes !== '' ? Number(form.setLengthMinutes) : undefined,
        equipmentNeeds: form.equipmentNeeds || undefined,
        hospitalityRequirements: form.hospitalityRequirements || undefined,
        website: form.website || undefined,
        instagram: form.instagram || undefined,
        youtube: form.youtube || undefined,
        spotify: form.spotify || undefined,
        epkUrl: form.epkUrl || undefined,
        availableForBooking: form.availableForBooking,
        profileImageUrl: profileImageUrl || undefined,
        coverImageUrl: coverImageUrl || undefined,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
    </div>
  )

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  )

  const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  )

  const input = (field: string, props: any = {}) => (
    <input
      value={(form as any)[field]}
      onChange={e => set(field, e.target.value)}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      {...props}
    />
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/artist/dashboard" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-semibold text-gray-900">Edit Profile</h1>
        </div>
      </nav>

      <form onSubmit={handleSave} className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> Profile saved successfully
          </div>
        )}

        <Section title="Artist Identity">
          {/* Images */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
              <ImageUpload
                currentUrl={profileImageUrl || null}
                uploadType="artist-logo"
                shape="square"
                onUpload={(url) => setProfileImageUrl(url)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cover / Banner</label>
              <ImageUpload
                currentUrl={coverImageUrl || null}
                uploadType="artist-cover"
                shape="landscape"
                onUpload={(url) => setCoverImageUrl(url)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Artist / Band Name" required>{input('artistName', { required: true })}</Field>
            <Field label="Stage Name">{input('stageName', { placeholder: 'If different from above' })}</Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Artist Type" required>
              <select value={form.artistType} onChange={e => set('artistType', e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select type...</option>
                {ARTIST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="City, State">{input('location', { placeholder: 'Atlanta, GA' })}</Field>
          </div>
          <Field label="Genres (comma-separated)">{input('genres', { placeholder: 'R&B, Soul, Jazz' })}</Field>
          <Field label="Bio / Description">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Tell promoters about yourself and your act..." />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.availableForBooking} onChange={e => set('availableForBooking', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded" />
            <span className="text-sm text-gray-700">Available for booking</span>
          </label>
        </Section>

        <Section title="Booking Contact">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Booking Contact Name">{input('bookingContactName')}</Field>
            <Field label="Booking Email">{input('bookingEmail', { type: 'email' })}</Field>
            <Field label="Booking Phone">{input('bookingPhone', { type: 'tel' })}</Field>
            <Field label="Agency">{input('agency')}</Field>
            <Field label="Agent / Manager Name">{input('agentName')}</Field>
          </div>
        </Section>

        <Section title="Performance Details">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Fee Min ($)">{input('performanceFeeMin', { type: 'number', min: 0, placeholder: '500' })}</Field>
            <Field label="Fee Max ($)">{input('performanceFeeMax', { type: 'number', min: 0, placeholder: '2000' })}</Field>
            <Field label="Set Length (min)">{input('setLengthMinutes', { type: 'number', min: 1, placeholder: '60' })}</Field>
          </div>
          <Field label="Travel Availability">
            <select value={form.travelAvailability} onChange={e => set('travelAvailability', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select...</option>
              {TRAVEL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Equipment Needs">
            <textarea value={form.equipmentNeeds} onChange={e => set('equipmentNeeds', e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="PA system, monitors, DI box..." />
          </Field>
          <Field label="Hospitality Requirements">
            <textarea value={form.hospitalityRequirements} onChange={e => set('hospitalityRequirements', e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Green room, meals, water..." />
          </Field>
        </Section>

        <Section title="Links & Socials">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Instagram">{input('instagram', { placeholder: '@yourhandle' })}</Field>
            <Field label="Website">{input('website', { type: 'url', placeholder: 'https://yoursite.com' })}</Field>
            <Field label="YouTube">{input('youtube', { placeholder: 'https://youtube.com/...' })}</Field>
            <Field label="Spotify">{input('spotify', { placeholder: 'https://open.spotify.com/...' })}</Field>
            <Field label="EPK / Press Kit URL">{input('epkUrl', { type: 'url', placeholder: 'https://...' })}</Field>
          </div>
        </Section>

        <div className="flex justify-end pb-6">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}
