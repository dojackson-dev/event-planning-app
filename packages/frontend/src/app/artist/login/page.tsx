'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Mic2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ArtistLogin() {
  const router = useRouter()
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
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/artist/login`,
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
      const res = await api.post('/auth/flow/unified/login', { email, password })
      const token = res.data?.session?.access_token || res.data?.access_token
      const dbUser = res.data?.user
      const roles: string[] = res.data?.roles || ['artist']
      if (token) {
        localStorage.setItem('access_token', token)
        localStorage.setItem('refresh_token', res.data?.session?.refresh_token || res.data?.refresh_token || '')
        localStorage.setItem('user_role', 'artist')
        localStorage.setItem('active_role', 'artist')
        localStorage.setItem('user_roles', JSON.stringify(roles))
      }
      if (dbUser) {
        const userObj = {
          id: dbUser.id,
          email: dbUser.email || email,
          firstName: dbUser.first_name || dbUser.user_metadata?.first_name || '',
          lastName: dbUser.last_name || dbUser.user_metadata?.last_name || '',
          phone: dbUser.phone_number || dbUser.user_metadata?.phone || '',
          role: 'artist',
          roles,
          createdAt: dbUser.created_at || new Date().toISOString(),
          updatedAt: dbUser.updated_at || new Date().toISOString(),
        }
        localStorage.setItem('user', JSON.stringify(userObj))
      }
      router.push('/artist/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Mic2 className="h-7 w-7 text-blue-600" />
            <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-blue-600">EventEcos</Link>
          </div>
          <p className="text-gray-500 text-sm">Artist Portal</p>
          <Link href="/" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 mt-1">
            ← Back to Home
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-6">Sign in to your artist account</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-5">
              {error}
            </div>
          )}

          {forgotMode ? (
            resetSent ? (
              <div className="text-center py-4">
                <p className="text-green-600 font-medium text-sm">Password reset email sent! Check your inbox.</p>
                <button onClick={() => { setForgotMode(false); setResetSent(false) }} className="text-blue-600 text-sm mt-4 hover:underline">Back to sign in</button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-gray-500">Enter your email and we'll send a reset link.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com" />
                </div>
                <button type="submit" disabled={resetLoading}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
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
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-blue-600 hover:underline">Forgot password?</button>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            New artist?{' '}
            <Link href="/artist/register" className="text-blue-600 font-semibold hover:text-blue-700">
              Create a free profile
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Are you a venue owner?{' '}
          <Link href="/login" className="underline hover:text-gray-600">Sign in here</Link>
        </p>
      </div>
    </div>
  )
}
