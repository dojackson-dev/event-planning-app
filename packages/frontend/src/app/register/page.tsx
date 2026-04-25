'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import PhoneInput from '@/components/PhoneInput'

// Separated so useSearchParams is inside a Suspense boundary
function ReferralCapture({ onCode }: { onCode: (code: string) => void }) {
  const searchParams = useSearchParams()
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) onCode(ref)
  }, [searchParams, onCode])
  return null
}

export default function RegisterPage() {
  const router = useRouter()

  // Capture affiliate referral code from ?ref= query param (set by <ReferralCapture>)
  const [referralCode, setReferralCode] = useState<string | null>(null)

  // ── Personal info ──────────────────────────────────────────
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneCountryDial, setPhoneCountryDial] = useState('+1')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // ── Business info ──────────────────────────────────────────
  const [businessName, setBusinessName] = useState('')

  // ── Venue info ─────────────────────────────────────────────
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [venueCity, setVenueCity] = useState('')
  const [venueState, setVenueState] = useState('')
  const [venueZipCode, setVenueZipCode] = useState('')
  const [venuePhone, setVenuePhone] = useState('')
  const [venueEmail, setVenueEmail] = useState('')
  const [venueCapacity, setVenueCapacity] = useState('')
  const [venueDescription, setVenueDescription] = useState('')

  const [smsOptIn, setSmsOptIn] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/auth/flow/owner/signup', {
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        businessName,
        venueName,
        venueAddress: venueAddress || undefined,
        venueCity: venueCity || undefined,
        venueState: venueState || undefined,
        venueZipCode: venueZipCode || undefined,
        venuePhone: venuePhone || undefined,
        venueEmail: venueEmail || undefined,
        venueCapacity: venueCapacity ? parseInt(venueCapacity, 10) : undefined,
        venueDescription: venueDescription || undefined,
        smsOptIn,
        referralCode: referralCode || undefined,
      })

      // Store session tokens and user so AuthContext loads correctly
      if (res.data.session?.access_token) {
        localStorage.setItem('access_token', res.data.session.access_token)
        localStorage.setItem('refresh_token', res.data.session.refresh_token)
        localStorage.setItem('user_role', 'owner')
        const newUser = {
          id: res.data.userId,
          email,
          firstName,
          lastName,
          phone: phoneNumber,
          role: 'owner',
          roles: ['owner'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        localStorage.setItem('user', JSON.stringify(newUser))
        localStorage.setItem('user_roles', JSON.stringify(['owner']))
        localStorage.setItem('active_role', 'owner')
      }

      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 2500)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Account Created!</h2>
          <p className="text-gray-600">
            Welcome to DoVenueSuite. A verification email has been sent to <strong>{email}</strong>.
          </p>
          <p className="text-sm text-gray-500">Redirecting to your dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Reads ?ref= param without breaking SSR — must be inside Suspense */}
      <Suspense fallback={null}>
        <ReferralCapture onCode={setReferralCode} />
      </Suspense>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            ← Back to Home
          </Link>
          <h2 className="mt-4 text-3xl font-extrabold text-gray-900">Create your venue owner account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Start managing your event venue today. Staff and client accounts are created by invitation only.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-xl p-8 space-y-8">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {referralCode && (
            <div className="rounded-md bg-indigo-50 border border-indigo-200 p-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <p className="text-sm text-indigo-700">
                You were referred by an affiliate partner. Thank you!
              </p>
            </div>
          )}

          {/* ── Section 1: Personal Information ── */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">👤 Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text" required value={firstName} onChange={e => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="you@example.com"
                />
              </div>
              <div className="sm:col-span-2">
                <PhoneInput
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  smsOptIn={smsOptIn}
                  onSmsOptInChange={setSmsOptIn}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Min. 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                <input
                  type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Re-enter password"
                />
              </div>
            </div>
          </div>

          {/* ── Section 2: Business Information ── */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">🏢 Business Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business / Company Name *</label>
              <input
                type="text" required value={businessName} onChange={e => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="ABC Events LLC"
              />
              <p className="mt-1 text-xs text-gray-400">The name of your event planning company or organization.</p>
            </div>
          </div>

          {/* ── Section 3: Venue Information ── */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b">🏛️ Venue Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name *</label>
                <input
                  type="text" required value={venueName} onChange={e => setVenueName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Grand Ballroom Downtown"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <input
                  type="text" value={venueAddress} onChange={e => setVenueAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text" value={venueCity} onChange={e => setVenueCity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Dallas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text" value={venueState} onChange={e => setVenueState(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="TX"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                  <input
                    type="text" value={venueZipCode} onChange={e => setVenueZipCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="75001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <PhoneInput
                    label="Venue Phone"
                    value={venuePhone}
                    onChange={setVenuePhone}
                    hideSmsOptIn
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Venue Email</label>
                  <input
                    type="email" value={venueEmail} onChange={e => setVenueEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="bookings@myvenue.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue Capacity</label>
                <input
                  type="number" value={venueCapacity} onChange={e => setVenueCapacity(e.target.value)} min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. 250 guests"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue Description</label>
                <textarea
                  value={venueDescription} onChange={e => setVenueDescription(e.target.value)} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Describe your venue — amenities, atmosphere, ideal event types…"
                />
              </div>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3 px-4 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating account…' : 'Create Account →'}
          </button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
