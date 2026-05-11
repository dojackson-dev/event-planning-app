'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Separate component that uses useSearchParams (must be inside Suspense)
function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const next = searchParams.get('next') || '/dashboard'

        // Get the hash fragment which contains the session data
        // Supabase email confirmation redirects with #type=signup&code=...
        if (!code) {
          // No code means the email confirmation was processed on the auth side
          // The session should already be available
          const supabase = createClient()
          const {
            data: { session },
          } = await supabase.auth.getSession()

          if (session) {
            // User is authenticated, redirect to dashboard
            router.push(next)
          } else {
            // No session, redirect to login
            router.push('/login?message=Please+log+in')
          }
          return
        }

        // Exchange the code for a session
        const supabase = createClient()
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          setError(exchangeError.message || 'Failed to verify email. Please try again.')
          return
        }

        // Get the session to confirm it worked
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          // Email verified successfully, redirect to dashboard
          router.push(next)
        } else {
          setError('Email verified but failed to create session. Please log in.')
          router.push('/login')
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    handleCallback()
  }, [searchParams, router])

  return <AuthCallbackUI loading={loading} error={error} />
}

// UI component - no hooks that depend on searchParams
interface AuthCallbackUIProps {
  loading: boolean
  error: string | null
}

function AuthCallbackUI({ loading, error }: AuthCallbackUIProps) {
  return (
    <>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center space-y-4">
            <div className="inline-flex animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <h1 className="text-2xl font-bold text-gray-900">Verifying email...</h1>
            <p className="text-gray-600">Please wait while we confirm your email address.</p>
          </div>
        </div>
      ) : error ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full text-center space-y-4 p-6 bg-white rounded-lg shadow">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Verification Failed</h1>
            <p className="text-gray-600">{error}</p>
            <div className="flex gap-3">
              <a
                href="/login"
                className="flex-1 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition"
              >
                Log In
              </a>
              <a
                href="/signup"
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition"
              >
                Sign Up
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center space-y-4">
            <div className="inline-flex animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <h1 className="text-2xl font-bold text-gray-900">Redirecting...</h1>
          </div>
        </div>
      )}
    </>
  )
}

// Main page component wrapped with Suspense
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center space-y-4">
            <div className="inline-flex animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
