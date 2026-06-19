'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import PhoneInput from '@/components/PhoneInput'

function ArtistSignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [referralCode] = useState<string | null>(searchParams.get('ref'))

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) return setError('Passwords do not match')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        email, password, firstName, lastName, phone: phone || undefined, role: 'artist',
      })
      // Track affiliate referral if present
      if (referralCode && res.data.user?.id) {
        await api.post('/affiliates/track', { referralCode, userId: res.data.user.id }).catch(() => {})
      }
      if (res.data.session?.access_token) {
        localStorage.setItem('access_token', res.data.session.access_token)
        localStorage.setItem('refresh_token', res.data.session.refresh_token)
        localStorage.setItem('user_role', 'artist')
      }
      setSuccess(true)
      setTimeout(() => router.push('/artist/dashboard'), 2500)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-3">
        <div className="mx-auto w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Account Created!</h2>
        <p className="text-gray-500 text-sm">Redirecting to your dashboard…</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <Link href="/register" className="text-sm text-indigo-600 hover:underline">← Back to role selection</Link>
          <div className="mt-4 w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center mx-auto">
            <span className="text-2xl">🎵</span>
          </div>
          <h2 className="mt-3 text-2xl font-extrabold text-gray-900">Create Artist Account</h2>
          <p className="mt-1 text-sm text-gray-500">Book gigs, manage payments and your schedule</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-xl p-8 space-y-5">
          {error && <div className="rounded-md bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-800">{error}</p></div>}
          {referralCode && (
            <div className="rounded-md bg-pink-50 border border-pink-200 p-3 text-sm text-pink-700">
              ✓ Referred by an affiliate partner — code applied automatically.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" placeholder="First" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" placeholder="Last" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" placeholder="you@example.com" /></div>
          <PhoneInput value={phone} onChange={setPhone} hideSmsOptIn />
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" placeholder="Min. 6 characters" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
            <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" placeholder="Re-enter password" /></div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-colors">
            {loading ? 'Creating account…' : 'Create Artist Account →'}
          </button>
          <p className="text-center text-sm text-gray-500">Already have an account? <Link href="/login" className="text-pink-600 hover:underline">Sign in</Link></p>
        </form>
      </div>
    </div>
  )
}

export default function ArtistRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" /></div>}>
      <ArtistSignupForm />
    </Suspense>
  )
}
