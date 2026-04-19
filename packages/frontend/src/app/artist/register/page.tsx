'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Mic2, ChevronRight, ChevronLeft } from 'lucide-react'

const ARTIST_TYPES = [
  { value: 'musician', label: 'Musician / Band', icon: '🎵', desc: 'Solo artists, bands, live music' },
  { value: 'dj', label: 'DJ', icon: '🎧', desc: 'Disc jockeys for events & parties' },
  { value: 'comedian', label: 'Comedian', icon: '🎤', desc: 'Stand-up, improv, comedy acts' },
  { value: 'dancer', label: 'Dancer / Dance Group', icon: '💃', desc: 'Dance performances & groups' },
  { value: 'magician', label: 'Magician', icon: '🎩', desc: 'Magic shows & mentalism' },
  { value: 'spoken_word', label: 'Spoken Word', icon: '📖', desc: 'Poetry, storytelling, spoken arts' },
  { value: 'mc_host', label: 'MC / Host', icon: '🎙️', desc: 'Master of ceremonies & hosting' },
  { value: 'other', label: 'Other', icon: '⭐', desc: 'Other performing artists' },
]

type Step = 'account' | 'type' | 'profile'

export default function ArtistRegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('account')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Account
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')

  // Type
  const [artistType, setArtistType] = useState('')

  // Profile
  const [artistName, setArtistName] = useState('')
  const [stageName, setStageName] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [feeMin, setFeeMin] = useState('')
  const [feeMax, setFeeMax] = useState('')
  const [instagram, setInstagram] = useState('')
  const [website, setWebsite] = useState('')

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/flow/vendor/signup', {
        email,
        password,
        firstName,
        lastName,
        phoneNumber: phone || undefined,
        smsOptIn: false,
      })
      const token = res.data?.session?.access_token
      if (token) {
        localStorage.setItem('access_token', token)
        localStorage.setItem('refresh_token', res.data?.session?.refresh_token || '')
        localStorage.setItem('user_role', 'artist')
      }
      setStep('type')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/artists/register', {
        artistName: artistName || `${firstName} ${lastName}`.trim(),
        stageName: stageName || undefined,
        artistType,
        location: location || undefined,
        description: description || undefined,
        performanceFeeMin: feeMin ? Number(feeMin) : undefined,
        performanceFeeMax: feeMax ? Number(feeMax) : undefined,
        instagram: instagram || undefined,
        website: website || undefined,
      })
      router.push('/artist/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Mic2 className="h-7 w-7 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">DoVenueSuite</span>
          </div>
          <p className="text-gray-500 text-sm">Artist Portal — Get discovered by promoters</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['account', 'type', 'profile'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? 'bg-blue-600 text-white' :
                (['account', 'type', 'profile'].indexOf(step) > i) ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-400'
              }`}>{i + 1}</div>
              {i < 2 && <div className="h-px w-8 bg-gray-300" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-5">
              {error}
            </div>
          )}

          {/* Step 1: Account */}
          {step === 'account' && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Create your account</h1>
              <p className="text-gray-500 text-sm mb-6">Step 1 of 3</p>
              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="At least 8 characters" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="(555) 000-0000" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? 'Creating account...' : <><span>Continue</span><ChevronRight className="h-4 w-4" /></>}
                </button>
              </form>
            </>
          )}

          {/* Step 2: Artist type */}
          {step === 'type' && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">What type of artist are you?</h1>
              <p className="text-gray-500 text-sm mb-6">Step 2 of 3 — Select all that apply</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {ARTIST_TYPES.map(type => (
                  <button key={type.value} onClick={() => setArtistType(type.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-colors ${
                      artistType === type.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <div className="text-xl mb-1">{type.icon}</div>
                    <div className="text-sm font-semibold text-gray-900">{type.label}</div>
                    <div className="text-xs text-gray-500">{type.desc}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('account')}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 flex items-center justify-center gap-1">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <button onClick={() => { if (artistType) setStep('profile') }} disabled={!artistType}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center gap-1">
                  Continue <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          {/* Step 3: Profile */}
          {step === 'profile' && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Build your profile</h1>
              <p className="text-gray-500 text-sm mb-6">Step 3 of 3 — You can edit this later</p>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Artist / Band Name *</label>
                  <input type="text" value={artistName} onChange={e => setArtistName(e.target.value)} required
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. The Midnight Jazz Quartet" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stage Name (optional)</label>
                  <input type="text" value={stageName} onChange={e => setStageName(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. DJ Blaze" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City, State</label>
                  <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Atlanta, GA" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Tell promoters about yourself..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fee Min ($)</label>
                    <input type="number" value={feeMin} onChange={e => setFeeMin(e.target.value)} min="0"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fee Max ($)</label>
                    <input type="number" value={feeMax} onChange={e => setFeeMax(e.target.value)} min="0"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="2000" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                  <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="@yourhandle" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://yoursite.com" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep('type')}
                    className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 flex items-center justify-center gap-1">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50">
                    {loading ? 'Creating...' : 'Create Profile'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/artist/login" className="text-blue-600 font-semibold hover:text-blue-700">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
