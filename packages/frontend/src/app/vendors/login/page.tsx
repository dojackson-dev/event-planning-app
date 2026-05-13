'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'

export default function VendorLogin() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true); setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/vendors/login`,
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
    setLoading(true)
    setError('')
    try {
      // Use the unified AuthContext login — it calls /auth/flow/unified/login,
      // which handles all role types and multi-role routing automatically.
      await login({ email, password })
      // AuthContext.login() handles navigation (vendor-portal, /choose-role, etc.)
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Invalid email or password'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-primary-600 font-bold text-2xl">EventEcos</Link>
          <p className="text-gray-500 text-sm mt-1">Vendor Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-6">Sign in to your vendor account</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-5">
              {error}
            </div>
          )}

          {forgotMode ? (
            resetSent ? (
              <div className="text-center py-4">
                <p className="text-green-600 font-medium text-sm">Password reset email sent! Check your inbox.</p>
                <button onClick={() => { setForgotMode(false); setResetSent(false) }} className="text-primary-600 text-sm mt-4 hover:underline">Back to sign in</button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-gray-500">Enter your email and we'll send a reset link.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="your@email.com" />
                </div>
                <button type="submit" disabled={resetLoading}
                  className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary-700 transition-colors disabled:opacity-50">
                  {resetLoading ? 'Sending…' : 'Send Reset Link'}
                </button>
                <button type="button" onClick={() => setForgotMode(false)} className="w-full text-sm text-gray-500 hover:underline">Back to sign in</button>
              </form>
            )
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-primary-600 hover:underline">Forgot password?</button>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary-700 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link href="/vendors/register" className="text-primary-600 font-semibold hover:text-primary-700">
              Register for free
            </Link>
          </div>

          <div className="mt-3 text-center">
            <Link href="/vendors" className="text-sm text-gray-400 hover:text-gray-600">
              ← Browse vendor directory
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Are you a venue owner?{' '}
          <Link href="/login" className="text-primary-500 hover:text-primary-600">Sign in here</Link>
          {' '}— or use this page (same login, all roles welcome).
        </p>
      </div>
    </div>
  )
}
