'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { ArrowLeft, Save, CheckCircle, FileText } from 'lucide-react'

const defaultRider = {
  // 1. Event Details (filled per-show by promoter, but artist can pre-fill defaults)
  // 2. Contacts
  artist_manager: '',
  tour_manager: '',
  production_manager: '',
  manager_phone: '',
  manager_email: '',
  tour_manager_phone: '',
  tour_manager_email: '',
  production_manager_phone: '',
  production_manager_email: '',
  // 3. Travel
  traveling_party_size: '',
  transport_required: '',
  airport_transfers: '',
  hotel_requirements: '',
  // 4. Dressing Room
  dressing_rooms_count: '',
  dressing_room_notes: '',
  requires_private_access: false,
  requires_mirrors: false,
  requires_clothing_rack: false,
  requires_steamer: false,
  requires_seating: false,
  requires_wifi: false,
  requires_climate_control: false,
  // 5. Hospitality
  bottled_water: '',
  soft_drinks: '',
  coffee_tea: false,
  hot_meal: false,
  hot_meal_notes: '',
  snacks: '',
  dietary_restrictions: '',
  // 6. Technical
  stage_size_min: '',
  power_requirements: '',
  sound_system: '',
  dj_setup: '',
  microphones: '',
  monitors: '',
  lighting: '',
  video_playback: '',
  technical_notes: '',
  // 7. Security
  backstage_access_control: '',
  crowd_barrier: false,
  stage_escort: false,
  meet_greet_security: false,
  security_notes: '',
  // 8. Schedule defaults
  load_in_time: '',
  soundcheck_time: '',
  performance_duration: '',
  load_out_time: '',
  // 9. Merch
  merch_table_required: false,
  merch_staffing: '',
  merch_settlement: '',
  merch_split_percentage: '',
  // 10. Special Notes
  branding_restrictions: '',
  photography_policy: '',
  recording_policy: '',
  guest_list_comps: '',
  promoter_obligations: '',
  special_notes: '',
}

type RiderData = typeof defaultRider

