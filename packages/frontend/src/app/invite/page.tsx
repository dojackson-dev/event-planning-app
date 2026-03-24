'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import axios from 'axios'
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Phone,
  ArrowLeft,
  Loader2,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface IntakeFormPreview {
  id: string
  contact_name: string
  event_type: string
  event_date: string
  event_time: string | null
  guest_count: number | null
  venue_preference: string | null
  special_requests: string | null
  invite_status: string
  phoneHint: string | null
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: 'Wedding Reception',
  birthday: 'Birthday Party',
  anniversary: 'Anniversary',
  party: 'Private Party',
  corporate: 'Corporate Event',
  conference: 'Conference / Meeting',
  workshop: 'Workshop',
  other: 'Special Event',
}

type Step = 'loading' | 'details' | 'phone' | 'otp' | 'confirmed' | 'declined' | 'error' | 'already-confirmed'

function InvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''

  const [step, setStep] = useState<Step>('loading')
  const [form, setForm] = useState<IntakeFormPreview | null>(null)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [agreedToSms, setAgreedToSms] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [clientToken, setClientToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [devOtp, setDevOtp] = useState<string | null>(null)

  // Load invite details on mount
  useEffect(() => {
    if (!token) {
      setStep('error')
      setError('No invitation token provided.')
      return
    }

    axios.get(`${API_URL}/client-portal/invite/${token}`)
      .then((res) => {
        setForm(res.data)
        if (res.data.invite_status === 'confirmed') {
          setStep('already-confirmed')
        } else {
          setStep('details')
        }
      })
      .catch(() => {
        setStep('error')
        setError('This invitation link is invalid or has expired.')
      })
  }, [token])

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!agreedToSms || !agreedToTerms) {
      setError('Please agree to SMS communications and the Terms of Service to continue.')
      return
    }

    setLoading(true)
    try {
      const res = await axios.post(`${API_URL}/client-portal/auth/request-otp`, {
        phone,
        agreedToSms,
        agreedToTerms,
      })
      if (res.data.devOtp) setDevOtp(res.data.devOtp)
      setStep('otp')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send verification code. Please check your number.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post(`${API_URL}/client-portal/auth/verify-otp`, { phone, code: otp })
      const { token: sessionToken, client } = res.data
      // Store session
      localStorage.setItem('client_token', sessionToken)
      localStorage.setItem('client_session', JSON.stringify(client))
      setClientToken(sessionToken)
      // Move to confirmation step
      setStep('details')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired code.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setError('')
    setLoading(true)
    try {
      await axios.post(
        `${API_URL}/client-portal/invite/${token}/confirm`,
        {},
        { headers: { 'x-client-token': clientToken || localStorage.getItem('client_token') || '' } },
      )
      setStep('confirmed')
      setTimeout(() => router.push('/client-portal/events'), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not confirm your event. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    setError('')
    setLoading(true)
    try {
      await axios.post(
        `${API_URL}/client-portal/invite/${token}/decline`,
        {},
        { headers: { 'x-client-token': clientToken || localStorage.getItem('client_token') || '' } },
      )
      setStep('declined')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not process your response.')
    } finally {
      setLoading(false)
    }
  }

  const isLoggedIn = () => {
    if (clientToken) return true
    if (typeof window !== 'undefined') return !!localStorage.getItem('client_token')
    return false
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/lib/LogoDVS.png" alt="DoVenue Suites" width={200} height={52} className="h-14 w-auto" />
          </Link>
          <Link href="/client-login" className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600">
            <ArrowLeft className="h-4 w-4" />
            Client Portal
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-lg w-full">

          {/* ── Loading ── */}
          {step === 'loading' && (
            <div className="text-center py-20">
              <Loader2 className="h-10 w-10 text-primary-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading your invitation…</p>
            </div>
          )}

          {/* ── Error ── */}
          {step === 'error' && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center">
              <XCircle className="h-14 w-14 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Invitation Not Found</h2>
              <p className="text-gray-500 mb-6">{error}</p>
              <Link href="/client-login" className="inline-block bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700">
                Go to Client Portal
              </Link>
            </div>
          )}

          {/* ── Already Confirmed ── */}
          {step === 'already-confirmed' && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center">
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Event Already Confirmed</h2>
              <p className="text-gray-500 mb-6">
                {form?.contact_name ? `${form.contact_name}, your` : 'Your'} event has already been confirmed.
              </p>
              <Link href="/client-portal/events" className="inline-block bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700">
                View My Events
              </Link>
            </div>
          )}

          {/* ── Event Details + Confirm (if logged in) ── */}
          {(step === 'details') && form && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary-700 to-primary-500 px-8 py-6 text-white text-center">
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                    <Calendar className="h-7 w-7 text-white" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold">You're Invited!</h1>
                <p className="mt-1 text-primary-100 text-sm">Please review your event details and confirm</p>
              </div>

              <div className="px-8 py-7">
                <p className="text-gray-700 text-base mb-5">
                  Hello <strong>{form.contact_name}</strong>, please review the event details below and confirm your attendance.
                </p>

                {/* Event detail card */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Event</p>
                      <p className="font-semibold text-gray-800">
                        {EVENT_TYPE_LABELS[form.event_type] || form.event_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                      <p className="font-semibold text-gray-800">{formatDate(form.event_date)}</p>
                    </div>
                  </div>
                  {form.event_time && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-primary-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Time</p>
                        <p className="font-semibold text-gray-800">{form.event_time}</p>
                      </div>
                    </div>
                  )}
                  {form.guest_count && (
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-primary-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Estimated Guests</p>
                        <p className="font-semibold text-gray-800">{form.guest_count}</p>
                      </div>
                    </div>
                  )}
                  {form.venue_preference && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Venue</p>
                        <p className="font-semibold text-gray-800">{form.venue_preference}</p>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">
                    {error}
                  </div>
                )}

                {isLoggedIn() ? (
                  /* Confirm / Decline buttons */
                  <div className="space-y-3">
                    <button
                      onClick={handleConfirm}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                      Confirm My Event
                    </button>
                    <button
                      onClick={handleDecline}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-xl transition disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      Decline
                    </button>
                  </div>
                ) : (
                  /* Prompt to verify phone */
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-amber-800 text-sm font-medium mb-1">
                      Verify your identity to confirm
                    </p>
                    <p className="text-amber-700 text-sm">
                      {form.phoneHint
                        ? `Enter your phone number ending in ${form.phoneHint.slice(-4)} to receive a verification code.`
                        : 'Enter the phone number associated with this invitation to continue.'}
                    </p>
                    <button
                      onClick={() => setStep('phone')}
                      className="mt-3 w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition text-sm"
                    >
                      Verify via SMS →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Phone Entry ── */}
          {step === 'phone' && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-primary-600 px-8 py-6 text-white text-center">
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                    <ShieldCheck className="h-7 w-7 text-white" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold">Verify Your Phone</h1>
                <p className="mt-1 text-primary-100 text-sm">We'll send a code to confirm your identity</p>
              </div>

              <div className="px-8 py-7">
                {form?.phoneHint && (
                  <p className="text-sm text-gray-600 mb-5">
                    Use the phone number ending in <strong>{form.phoneHint.slice(-4)}</strong> that is on file for this invitation.
                  </p>
                )}

                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(555) 000-0000"
                        required
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToSms}
                      onChange={(e) => setAgreedToSms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600"
                    />
                    <span className="text-xs text-gray-600">
                      I agree to receive SMS verification codes from DoVenue Suites.
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600"
                    />
                    <span className="text-xs text-gray-600">
                      I agree to the{' '}
                      <Link href="/terms-of-service" target="_blank" className="text-primary-600 underline">Terms of Service</Link>
                      {' '}and{' '}
                      <Link href="/privacy-policy" target="_blank" className="text-primary-600 underline">Privacy Policy</Link>.
                    </span>
                  </label>

                  {error && (
                    <p className="text-red-600 text-sm">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Verification Code'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('details')}
                    className="w-full text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← Back to invitation
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── OTP Entry ── */}
          {step === 'otp' && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-primary-600 px-8 py-6 text-white text-center">
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                    <ShieldCheck className="h-7 w-7 text-white" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold">Enter Your Code</h1>
                <p className="mt-1 text-primary-100 text-sm">We sent a 6-digit code to {phone}</p>
              </div>

              <div className="px-8 py-7">
                {devOtp && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-yellow-800 text-sm mb-4">
                    [Dev] OTP: <strong>{devOtp}</strong>
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      required
                      maxLength={6}
                      className="w-full px-4 py-3 text-center text-2xl tracking-[0.4em] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {error && (
                    <p className="text-red-600 text-sm">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify & Continue'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStep('phone'); setOtp('') }}
                    className="w-full text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← Use a different number
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── Confirmed ── */}
          {step === 'confirmed' && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Event Confirmed!</h2>
              <p className="text-gray-500 mb-2">
                Your event has been confirmed. You'll be redirected to your portal shortly.
              </p>
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin mx-auto mt-4" />
            </div>
          )}

          {/* ── Declined ── */}
          {step === 'declined' && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center">
              <XCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Invitation Declined</h2>
              <p className="text-gray-500">
                You've declined this event invitation. If this was a mistake, please contact your event planner to resend the invitation.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default function InvitePageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
      </div>
    }>
      <InvitePage />
    </Suspense>
  )
}
