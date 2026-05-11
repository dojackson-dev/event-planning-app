'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmEmailPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    // Get email from localStorage or URL params
    const storedEmail = localStorage.getItem('pending_email')
    setEmail(storedEmail)
  }, [])

  useEffect(() => {
    // Countdown timer for resend
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleResendEmail = async () => {
    if (!email) return

    setResendLoading(true)
    setResendMessage(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) {
        setResendMessage('Error: ' + error.message)
      } else {
        setResendMessage('Confirmation email resent! Check your inbox.')
        setCountdown(60) // 60 second cooldown
      }
    } catch (err: any) {
      setResendMessage('Error: ' + (err.message || 'Failed to resend email'))
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-lg shadow-lg">
        {/* Icon */}
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-100">
          <svg className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Confirm your email</h1>
          <p className="mt-2 text-gray-600">
            We sent a confirmation link to <strong className="text-gray-900">{email}</strong>
          </p>
        </div>

        {/* Instructions */}
        <div className="space-y-3 text-left bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-gray-900">Please follow these steps:</p>
          <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
            <li>Check your email inbox</li>
            <li>Click the confirmation link in the email</li>
            <li>You'll be logged in automatically</li>
          </ol>
        </div>

        {/* Info */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600">💡 Check your spam/junk folder if you don't see it</p>
          <p className="text-sm text-gray-600">⏱️ The link expires in 24 hours</p>
        </div>

        {/* Messages */}
        {resendMessage && (
          <div
            className={`text-sm font-medium p-3 rounded-lg ${
              resendMessage.startsWith('Error')
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-green-50 text-green-800 border border-green-200'
            }`}
          >
            {resendMessage}
          </div>
        )}

        {/* Resend Button */}
        <div>
          <button
            onClick={handleResendEmail}
            disabled={resendLoading || countdown > 0}
            className={`w-full py-2 px-4 font-medium rounded-lg transition ${
              resendLoading || countdown > 0
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {countdown > 0
              ? `Resend email in ${countdown}s`
              : resendLoading
                ? 'Sending...'
                : "Didn't receive? Resend email"}
          </button>
        </div>

        {/* Help Links */}
        <div className="flex gap-2 text-sm justify-center pt-4 border-t">
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Back to login
          </Link>
          <span className="text-gray-400">•</span>
          <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
            Create new account
          </Link>
        </div>
      </div>
    </div>
  )
}