export default function ArtistRiderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [rider, setRider] = useState<RiderData>(defaultRider)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.replace('/artist/login'); return }

    api.get('/artists/me/rider')
      .then(res => {
        if (res.data) {
          setRider({ ...defaultRider, ...res.data })
        }
      })
      .catch((err: any) => {
        if (err.response?.status === 401) router.replace('/artist/login')
      })
      .finally(() => setLoading(false))
  }, [router])

  const set = (field: keyof RiderData, value: any) =>
    setRider(r => ({ ...r, [field]: value }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.put('/artists/me/rider', rider)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save rider')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
    </div>
  )

  const Section = ({ num, title, children }: { num: number; title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <span className="h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {num}
        </span>
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  )

  const Field = ({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) => (
    <div className={half ? '' : ''}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )

  const txt = (field: keyof RiderData, props: any = {}) => (
    <input value={(rider[field] as string) || ''} onChange={e => set(field, e.target.value)}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      {...props} />
  )

  const area = (field: keyof RiderData, rows = 2, placeholder = '') => (
    <textarea value={(rider[field] as string) || ''} onChange={e => set(field, e.target.value)}
      rows={rows} placeholder={placeholder}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
  )

  const chk = (field: keyof RiderData, label: string) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={!!rider[field]} onChange={e => set(field, e.target.checked)}
        className="h-4 w-4 text-blue-600 rounded" />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/artist/dashboard" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <FileText className="h-5 w-5 text-blue-600" />
          <h1 className="font-semibold text-gray-900">Artist Rider</h1>
        </div>
      </nav>

      <form onSubmit={handleSave} className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> Rider saved
          </div>
        )}

        <p className="text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          Your rider is shared with promoters who book you. Fill in your standard requirements — you can always adjust per show.
        </p>

        {/* 1. N/A — event details are per-show */}

        {/* 2. Contacts */}
        <Section num={2} title="Contacts">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Artist Manager">{txt('artist_manager')}</Field>
            <Field label="Manager Phone">{txt('manager_phone', { type: 'tel' })}</Field>
            <Field label="Manager Email">{txt('manager_email', { type: 'email' })}</Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tour Manager">{txt('tour_manager')}</Field>
            <Field label="Tour Manager Phone">{txt('tour_manager_phone', { type: 'tel' })}</Field>
            <Field label="Tour Manager Email">{txt('tour_manager_email', { type: 'email' })}</Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Production Manager">{txt('production_manager')}</Field>
            <Field label="Production Manager Phone">{txt('production_manager_phone', { type: 'tel' })}</Field>
            <Field label="Production Manager Email">{txt('production_manager_email', { type: 'email' })}</Field>
          </div>
        </Section>

        {/* 3. Travel & Accommodation */}
        <Section num={3} title="Travel & Accommodation">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Number in Traveling Party">
              {txt('traveling_party_size', { type: 'number', min: 1, placeholder: '4' })}
            </Field>
            <Field label="Transport Required">
              <select value={rider.transport_required} onChange={e => set('transport_required', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select...</option>
                <option>None</option>
                <option>Flights</option>
                <option>Ground transport</option>
                <option>Flights + ground transport</option>
              </select>
            </Field>
          </div>
          <Field label="Airport Transfers">{txt('airport_transfers', { placeholder: 'e.g. Private car from/to airport required' })}</Field>
          <Field label="Hotel Requirements">
            {area('hotel_requirements', 2, 'e.g. 3 rooms minimum, check-in day before show, checkout day after')}
          </Field>
        </Section>

        {/* 4. Dressing Room */}
        <Section num={4} title="Dressing Room Requirements">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Number of Dressing Rooms">
              {txt('dressing_rooms_count', { type: 'number', min: 1, placeholder: '2' })}
            </Field>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {chk('requires_private_access', 'Private / secure access')}
            {chk('requires_mirrors', 'Full-length mirrors')}
            {chk('requires_clothing_rack', 'Clothing racks')}
            {chk('requires_steamer', 'Steamer / iron')}
            {chk('requires_seating', 'Seating & tables')}
            {chk('requires_wifi', 'Wi-Fi access')}
            {chk('requires_climate_control', 'Climate control')}
          </div>
          <Field label="Additional Notes">{area('dressing_room_notes', 2, 'Clean towels, specific furniture needs, etc.')}</Field>
        </Section>

        {/* 5. Hospitality */}
        <Section num={5} title="Hospitality">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Bottled Water">{txt('bottled_water', { placeholder: 'e.g. 24 x still, 12 x sparkling' })}</Field>
            <Field label="Soft Drinks">{txt('soft_drinks', { placeholder: 'e.g. Assorted sodas, no diet' })}</Field>
            <Field label="Snacks">{txt('snacks', { placeholder: 'e.g. Fruit platter, nuts, chips' })}</Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {chk('coffee_tea', 'Coffee & tea station')}
            {chk('hot_meal', 'Hot meal required')}
          </div>
          {rider.hot_meal && (
            <Field label="Hot Meal Details">
              {area('hot_meal_notes', 2, 'e.g. 4 meals for artist + crew, no pork, served 2 hours before show')}
            </Field>
          )}
          <Field label="Dietary Restrictions / Allergies">
            {area('dietary_restrictions', 2, 'e.g. Vegan, gluten-free, nut allergy')}
          </Field>
        </Section>

        {/* 6. Technical Requirements */}
        <Section num={6} title="Technical Requirements">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Minimum Stage Size">{txt('stage_size_min', { placeholder: 'e.g. 20ft wide x 16ft deep' })}</Field>
            <Field label="Power Requirements">{txt('power_requirements', { placeholder: 'e.g. 2x 20A circuits' })}</Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Sound System">{txt('sound_system', { placeholder: 'e.g. Line array, 3000W minimum' })}</Field>
            <Field label="DJ Setup / Band Backline">{txt('dj_setup', { placeholder: 'e.g. 2x CDJ-3000, DJM-900, or equivalent' })}</Field>
            <Field label="Microphones">{txt('microphones', { placeholder: 'e.g. 2x SM58 handheld, 1x clip-on' })}</Field>
            <Field label="Monitors / In-Ears">{txt('monitors', { placeholder: 'e.g. 4x floor wedges or IEM system' })}</Field>
            <Field label="Lighting">{txt('lighting', { placeholder: 'e.g. Full wash, moving heads, haze machine' })}</Field>
            <Field label="Video / Playback Needs">{txt('video_playback', { placeholder: 'e.g. HDMI input for laptop playback' })}</Field>
          </div>
          <Field label="Additional Technical Notes">{area('technical_notes', 3, 'Stage plot, input list, other details...')}</Field>
        </Section>

        {/* 7. Security */}
        <Section num={7} title="Security">
          <Field label="Backstage Access Control">
            {area('backstage_access_control', 2, 'e.g. Wristband system for artist + crew only, 6 passes needed')}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {chk('crowd_barrier', 'Crowd barrier / barricade required')}
            {chk('stage_escort', 'Escort to and from stage')}
            {chk('meet_greet_security', 'Security for meet & greet')}
          </div>
          <Field label="Additional Security Notes">
            {area('security_notes', 2, 'Other security requirements...')}
          </Field>
        </Section>

        {/* 8. Schedule Defaults */}
        <Section num={8} title="Schedule (Default Times)">
          <p className="text-xs text-gray-500">Set your standard timing preferences — promoters can adjust per event.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Load-In">{txt('load_in_time', { placeholder: 'e.g. 3:00 PM' })}</Field>
            <Field label="Soundcheck">{txt('soundcheck_time', { placeholder: 'e.g. 5:00 PM' })}</Field>
            <Field label="Set Duration">{txt('performance_duration', { placeholder: 'e.g. 75 min' })}</Field>
            <Field label="Load-Out">{txt('load_out_time', { placeholder: 'e.g. 30 min after show' })}</Field>
          </div>
        </Section>

        {/* 9. Merchandising */}
        <Section num={9} title="Merchandising">
          <div className="grid grid-cols-2 gap-3 mb-2">
            {chk('merch_table_required', 'Merch table required')}
          </div>
          {rider.merch_table_required && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Staffing">{txt('merch_staffing', { placeholder: 'e.g. 1 merch person provided by artist' })}</Field>
              <Field label="Settlement Terms">{txt('merch_settlement', { placeholder: 'e.g. Cash settlement at end of night' })}</Field>
              <Field label="Revenue Split %">
                {txt('merch_split_percentage', { type: 'number', min: 0, max: 100, placeholder: 'e.g. 20 (venue takes 20%)' })}
              </Field>
            </div>
          )}
        </Section>

        {/* 10. Special Notes */}
        <Section num={10} title="Special Notes">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Branding Restrictions">
              {area('branding_restrictions', 2, 'e.g. No competing brand logos on stage')}
            </Field>
            <Field label="Photography Policy">
              {area('photography_policy', 2, 'e.g. No photo/video during first 3 songs')}
            </Field>
            <Field label="Recording Policy">
              {area('recording_policy', 2, 'e.g. No recording without written consent')}
            </Field>
            <Field label="Guest List / Comps">
              {area('guest_list_comps', 2, 'e.g. 10 comps for artist, 5 for crew')}
            </Field>
            <Field label="Local Promoter Obligations">
              {area('promoter_obligations', 2, 'e.g. Advance ticket sales minimum, social media promotion')}
            </Field>
          </div>
          <Field label="Any Other Notes">
            {area('special_notes', 3)}
          </Field>
        </Section>

        <div className="flex justify-end pb-6">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Rider'}
          </button>
        </div>
      </form>
    </div>
  )
}
