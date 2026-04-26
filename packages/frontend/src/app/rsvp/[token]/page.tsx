'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import {
  CheckCircle2, XCircle, Calendar, MapPin, Loader2, Users,
  UtensilsCrossed, ShieldCheck, PartyPopper,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface InviteData {
  guest_name: string
  status: string
  plus_ones: number
  meal_preference: string
  table_assignment: string | null
  responded_at: string | null
  requires_phone_verify: boolean
  event: {
    name: string | null
    date: string | null
    start_time: string | null
    venue: string | null
    host_name: string
    event_type: string | null
  }
}

const MEAL_OPTIONS = [
  { value: 'standard',     label: '🍽️ Standard' },
  { value: 'vegetarian',   label: '🥦 Vegetarian' },
  { value: 'vegan',        label: '🌱 Vegan' },
  { value: 'gluten_free',  label: '🌾 Gluten-Free' },
  { value: 'kosher',       label: '✡️ Kosher' },
]

export default function PublicRsvpPage() {
  const params = useParams()
  const token = params.token as string

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Phone verify step
  const [phoneLast4, setPhoneLast4] = useState('')
  const [verified, setVerified] = useState(false)

  // Response form
  const [attending, setAttending] = useState<boolean | null>(null)
  const [plusOnes, setPlusOnes] = useState(0)
  const [meal, setMeal] = useState('standard')
  const [smsOptIn, setSmsOptIn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get(`${API}/rsvp/${token}`)
      .then(res => {
        setInvite(res.data)
        // If already responded, skip to done view
        if (res.data.status !== 'pending') {
          setAttending(res.data.status === 'attending')
          setPlusOnes(res.data.plus_ones ?? 0)
          setMeal(res.data.meal_preference ?? 'standard')
          if (!res.data.requires_phone_verify) setVerified(true)
        } else {
          if (!res.data.requires_phone_verify) setVerified(true)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault()
    if (phoneLast4.replace(/\D/g, '').length !== 4) {
      setError('Please enter exactly 4 digits.')
      return
    }
    setVerified(true)
    setError('')
  }

  const handleSubmit = async (choice: 'attending' | 'declined') => {
    setSubmitting(true)
    setError('')
    try {
      await axios.post(`${API}/rsvp/${token}/respond`, {
        status: choice,
        phone_last_four: invite?.requires_phone_verify ? phoneLast4 : undefined,
        plus_ones: choice === 'attending' ? plusOnes : 0,
        meal_preference: choice === 'attending' ? meal : undefined,
        sms_opt_in: choice === 'attending' ? smsOptIn : false,
      })
      setAttending(choice === 'attending')
      setSubmitted(true)
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Something went wrong. Please try again.'
      setError(msg)
      // If phone verification failed, reset verified state
      if (err?.response?.status === 401 || err?.response?.status === 400) {
        setVerified(false)
        setPhoneLast4('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── States ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (notFound || !invite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm text-center">
          <XCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-800">Invitation Not Found</h1>
          <p className="text-gray-500 text-sm mt-2">This RSVP link may have expired or is invalid.</p>
        </div>
      </div>
    )
  }

  const ev = invite.event
  const formattedDate = ev.date
    ? new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null

  // ── Success / already responded ──────────────────────────────────────────
  if (submitted || (invite.status !== 'pending' && verified)) {
    const isAttending = submitted ? attending : invite.status === 'attending'
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          {isAttending ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <PartyPopper className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">You're In! 🎉</h1>
              <p className="text-gray-600">
                <strong>{invite.guest_name}</strong>, your RSVP is confirmed.
                {plusOnes > 0 && ` (+${plusOnes} guest${plusOnes > 1 ? 's' : ''})`}
              </p>
              {invite.table_assignment && (
                <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-indigo-800">Your Table Assignment</p>
                  <p className="text-2xl font-bold text-indigo-900 mt-1">{invite.table_assignment}</p>
                </div>
              )}
              {ev.name && (
                <div className="mt-4 bg-gray-50 rounded-xl p-4 text-left text-sm space-y-1">
                  {ev.name && <p className="font-semibold text-gray-800">{ev.name}</p>}
                  {formattedDate && <p className="text-gray-500 flex items-center gap-1.5"><Calendar className="h-4 w-4"/>{formattedDate}</p>}
                  {ev.start_time && <p className="text-gray-500">🕐 {ev.start_time}</p>}
                  {ev.venue && <p className="text-gray-500 flex items-center gap-1.5"><MapPin className="h-4 w-4"/>{ev.venue}</p>}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-gray-400" />
              </div>
              <h1 className="text-xl font-bold text-gray-800 mb-2">RSVP Received</h1>
              <p className="text-gray-500">
                <strong>{invite.guest_name}</strong>, we've noted that you won't be able to make it.
                Thanks for letting us know!
              </p>
            </>
          )}
          <p className="text-xs text-gray-400 mt-6">Sent by {ev.host_name} via DoVenue Suites</p>
        </div>
      </div>
    )
  }

  // ── Phone verify step ────────────────────────────────────────────────────
  if (invite.requires_phone_verify && !verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="h-7 w-7 text-indigo-600" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Verify Your Identity</h1>
            <p className="text-sm text-gray-500 mt-2">
              To confirm this is you, please enter the <strong>last 4 digits</strong> of the phone number your invitation was sent to.
            </p>
          </div>

          {ev.name && (
            <div className="bg-gray-50 rounded-xl p-3 mb-5 text-center">
              <p className="font-semibold text-gray-800 text-sm">{ev.name}</p>
              {formattedDate && <p className="text-xs text-gray-500 mt-0.5">{formattedDate}</p>}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Last 4 digits of your phone</label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={phoneLast4}
                onChange={e => setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="_ _ _ _"
                autoFocus
                className="w-full text-center text-2xl tracking-[0.5em] font-mono px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <button
              type="submit"
              disabled={phoneLast4.length !== 4}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── RSVP form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl px-6 py-6 text-white text-center">
          <p className="text-sm text-indigo-200 mb-1">You're invited!</p>
          <h1 className="text-xl font-bold">{ev.name ?? 'You\'re Invited!'}</h1>
          {formattedDate && (
            <p className="text-sm text-indigo-200 mt-1 flex items-center justify-center gap-1.5">
              <Calendar className="h-4 w-4" />{formattedDate}
              {ev.start_time && ` at ${ev.start_time}`}
            </p>
          )}
          {ev.venue && (
            <p className="text-sm text-indigo-200 mt-1 flex items-center justify-center gap-1.5">
              <MapPin className="h-4 w-4" />{ev.venue}
            </p>
          )}
        </div>

        <div className="p-6 space-y-5">
          <p className="text-center text-gray-700 font-medium">
            Hi <strong>{invite.guest_name}</strong>! Will you be attending?
          </p>

          {/* Attend / Decline buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setAttending(true)}
              className={`py-3 rounded-xl font-semibold text-sm border-2 transition-all ${
                attending === true
                  ? 'bg-green-600 border-green-600 text-white shadow-md'
                  : 'border-gray-200 text-gray-700 hover:border-green-400 hover:bg-green-50'
              }`}
            >
              ✅ Yes, I'll be there!
            </button>
            <button
              onClick={() => setAttending(false)}
              className={`py-3 rounded-xl font-semibold text-sm border-2 transition-all ${
                attending === false
                  ? 'bg-gray-500 border-gray-500 text-white shadow-md'
                  : 'border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              ❌ Sorry, can't make it
            </button>
          </div>

          {/* Attending options */}
          {attending === true && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
              {/* Plus ones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-gray-400" /> Additional guests
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPlusOnes(Math.max(0, plusOnes - 1))}
                    className="w-9 h-9 rounded-full border-2 border-gray-200 text-gray-700 font-bold hover:border-gray-400 flex items-center justify-center"
                  >−</button>
                  <span className="text-lg font-bold text-gray-900 w-8 text-center">{plusOnes}</span>
                  <button
                    onClick={() => setPlusOnes(Math.min(10, plusOnes + 1))}
                    className="w-9 h-9 rounded-full border-2 border-gray-200 text-gray-700 font-bold hover:border-gray-400 flex items-center justify-center"
                  >+</button>
                  <span className="text-sm text-gray-500">
                    {plusOnes === 0 ? 'Just me' : `me + ${plusOnes}`}
                  </span>
                </div>
              </div>

              {/* Meal preference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <UtensilsCrossed className="h-4 w-4 text-gray-400" /> Meal preference
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {MEAL_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setMeal(opt.value)}
                      className={`py-2 px-3 rounded-lg text-sm border-2 text-left transition-all ${
                        meal === opt.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800 font-medium'
                          : 'border-gray-200 text-gray-700 hover:border-indigo-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table assignment (read-only) */}
              {invite.table_assignment && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide">Your Table</p>
                  <p className="text-lg font-bold text-indigo-900 mt-0.5">{invite.table_assignment}</p>
                </div>
              )}

              {/* SMS opt-in */}
              {invite.event.host_name && (
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={smsOptIn}
                    onChange={e => setSmsOptIn(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-600">
                    Send me SMS reminders about this event from <strong>{invite.event.host_name}</strong>
                  </span>
                </label>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          {attending !== null && (
            <button
              onClick={() => handleSubmit(attending ? 'attending' : 'declined')}
              disabled={submitting}
              className={`w-full py-3.5 font-bold rounded-xl text-white flex items-center justify-center gap-2 transition-all ${
                attending
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-500 hover:bg-gray-600'
              } disabled:opacity-60`}
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</>
                : attending
                ? <><CheckCircle2 className="h-4 w-4" />Confirm RSVP</>
                : <><XCircle className="h-4 w-4" />Decline Invitation</>
              }
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          Hosted by <strong>{ev.host_name}</strong> · Powered by DoVenue Suites
        </p>
      </div>
    </div>
  )
}
