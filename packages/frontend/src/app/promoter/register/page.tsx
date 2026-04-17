'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Megaphone, Loader2 } from 'lucide-react'

export default function PromoterRegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<'account' | 'profile'>('account')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Account
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')

  // Profile
  const [companyName, setCompanyName] = useState('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')
  const [instagram, setInstagram] = useState('')

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await api.post('/auth/flow/vendor/signup', {
        email, password, firstName, lastName,
        phoneNumber: phone || undefined,
        smsOptIn: false,
      })
      const token = res.data?.session?.access_token
      if (token) {
        localStorage.setItem('access_token', token)
        localStorage.setItem('refresh_token', res.data?.session?.refresh_token || '')
        localStorage.setItem('user_role', 'promoter')
      }
      setStep('profile')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await api.post('/promoter/register', {
        contactName: `${firstName} ${lastName}`.trim(),
        email,
        companyName: companyName || undefined,
        phone: phone || undefined,
        location: location || undefined,
        bio: bio || undefined,
        website: website || undefined,
        instagram: instagram || undefined,
      })
      router.push('/dashboard/promoter')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-600 shadow-lg mb-4">
            <Megaphone className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">DoVenueSuite</h1>
          <p className="text-gray-500 text-sm mt-1">Promoter Portal — Create & promote events</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['account', 'profile'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? 'bg-purple-600 text-white' :
                step === 'profile' && i === 0 ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-400'
              }`}>{i + 1}</div>
              {i < 1 && <div className="h-px w-8 bg-gray-300" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-5">{error}</div>
          )}

          {step === 'account' && (
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Create your account</h2>
                <p className="text-sm text-gray-500 mb-5">You'll use this to sign in</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First name *</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} required
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last name *</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} required
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="(optional)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Min. 8 characters" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-3 rounded-xl hover:bg-purple-700 disabled:opacity-60 mt-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Continue
              </button>
              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link href="/promoter/login" className="text-purple-600 font-medium hover:underline">Sign in</Link>
              </p>
            </form>
          )}

          {step === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Set up your promoter profile</h2>
                <p className="text-sm text-gray-500 mb-5">This info will show on your public event listings</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company / Brand Name</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. Vibe Entertainment"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City / Location</label>
                <input value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Atlanta, GA"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                  placeholder="Tell people about you and the events you promote..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                  <input value={instagram} onChange={e => setInstagram(e.target.value)}
                    placeholder="@handle"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input value={website} onChange={e => setWebsite(e.target.value)}
                    placeholder="https://"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-3 rounded-xl hover:bg-purple-700 disabled:opacity-60 mt-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Create Profile
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
