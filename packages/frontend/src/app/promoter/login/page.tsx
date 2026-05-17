'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { Megaphone, Loader2 } from 'lucide-react'

export default function PromoterLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  // Password update state (triggered by recovery link)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)

  useEffect(() => {
    // Supabase appends #access_token=...&type=recovery to the redirect URL
    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      const params = new URLSearchParams(hash.replace('#', ''))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token') || ''
      if (accessToken) {
        // Set the session in Supabase client so updateUser works
        const supabase = createClient()
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        setRecoveryMode(true)
        // Clear the hash so it's not re-processed on refresh
        window.history.replaceState(null, '', window.location.pathname)
      }
    }
  }, [])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setUpdateLoading(true); setError('')
    try {
      const supabase = createClient()
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
      if (updateErr) throw updateErr
      setUpdateSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true); setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/promoter/login`,
      })
      if (error) throw error
      setResetSent(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email')
    } finally {
      setResetLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await api.post('/auth/flow/unified/login', { email, password })
      const token = res.data?.session?.access_token
      const roles = res.data?.roles || []
      
      if (token) {
        localStorage.setItem('access_token', token)
        localStorage.setItem('refresh_token', res.data?.session?.refresh_token || res.data?.refresh_token || '')
        localStorage.setItem('user', JSON.stringify(res.data.user))
        localStorage.setItem('user_roles', JSON.stringify(roles))
        
        // Check if user has promoter role
        if (!roles.includes('promoter')) {
          setError('This account does not have promoter access. Please use a promoter account.')
          setLoading(false)
          return
        }
        
        localStorage.setItem('active_role', 'promoter')
        localStorage.setItem('user_role', 'promoter')
      }
      
      // Full page navigation so AuthContext re-initializes from localStorage
      window.location.href = '/dashboard/promoter'
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password')
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
          <Link href="/" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-purple-600 mt-1">
            ← Back to Home
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {recoveryMode ? (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Set New Password</h2>
              <p className="text-gray-500 text-sm mb-6">Choose a new password for your promoter account.</p>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-5">{error}</div>
              )}
              {updateSuccess ? (
                <div className="text-center py-4 space-y-4">
                  <p className="text-green-600 font-medium text-sm">✅ Password updated! You can now sign in.</p>
                  <button
                    onClick={() => { setRecoveryMode(false); setUpdateSuccess(false) }}
                    className="w-full bg-purple-600 text-white font-semibold py-3 rounded-xl hover:bg-purple-700 transition-colors"
                  >
                    Go to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
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
                  <button type="submit" disabled={updateLoading}
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-3 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-60">
                    {updateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Set Password
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome back</h2>
              <p className="text-gray-500 text-sm mb-6">Sign in to your promoter account</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-5">{error}</div>
          )}

          {forgotMode ? (
            resetSent ? (
              <div className="text-center py-4">
                <p className="text-green-600 font-medium text-sm">Password reset email sent! Check your inbox.</p>
                <button onClick={() => { setForgotMode(false); setResetSent(false) }} className="text-purple-600 text-sm mt-4 hover:underline">Back to sign in</button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-gray-500 mb-2">Enter your email and we'll send a reset link.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="your@email.com" />
                </div>
                <button type="submit" disabled={resetLoading}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-3 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-60">
                  {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Send Reset Link
                </button>
                <button type="button" onClick={() => setForgotMode(false)} className="w-full text-sm text-gray-500 hover:underline">Back to sign in</button>
              </form>
            )
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="your@email.com" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-purple-600 hover:underline">Forgot password?</button>
                  </div>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="••••••••" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-3 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-60 mt-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Sign In
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-5">
                No account?{' '}
                <Link href="/promoter/register" className="text-purple-600 font-medium hover:underline">Create one</Link>
              </p>
            </>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
