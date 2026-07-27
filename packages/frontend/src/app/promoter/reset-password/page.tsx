'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Megaphone, Loader2 } from 'lucide-react'

export default function PromoterResetPassword() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)
  const [invalidLink, setInvalidLink] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      const params = new URLSearchParams(hash.replace('#', ''))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token') || ''
      if (accessToken) {
        const supabase = createClient()
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        window.history.replaceState(null, '', window.location.pathname)
        setReady(true)
      } else {
        setInvalidLink(true)
      }
    } else {
      setInvalidLink(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true); setError('')
    try {
      const supabase = createClient()
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
      if (updateErr) throw updateErr
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-600 shadow-lg mb-4">
            <Megaphone className="h-7 w-7 text-white" />
          </div>
          <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-purple-600 block">EventEcos</Link>
          <p className="text-gray-500 text-sm mt-1">Promoter Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {invalidLink ? (
            <div className="text-center space-y-4">
              <p className="text-red-600 font-medium text-sm">This reset link is invalid or has expired.</p>
              <Link href="/promoter/login" className="block w-full text-center bg-purple-600 text-white font-semibold py-3 rounded-xl hover:bg-purple-700 transition-colors">
                Back to Sign In
              </Link>
            </div>
          ) : success ? (
            <div className="text-center space-y-4">
              <p className="text-green-600 font-medium">✅ Password updated!</p>
              <p className="text-sm text-gray-500">You can now sign in with your new password.</p>
              <Link href="/promoter/login" className="block w-full text-center bg-purple-600 text-white font-semibold py-3 rounded-xl hover:bg-purple-700 transition-colors">
                Sign In
              </Link>
            </div>
          ) : ready ? (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Set New Password</h2>
              <p className="text-gray-500 text-sm mb-6">Choose a new password for your promoter account.</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-5">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    required autoFocus minLength={8} autoComplete="new-password"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="At least 8 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    required autoComplete="new-password"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-3 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-60">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Set Password
                </button>
              </form>
            </>
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
