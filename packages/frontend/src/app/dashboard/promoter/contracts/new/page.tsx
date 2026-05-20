'use client'

import { useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import { ChevronLeft, Upload, FileText, Wand2, Loader2, X, Eye, EyeOff, BookOpen, CheckCircle } from 'lucide-react'

// ── Artist Performance Agreement template generator ───────────────────────────
function generateArtistContract(d: {
  agreementDate: string
  // Promoter
  promoterLegalName: string
  promoterBusinessName: string
  promoterAddress: string
  promoterEmail: string
  promoterPhone: string
  // Artist
  artistLegalName: string
  artistStageName: string
  artistRepresentative: string
  artistAddress: string
  artistEmail: string
  artistPhone: string
  // Event
  eventName: string
  venueName: string
  venueAddress: string
  eventDate: string
  perfStartTime: string
  perfEndTime: string
  setLength: string
  soundcheckTime: string
  doorsOpen: string
  ageRestriction: string
  expectedAttendance: string
  arrivalTime: string
  // Payment
  performanceFee: string
  depositAmount: string
  depositDueDate: string
  balanceDueDate: string
  paymentMethod: string
  // Cancellation
  artistCancelDays: string
  promoterEarlyCancelDays: string
  promoterLateCancelDays: string
  promoterLateCancelPct: string
  // Governing law
  governingState: string
  disputeCounty: string
  // Extras
  exclusivity: 'none' | 'applies'
  exclusivityMiles: string
  exclusivityDaysBefore: string
  exclusivityDaysAfter: string
  merchSplit: 'none' | 'split'
  artistMerchPct: string
  promoterMerchPct: string
}): string {
  const fmt = (v: string, fallback = '___') => v.trim() || fallback

  const exclusivitySection = d.exclusivity === 'applies'
    ? `<p><strong>Exclusivity Applies:</strong> Artist shall not perform publicly within <strong>${fmt(d.exclusivityMiles)}</strong> miles of the venue for <strong>${fmt(d.exclusivityDaysBefore)}</strong> days before and <strong>${fmt(d.exclusivityDaysAfter)}</strong> days after the event without Promoter's written consent.</p>`
    : `<p><strong>No Exclusivity:</strong> Artist may perform at other events before or after this event.</p>`

  const merchSection = d.merchSplit === 'split'
    ? `<p>Artist keeps: <strong>${fmt(d.artistMerchPct)}%</strong> &nbsp;|&nbsp; Venue/Promoter receives: <strong>${fmt(d.promoterMerchPct)}%</strong> &nbsp;|&nbsp; Payment at settlement.</p>`
    : `<p>No merchandise split agreed. Artist shall retain all merchandise revenue.</p>`

  return `<div style="font-family:Georgia,serif;max-width:800px;margin:0 auto;color:#111;line-height:1.8;padding:20px;">

<h1 style="text-align:center;font-size:1.4rem;text-transform:uppercase;letter-spacing:.07em;border-bottom:3px solid #111;padding-bottom:14px;margin-bottom:28px;">Artist Performance Agreement</h1>

<p>This Artist Performance Agreement is entered into as of <strong>${fmt(d.agreementDate)}</strong>, by and between:</p>

<table style="width:100%;border-collapse:collapse;margin:16px 0;">
<tr>
<td style="vertical-align:top;padding:12px 16px;border:1px solid #ddd;width:50%;">
<strong>Promoter</strong><br/>
${fmt(d.promoterLegalName, '[Promoter Legal Name]')}<br/>
${d.promoterBusinessName ? `<em>${d.promoterBusinessName}</em><br/>` : ''}
${fmt(d.promoterAddress, '[Address]')}<br/>
${fmt(d.promoterEmail, '[Email]')}<br/>
${fmt(d.promoterPhone, '[Phone]')}
</td>
<td style="vertical-align:top;padding:12px 16px;border:1px solid #ddd;width:50%;">
<strong>Artist</strong><br/>
${fmt(d.artistLegalName, '[Artist Legal Name]')}${d.artistStageName ? ` (aka <em>${d.artistStageName}</em>)` : ''}<br/>
${d.artistRepresentative ? `Rep: ${d.artistRepresentative}<br/>` : ''}
${fmt(d.artistAddress, '[Address]')}<br/>
${fmt(d.artistEmail, '[Email]')}<br/>
${fmt(d.artistPhone, '[Phone]')}
</td>
</tr>
</table>

<hr style="border:none;border-top:1px solid #ccc;margin:24px 0;"/>

<h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;">1. Event Details</h2>
<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:.9rem;">
<tr><td style="padding:6px 12px;border:1px solid #eee;background:#f9f9f9;width:35%;font-weight:600;">Event Name</td><td style="padding:6px 12px;border:1px solid #eee;">${fmt(d.eventName)}</td></tr>
<tr><td style="padding:6px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Venue</td><td style="padding:6px 12px;border:1px solid #eee;">${fmt(d.venueName)}</td></tr>
<tr><td style="padding:6px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Venue Address</td><td style="padding:6px 12px;border:1px solid #eee;">${fmt(d.venueAddress)}</td></tr>
<tr><td style="padding:6px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Event Date</td><td style="padding:6px 12px;border:1px solid #eee;">${fmt(d.eventDate)}</td></tr>
<tr><td style="padding:6px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Performance Time</td><td style="padding:6px 12px;border:1px solid #eee;">${fmt(d.perfStartTime)} – ${fmt(d.perfEndTime)}</td></tr>
${d.setLength ? `<tr><td style="padding:6px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Set Length</td><td style="padding:6px 12px;border:1px solid #eee;">${d.setLength} minutes</td></tr>` : ''}
${d.soundcheckTime ? `<tr><td style="padding:6px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Soundcheck</td><td style="padding:6px 12px;border:1px solid #eee;">${d.soundcheckTime}</td></tr>` : ''}
${d.doorsOpen ? `<tr><td style="padding:6px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Doors Open</td><td style="padding:6px 12px;border:1px solid #eee;">${d.doorsOpen}</td></tr>` : ''}
${d.ageRestriction ? `<tr><td style="padding:6px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Age Restriction</td><td style="padding:6px 12px;border:1px solid #eee;">${d.ageRestriction}</td></tr>` : ''}
${d.expectedAttendance ? `<tr><td style="padding:6px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Expected Attendance</td><td style="padding:6px 12px;border:1px solid #eee;">${d.expectedAttendance}</td></tr>` : ''}
${d.arrivalTime ? `<tr><td style="padding:6px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Artist Arrival</td><td style="padding:6px 12px;border:1px solid #eee;">${d.arrivalTime}</td></tr>` : ''}
</table>

<h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">2. Artist Compensation</h2>
<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:.9rem;">
<tr><td style="padding:6px 12px;border:1px solid #eee;background:#f9f9f9;width:35%;font-weight:600;">Performance Fee</td><td style="padding:6px 12px;border:1px solid #eee;"><strong>$${fmt(d.performanceFee)}</strong></td></tr>
${d.depositAmount ? `<tr><td style="padding:6px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Deposit</td><td style="padding:6px 12px;border:1px solid #eee;">$${d.depositAmount} due by ${fmt(d.depositDueDate)}</td></tr>` : ''}
${d.depositAmount ? `<tr><td style="padding:6px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Balance</td><td style="padding:6px 12px;border:1px solid #eee;">$${(parseFloat(d.performanceFee || '0') - parseFloat(d.depositAmount || '0')).toFixed(2)} due by ${fmt(d.balanceDueDate)}</td></tr>` : ''}
<tr><td style="padding:6px 12px;border:1px solid #eee;background:#f9f9f9;font-weight:600;">Payment Method</td><td style="padding:6px 12px;border:1px solid #eee;">${fmt(d.paymentMethod)}</td></tr>
</table>
<p style="font-size:.85rem;color:#555;">The deposit shall be non-refundable except as stated in the cancellation sections below. No additional compensation shall be owed unless agreed in writing by both Parties.</p>

<h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">3. Artist Responsibilities</h2>
<p>Artist agrees to appear and perform at the agreed date, time, and location; perform professionally; comply with all venue rules and applicable laws; avoid conduct creating a safety risk; refrain from damaging venue property; and ensure Artist's team, guests, and crew comply with this Agreement. Artist shall not bring unauthorized weapons, illegal substances, or unauthorized personnel into the venue.</p>

<h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">4. Promoter Responsibilities</h2>
<p>Promoter agrees to secure the venue; coordinate event production, ticketing, staffing, and security; pay Artist per this Agreement; provide reasonable access for Artist load-in, soundcheck, and performance; handle event promotion and marketing; and maintain reasonable crowd control and venue safety procedures.</p>

<h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">5. Promotion and Use of Artist Name/Image</h2>
<p>Artist grants Promoter a limited right to use Artist's approved name, stage name, likeness, logo, and approved photos solely to advertise and promote this event. Promoter may not imply Artist endorses any unrelated product, business, political cause, sponsor, or service without Artist's written consent.</p>

<h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">6. Recording, Streaming, and Photography</h2>
<p>Promoter may photograph and record limited portions of the event for promotional recap purposes unless Artist objects in writing before the event. Full performance recording, livestreaming, commercial release, or monetized distribution requires Artist's prior written approval.</p>

<h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">7. Music Licensing</h2>
<p>Promoter and/or Venue shall obtain any required public performance licenses. Artist is responsible for ensuring Artist has the right to perform Artist's own material, backing tracks, and samples.</p>

<h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">8. Cancellation by Artist</h2>
<p>If Artist cancels for any reason other than force majeure, illness, emergency, or Promoter's material breach, Artist shall promptly return any deposit paid. If Artist cancels within <strong>${fmt(d.artistCancelDays)}</strong> days of the event without valid cause, Artist may be responsible for documented, reasonable out-of-pocket costs incurred by Promoter. Artist must notify Promoter immediately in writing if Artist cannot perform.</p>

<h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">9. Cancellation by Promoter</h2>
<p>If Promoter cancels the event without cause:</p>
<ul>
<li>More than <strong>${fmt(d.promoterEarlyCancelDays)}</strong> days before the event: Artist retains the deposit as liquidated damages.</li>
<li>Within <strong>${fmt(d.promoterLateCancelDays)}</strong> days of the event: Promoter shall pay Artist <strong>${fmt(d.promoterLateCancelPct)}%</strong> of the Performance Fee.</li>
<li>Within 24 hours: Promoter shall pay Artist the full Performance Fee, unless cancellation is due to force majeure.</li>
</ul>

<h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">10. Force Majeure</h2>
<p>Neither Party shall be liable for failure to perform due to circumstances beyond reasonable control, including severe weather, natural disaster, fire, power outage, government order, epidemic, war, civil unrest, or venue closure. Parties shall attempt in good faith to reschedule; if impossible, neither Party shall owe further compensation except for amounts already earned.</p>

<h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">11. Independent Contractor</h2>
<p>Artist is an independent contractor and not an employee, partner, agent, or joint venturer of Promoter. Artist is solely responsible for Artist's own taxes, insurance, and business expenses.</p>

<h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">12. Indemnification</h2>
<p>Artist shall indemnify and hold harmless Promoter from claims arising from Artist's negligence, misconduct, breach of this Agreement, or unauthorized use of copyrighted material. Promoter shall indemnify and hold harmless Artist from claims arising from Promoter's negligence, misconduct, or failure to manage the event safely.</p>

<h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">13. Merchandise</h2>
${merchSection}

<h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">14. Exclusivity / Radius Restriction</h2>
${exclusivitySection}

<h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">15. Platform Payment Acknowledgment</h2>
<p>The Parties acknowledge that payments may be processed through <strong>EventEcos</strong> or its third-party payment processor. Any processing fees, platform fees, payout timing, refunds, chargebacks, or payment holds shall be governed by the applicable platform terms. Promoter remains responsible for ensuring Artist is paid according to this Agreement unless the platform expressly assumes payment responsibility in writing.</p>

<h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">16. Dispute Resolution &amp; Governing Law</h2>
<p><strong>Governing Law:</strong> State of <strong>${fmt(d.governingState)}</strong> &nbsp;|&nbsp; <strong>Venue for Disputes:</strong> ${fmt(d.disputeCounty)}, ${fmt(d.governingState)}</p>
<p>Parties agree to first attempt resolution through good-faith negotiation before pursuing other remedies.</p>

<h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">17. Entire Agreement</h2>
<p>This Agreement contains the entire understanding between the Parties and supersedes all prior discussions, emails, negotiations, or verbal agreements. Any changes must be in writing and signed or acknowledged electronically by both Parties.</p>

<hr style="border:none;border-top:2px solid #111;margin:36px 0 24px;"/>

<h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.05em;">Signatures</h2>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
<tr>
<td style="padding:20px;border:1px solid #ddd;width:50%;vertical-align:top;">
<strong>Promoter</strong><br/><br/>
Signature: _______________________________<br/><br/>
Name: ${fmt(d.promoterLegalName, '___________________________')}<br/>
Date: ___________________________________
</td>
<td style="padding:20px;border:1px solid #ddd;width:50%;vertical-align:top;">
<strong>Artist</strong><br/><br/>
Signature: _______________________________<br/><br/>
Name: ${fmt(d.artistLegalName, '___________________________')}<br/>
Date: ___________________________________
</td>
</tr>
</table>

</div>`
}

// ── Form defaults ─────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  agreementDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  promoterLegalName: '', promoterBusinessName: '', promoterAddress: '', promoterEmail: '', promoterPhone: '',
  artistLegalName: '', artistStageName: '', artistRepresentative: '', artistAddress: '', artistEmail: '', artistPhone: '',
  eventName: '', venueName: '', venueAddress: '', eventDate: '', perfStartTime: '', perfEndTime: '',
  setLength: '', soundcheckTime: '', doorsOpen: '', ageRestriction: '', expectedAttendance: '', arrivalTime: '',
  performanceFee: '', depositAmount: '', depositDueDate: '', balanceDueDate: '', paymentMethod: 'Stripe',
  artistCancelDays: '14', promoterEarlyCancelDays: '30', promoterLateCancelDays: '7', promoterLateCancelPct: '50',
  governingState: '', disputeCounty: '',
  exclusivity: 'none' as 'none' | 'applies',
  exclusivityMiles: '50', exclusivityDaysBefore: '3', exclusivityDaysAfter: '3',
  merchSplit: 'none' as 'none' | 'split', artistMerchPct: '85', promoterMerchPct: '15',
}

// ── Input helpers ─────────────────────────────────────────────────────────────
const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-xs font-semibold text-gray-700 mb-1">
    {children}{required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
)

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div>
    <Label required={required}>{label}</Label>
    {children}
  </div>
)

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500'

// ── Main component ────────────────────────────────────────────────────────────
interface BookingOption {
  id: string
  event_name: string
  client_name: string
  client_email: string
  client_phone?: string
  event_date?: string
  event_start_time?: string
  event_end_time?: string
  venue_name?: string
  venue_address?: string
  agreed_amount?: number
  deposit_amount?: number
  artist_accounts?: {
    artist_name: string
    stage_name?: string | null
    booking_email?: string
    booking_phone?: string
  } | null
}

function NewContractContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<'template' | 'upload'>('template')
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    artistLegalName: searchParams.get('artistName') || '',
    artistEmail:     searchParams.get('artistEmail') || '',
    artistPhone:     searchParams.get('artistPhone') || '',
  })
  const [contractTitle, setContractTitle] = useState('Artist Performance Agreement')
  const [previewHtml, setPreviewHtml] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  // Booking picker
  const [bookings, setBookings] = useState<BookingOption[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsLoaded, setBookingsLoaded] = useState(false)
  const [showBookingPicker, setShowBookingPicker] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [bookingSearch, setBookingSearch] = useState('')

  // Upload mode
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const loadBookings = async () => {
    if (bookingsLoaded) { setShowBookingPicker(true); return }
    setBookingsLoading(true)
    try {
      const res = await api.get('/promoter-bookings/mine')
      const active = (res.data as BookingOption[]).filter((b: any) => b.status !== 'cancelled')
      setBookings(active)
      setBookingsLoaded(true)
      setShowBookingPicker(true)
    } catch { /* ignore */ } finally {
      setBookingsLoading(false)
    }
  }

  const applyBooking = (b: BookingOption) => {
    const artistName = b.artist_accounts?.artist_name || b.client_name || ''
    const stageName  = b.artist_accounts?.stage_name || ''
    const email      = b.artist_accounts?.booking_email || b.client_email || ''
    const phone      = b.artist_accounts?.booking_phone || b.client_phone || ''
    // Format event_date from YYYY-MM-DD to readable
    const dateVal = b.event_date || ''
    setForm(f => ({
      ...f,
      artistLegalName: artistName,
      artistStageName: stageName,
      artistEmail: email,
      artistPhone: phone,
      eventName: b.event_name || f.eventName,
      eventDate: dateVal,
      perfStartTime: b.event_start_time || f.perfStartTime,
      perfEndTime: b.event_end_time || f.perfEndTime,
      venueName: b.venue_name || f.venueName,
      venueAddress: b.venue_address || f.venueAddress,
      performanceFee: b.agreed_amount ? String(b.agreed_amount) : f.performanceFee,
      depositAmount: b.deposit_amount ? String(b.deposit_amount) : f.depositAmount,
    }))
    if (artistName) setContractTitle(`Artist Performance Agreement – ${artistName}`)
    setSelectedBookingId(b.id)
    setShowBookingPicker(false)
  }

  const handleGenerate = () => {
    const html = generateArtistContract(form)
    setPreviewHtml(html)
    setShowPreview(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(file.type)) { setUploadError('Only PDF or Word documents are accepted.'); return }
    if (file.size > 10 * 1024 * 1024) { setUploadError('File must be under 10 MB.'); return }
    setUploadError('')
    setUploadFile(file)
  }

  const handleSave = async (sendNow: boolean) => {
    setError('')
    if (mode === 'template') {
      if (!form.artistEmail && !form.artistLegalName) { setError('Artist name or email is required.'); return }
    } else {
      if (!uploadFile) { setError('Please select a file to upload.'); return }
    }

    setSaving(true)
    try {
      let fileUrl: string | undefined
      let fileName: string | undefined
      let fileSize: number | undefined

      if (mode === 'upload' && uploadFile) {
        const fd = new FormData()
        fd.append('file', uploadFile)
        const up = await api.post('/contracts/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        fileUrl = up.data.path
        fileName = up.data.originalname
        fileSize = up.data.size
      }

      const body = mode === 'template' ? (previewHtml || generateArtistContract(form)) : undefined

      const payload: any = {
        title: contractTitle,
        contract_type: mode === 'template' ? 'promoter_template' : 'upload',
        status: 'draft',
        client_name: form.artistLegalName || undefined,
        client_email: form.artistEmail || undefined,
        client_phone: form.artistPhone || undefined,
        body,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        notes: mode === 'template' ? `Event: ${form.eventName} | Fee: $${form.performanceFee}` : undefined,
      }

      const res = await api.post('/contracts', payload)
      const contractId: string = res.data.id

      if (sendNow) {
        await api.post(`/contracts/${contractId}/send`)
      }

      router.push(`/dashboard/promoter/contracts/${contractId}`)
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Failed to save contract')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-4 py-6">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => router.back()} className="text-white/80 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">New Artist Contract</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

        {/* Booking picker */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Pre-fill from a Booking</p>
              <p className="text-xs text-gray-500 mt-0.5">Select an existing booking to auto-populate artist info, event details, and payment fields.</p>
            </div>
            <button
              onClick={loadBookings}
              disabled={bookingsLoading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
            >
              {bookingsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
              {selectedBookingId ? 'Change Booking' : 'Select Booking'}
            </button>
          </div>
          {selectedBookingId && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Booking applied — fields below have been pre-filled. You can still edit any field.
            </div>
          )}

          {/* Dropdown list */}
          {showBookingPicker && bookings.length > 0 && (
            <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-3 border-b border-gray-100 bg-gray-50">
                <input
                  value={bookingSearch}
                  onChange={e => setBookingSearch(e.target.value)}
                  placeholder="Search bookings…"
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {bookings
                  .filter(b => {
                    const q = bookingSearch.toLowerCase()
                    return !q || b.event_name.toLowerCase().includes(q) || (b.client_name || '').toLowerCase().includes(q) || (b.artist_accounts?.artist_name || '').toLowerCase().includes(q)
                  })
                  .map(b => (
                    <button
                      key={b.id}
                      onClick={() => applyBooking(b)}
                      className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors"
                    >
                      <p className="font-medium text-sm text-gray-900">{b.event_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {b.artist_accounts?.artist_name || b.client_name}
                        {b.event_date ? ` · ${new Date(b.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                        {b.venue_name ? ` · ${b.venue_name}` : ''}
                        {b.agreed_amount ? ` · $${Number(b.agreed_amount).toLocaleString()}` : ''}
                      </p>
                    </button>
                  ))
                }
              </div>
              <div className="p-2 border-t border-gray-100 bg-gray-50 text-right">
                <button onClick={() => setShowBookingPicker(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">Close</button>
              </div>
            </div>
          )}
          {showBookingPicker && bookingsLoaded && bookings.length === 0 && (
            <p className="mt-3 text-sm text-gray-500">No active bookings found. Create a booking first or fill in the fields manually.</p>
          )}
        </div>

        {/* Contract title */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <Field label="Contract Title" required>
            <input value={contractTitle} onChange={e => setContractTitle(e.target.value)} className={inputCls} />
          </Field>
        </div>

        {/* Mode selector */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Contract Source</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode('template')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-colors ${mode === 'template' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className={`p-2 rounded-lg ${mode === 'template' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                <Wand2 className={`w-5 h-5 ${mode === 'template' ? 'text-purple-600' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">Standard Template</p>
                <p className="text-xs text-gray-500">Fill in fields — auto-generate a complete Artist Performance Agreement</p>
              </div>
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-colors ${mode === 'upload' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className={`p-2 rounded-lg ${mode === 'upload' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                <Upload className={`w-5 h-5 ${mode === 'upload' ? 'text-purple-600' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">Upload Your Own</p>
                <p className="text-xs text-gray-500">Upload a PDF or Word document you already have</p>
              </div>
            </button>
          </div>
        </div>

        {/* ── UPLOAD MODE ── */}
        {mode === 'upload' && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Artist Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Artist Name"><input value={form.artistLegalName} onChange={e => set('artistLegalName', e.target.value)} className={inputCls} placeholder="Full legal name" /></Field>
              <Field label="Artist Email"><input type="email" value={form.artistEmail} onChange={e => set('artistEmail', e.target.value)} className={inputCls} placeholder="artist@email.com" /></Field>
              <Field label="Artist Phone"><input value={form.artistPhone} onChange={e => set('artistPhone', e.target.value)} className={inputCls} placeholder="+1 555 000 0000" /></Field>
            </div>
            <hr className="border-gray-100" />
            <h3 className="text-sm font-semibold text-gray-700">Upload File</h3>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-colors"
            >
              {uploadFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-purple-500" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-800 text-sm">{uploadFile.name}</p>
                    <p className="text-xs text-gray-500">{(uploadFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setUploadFile(null) }} className="ml-2 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-600">Click to upload PDF or Word document</p>
                  <p className="text-xs text-gray-400 mt-1">Max 10 MB · .pdf, .doc, .docx</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
            {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
          </div>
        )}

        {/* ── TEMPLATE MODE ── */}
        {mode === 'template' && (
          <>
            {/* Artist Info */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Artist Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Artist Legal Name" required><input value={form.artistLegalName} onChange={e => set('artistLegalName', e.target.value)} className={inputCls} placeholder="Full legal name" /></Field>
                <Field label="Stage Name"><input value={form.artistStageName} onChange={e => set('artistStageName', e.target.value)} className={inputCls} placeholder="Stage / performer name" /></Field>
                <Field label="Artist Email" required><input type="email" value={form.artistEmail} onChange={e => set('artistEmail', e.target.value)} className={inputCls} placeholder="artist@email.com" /></Field>
                <Field label="Artist Phone"><input value={form.artistPhone} onChange={e => set('artistPhone', e.target.value)} className={inputCls} placeholder="+1 555 000 0000" /></Field>
                <Field label="Manager / Representative"><input value={form.artistRepresentative} onChange={e => set('artistRepresentative', e.target.value)} className={inputCls} placeholder="Name (if applicable)" /></Field>
                <Field label="Artist Address"><input value={form.artistAddress} onChange={e => set('artistAddress', e.target.value)} className={inputCls} placeholder="City, State" /></Field>
              </div>
            </div>

            {/* Promoter Info */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Your (Promoter) Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Your Legal Name"><input value={form.promoterLegalName} onChange={e => set('promoterLegalName', e.target.value)} className={inputCls} placeholder="Your legal name" /></Field>
                <Field label="Business Name"><input value={form.promoterBusinessName} onChange={e => set('promoterBusinessName', e.target.value)} className={inputCls} placeholder="Business / DBA name" /></Field>
                <Field label="Your Email"><input type="email" value={form.promoterEmail} onChange={e => set('promoterEmail', e.target.value)} className={inputCls} /></Field>
                <Field label="Your Phone"><input value={form.promoterPhone} onChange={e => set('promoterPhone', e.target.value)} className={inputCls} /></Field>
                <Field label="Your Address" ><input value={form.promoterAddress} onChange={e => set('promoterAddress', e.target.value)} className={inputCls} placeholder="City, State" /></Field>
              </div>
            </div>

            {/* Event Details */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Event Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Event Name" required><input value={form.eventName} onChange={e => set('eventName', e.target.value)} className={inputCls} placeholder="e.g., Summer Night Live" /></Field>
                <Field label="Event Date"><input type="date" value={form.eventDate} onChange={e => set('eventDate', e.target.value)} className={inputCls} /></Field>
                <Field label="Venue Name"><input value={form.venueName} onChange={e => set('venueName', e.target.value)} className={inputCls} /></Field>
                <Field label="Venue Address"><input value={form.venueAddress} onChange={e => set('venueAddress', e.target.value)} className={inputCls} /></Field>
                <Field label="Performance Start Time"><input type="time" value={form.perfStartTime} onChange={e => set('perfStartTime', e.target.value)} className={inputCls} /></Field>
                <Field label="Performance End Time"><input type="time" value={form.perfEndTime} onChange={e => set('perfEndTime', e.target.value)} className={inputCls} /></Field>
                <Field label="Set Length (minutes)"><input type="number" value={form.setLength} onChange={e => set('setLength', e.target.value)} className={inputCls} placeholder="e.g., 60" /></Field>
                <Field label="Soundcheck Time"><input type="time" value={form.soundcheckTime} onChange={e => set('soundcheckTime', e.target.value)} className={inputCls} /></Field>
                <Field label="Doors Open"><input type="time" value={form.doorsOpen} onChange={e => set('doorsOpen', e.target.value)} className={inputCls} /></Field>
                <Field label="Artist Arrival Time"><input type="time" value={form.arrivalTime} onChange={e => set('arrivalTime', e.target.value)} className={inputCls} /></Field>
                <Field label="Age Restriction">
                  <select value={form.ageRestriction} onChange={e => set('ageRestriction', e.target.value)} className={inputCls}>
                    <option value="">Select...</option>
                    <option>All Ages</option>
                    <option>18+</option>
                    <option>21+</option>
                  </select>
                </Field>
                <Field label="Expected Attendance"><input type="number" value={form.expectedAttendance} onChange={e => set('expectedAttendance', e.target.value)} className={inputCls} placeholder="e.g., 300" /></Field>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Compensation</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Performance Fee ($)" required><input type="number" value={form.performanceFee} onChange={e => set('performanceFee', e.target.value)} className={inputCls} placeholder="0.00" /></Field>
                <Field label="Payment Method">
                  <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} className={inputCls}>
                    <option>Stripe</option>
                    <option>ACH</option>
                    <option>Check</option>
                    <option>Cash</option>
                    <option>Zelle</option>
                    <option>Other</option>
                  </select>
                </Field>
                <Field label="Deposit Amount ($)"><input type="number" value={form.depositAmount} onChange={e => set('depositAmount', e.target.value)} className={inputCls} placeholder="0.00" /></Field>
                <Field label="Deposit Due Date"><input type="date" value={form.depositDueDate} onChange={e => set('depositDueDate', e.target.value)} className={inputCls} /></Field>
                <Field label="Balance Due Date"><input type="date" value={form.balanceDueDate} onChange={e => set('balanceDueDate', e.target.value)} className={inputCls} /></Field>
                <Field label="Agreement Date"><input value={form.agreementDate} onChange={e => set('agreementDate', e.target.value)} className={inputCls} /></Field>
              </div>
            </div>

            {/* Cancellation */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Cancellation Terms</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Artist Cancellation Window (days)"><input type="number" value={form.artistCancelDays} onChange={e => set('artistCancelDays', e.target.value)} className={inputCls} /></Field>
                <Field label="Promoter — Early Cancel Notice (days)"><input type="number" value={form.promoterEarlyCancelDays} onChange={e => set('promoterEarlyCancelDays', e.target.value)} className={inputCls} /></Field>
                <Field label="Promoter — Late Cancel Window (days)"><input type="number" value={form.promoterLateCancelDays} onChange={e => set('promoterLateCancelDays', e.target.value)} className={inputCls} /></Field>
                <Field label="Late Cancel — % of Fee Owed"><input type="number" value={form.promoterLateCancelPct} onChange={e => set('promoterLateCancelPct', e.target.value)} className={inputCls} /></Field>
              </div>
            </div>

            {/* Governing Law */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Governing Law</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Governing State"><input value={form.governingState} onChange={e => set('governingState', e.target.value)} className={inputCls} placeholder="e.g., Florida" /></Field>
                <Field label="Dispute County"><input value={form.disputeCounty} onChange={e => set('disputeCounty', e.target.value)} className={inputCls} placeholder="e.g., Miami-Dade County" /></Field>
              </div>
            </div>

            {/* Options */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Optional Clauses</h3>

              {/* Exclusivity */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Radius Restriction / Exclusivity</p>
                <div className="flex gap-3 mb-3">
                  {(['none', 'applies'] as const).map(v => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="radio" checked={form.exclusivity === v} onChange={() => set('exclusivity', v)} className="text-purple-600" />
                      {v === 'none' ? 'No exclusivity' : 'Exclusivity applies'}
                    </label>
                  ))}
                </div>
                {form.exclusivity === 'applies' && (
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Radius (miles)"><input type="number" value={form.exclusivityMiles} onChange={e => set('exclusivityMiles', e.target.value)} className={inputCls} /></Field>
                    <Field label="Days before event"><input type="number" value={form.exclusivityDaysBefore} onChange={e => set('exclusivityDaysBefore', e.target.value)} className={inputCls} /></Field>
                    <Field label="Days after event"><input type="number" value={form.exclusivityDaysAfter} onChange={e => set('exclusivityDaysAfter', e.target.value)} className={inputCls} /></Field>
                  </div>
                )}
              </div>

              {/* Merch */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Merchandise Split</p>
                <div className="flex gap-3 mb-3">
                  {(['none', 'split'] as const).map(v => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="radio" checked={form.merchSplit === v} onChange={() => set('merchSplit', v)} className="text-purple-600" />
                      {v === 'none' ? 'Artist keeps all merch revenue' : 'Split merch revenue'}
                    </label>
                  ))}
                </div>
                {form.merchSplit === 'split' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Artist % "><input type="number" value={form.artistMerchPct} onChange={e => set('artistMerchPct', e.target.value)} className={inputCls} /></Field>
                    <Field label="Promoter/Venue %"><input type="number" value={form.promoterMerchPct} onChange={e => set('promoterMerchPct', e.target.value)} className={inputCls} /></Field>
                  </div>
                )}
              </div>
            </div>

            {/* Preview toggle */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Contract Preview</p>
                <button
                  onClick={() => { handleGenerate(); }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
                >
                  <Wand2 className="w-4 h-4" />
                  Generate Preview
                </button>
              </div>
              {showPreview && previewHtml ? (
                <>
                  <div className="flex justify-end mb-2">
                    <button onClick={() => setShowPreview(false)} className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600">
                      <EyeOff className="w-3.5 h-3.5" /> Hide
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-auto bg-white text-sm" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  <p className="text-xs text-gray-400 mt-2">This preview shows the generated contract. You can still edit fields above and regenerate.</p>
                </>
              ) : (
                <p className="text-sm text-gray-400">Click "Generate Preview" to see the complete contract based on your filled fields.</p>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end pb-8">
          <button onClick={() => router.back()} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-5 py-2.5 border border-purple-300 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-50 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
            Save as Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
            Save &amp; Send to Artist
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NewPromoterContractPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>}>
      <NewContractContent />
    </Suspense>
  )
}
