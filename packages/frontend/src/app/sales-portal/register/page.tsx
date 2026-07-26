'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'

export default function SalesPortalRegister() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [phone,     setPhone]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')

  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Invite token state
  const [token,        setToken]        = useState<string | null>(null)
  const [tokenValid,   setTokenValid]   = useState<boolean | null>(null)
  const [tokenReason,  setTokenReason]  = useState('')
  const [validatingToken, setValidatingToken] = useState(true)

  // Validate token on mount
  useEffect(() => {
    const t = searchParams.get('token')
    if (!t) {
      setTokenValid(false)
      setTokenReason('No invite link found. Please use the link from your invitation email.')
      setValidatingToken(false)
      return
    }
    setToken(t)
    api.get(`/affiliates/invite/validate?token=${t}`)
      .then(res => {
        if (res.data.valid) {
          setTokenValid(true)
          setEmail(res.data.email ?? '')
        } else {
          setTokenValid(false)
          setTokenReason(res.data.reason || 'Invalid invite link')
        }
      })
      .catch(() => {
        setTokenValid(false)
        setTokenReason('Could not validate invite link. Please try again.')
      })
      .finally(() => setValidatingToken(false))
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      await api.post('/affiliates/register', {
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        password,
        inviteToken: token,
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Loading state while validating token ────────────────────────────────
  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4">
        <p className="text-gray-500 text-sm animate-pulse">Verifying your invite…</p>
      </div>
    )
  }

  // ── Invalid token ────────────────────────────────────────────────────────
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm border border-gray-200 p-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invite Not Valid</h2>
          <p className="text-gray-500 mb-6">{tokenReason}</p>
          <p className="text-sm text-gray-400">
            Contact <a href="mailto:sales@eventecos.com" className="text-indigo-600 underline">sales@eventecos.com</a> to request a new invite.
          </p>
        </div>
      </div>
    )
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm border border-gray-200 p-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h2>
          <p className="text-gray-500 mb-6">
            Check your email to confirm your address, then log in to access your dashboard.
          </p>
          <Link
            href="/sales-portal/login"
            className="inline-block py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white py-12 px-4">
      <div className="max-w-md w-full space-y-8">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
            <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Become an Affiliate</h1>
          <p className="mt-2 text-gray-500 max-w-sm mx-auto">
            Earn 50% on conversions + 3% recurring for up to 3 years on every owner you refer.
          </p>
        </div>

        {/* Perk pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {['50% conversion bonus', '3% recurring revenue', 'Up to 3-year window', 'Real-time dashboard'].map(p => (
            <span key={p} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
              {p}
            </span>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input
                  type="text" required
                  value={firstName} onChange={e => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Jane"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input
                  type="text" required
                  value={lastName} onChange={e => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Smith"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email" required autoComplete="email"
                value={email}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-400">Locked to your invite email</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password" required autoComplete="new-password"
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
              <input
                type="password" required autoComplete="new-password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60
                         text-white font-semibold rounded-lg transition-colors text-sm mt-2"
            >
              {loading ? 'Creating account…' : 'Create Affiliate Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/sales-portal/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}


export default function SalesPortalRegister() {
  const router = useRouter()

  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [phone,     setPhone]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')

  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      await api.post('/affiliates/register', {
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        password,
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm border border-gray-200 p-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h2>
          <p className="text-gray-500 mb-6">
            Check your email to confirm your address, then log in to access your dashboard.
          </p>
          <Link
            href="/sales-portal/login"
            className="inline-block py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white py-12 px-4">
      <div className="max-w-md w-full space-y-8">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
            <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Become an Affiliate</h1>
          <p className="mt-2 text-gray-500 max-w-sm mx-auto">
            Earn 50% on conversions + 3% recurring for up to 3 years on every owner you refer.
          </p>
        </div>

        {/* Perk pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {['50% conversion bonus', '3% recurring revenue', 'Up to 3-year window', 'Real-time dashboard'].map(p => (
            <span key={p} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
              {p}
            </span>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input
                  type="text" required
                  value={firstName} onChange={e => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Jane"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input
                  type="text" required
                  value={lastName} onChange={e => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Smith"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password" required autoComplete="new-password"
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
              <input
                type="password" required autoComplete="new-password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60
                         text-white font-semibold rounded-lg transition-colors text-sm mt-2"
            >
              {loading ? 'Creating account…' : 'Create Affiliate Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/sales-portal/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
