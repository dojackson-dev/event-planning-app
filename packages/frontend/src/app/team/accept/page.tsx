'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Users, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'

interface InviteInfo {
  email: string
  businessName: string
  ownerName: string
  role: string
}

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const token        = searchParams.get('token') ?? ''

  const [info, setInfo]             = useState<InviteInfo | null>(null)
  const [infoError, setInfoError]   = useState<string | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)

  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [password, setPassword]     = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setInfoError('Missing invite token.')
      setLoadingInfo(false)
      return
    }
    api.get(`/team/invite-info/${token}`)
      .then(res => setInfo(res.data))
      .catch(err => setInfoError(err?.response?.data?.message || 'Invalid or expired invite link.'))
      .finally(() => setLoadingInfo(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    try {
      setSubmitting(true)
      const res = await api.post('/team/accept', { token, firstName, lastName, password })
      // Store session
      if (res.data?.session?.access_token) {
        localStorage.setItem('access_token',  res.data.session.access_token)
        if (res.data.session.refresh_token) {
          localStorage.setItem('refresh_token', res.data.session.refresh_token)
        }
      }
      if (res.data?.user)       localStorage.setItem('user',         JSON.stringify(res.data.user))
      if (res.data?.roles)      localStorage.setItem('user_roles',   JSON.stringify(res.data.roles))
      if (res.data?.ownerAccountId) localStorage.setItem('owner_account_id', res.data.ownerAccountId)
      localStorage.setItem('active_role', 'associate')
      localStorage.setItem('user_role',   'associate')
      setSubmitted(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (infoError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invite Not Found</h1>
          <p className="text-gray-500 text-sm">{infoError}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Welcome aboard!</h1>
          <p className="text-gray-500 text-sm">Taking you to the dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 px-8 py-6 text-center">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <Users className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">You've been invited!</h1>
            <p className="text-white/80 text-sm mt-1">Join {info?.businessName}</p>
          </div>

          {/* Body */}
          <div className="px-8 py-6">
            <p className="text-sm text-gray-600 mb-6 text-center">
              <span className="font-medium text-gray-900">{info?.ownerName}</span> has invited{' '}
              <span className="font-medium text-gray-900">{info?.email}</span> to join their team as an{' '}
              <span className="font-medium text-primary-600">{info?.role}</span>.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    required
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    required
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Create a Password</label>
                <div className="relative">
                  <input
                    required
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    minLength={8}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {submitError && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
                  </span>
                ) : (
                  'Accept Invitation'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TeamAcceptPage() {
  return (
    <Suspense>
      <AcceptInviteContent />
    </Suspense>
  )
}
