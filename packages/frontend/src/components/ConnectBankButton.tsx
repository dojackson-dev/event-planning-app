'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { ExternalLink, CheckCircle, AlertCircle, Loader2, Building2 } from 'lucide-react'

interface ConnectBankButtonProps {
  role: 'owner' | 'vendor'
  email: string
}

type ConnectStatus = 'not_connected' | 'pending' | 'active' | null

export default function ConnectBankButton({ role, email }: ConnectBankButtonProps) {
  const [status, setStatus] = useState<ConnectStatus>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [successBanner, setSuccessBanner] = useState(false)

  useEffect(() => {
    // Read ?connect=success or ?connect=refresh without requiring Suspense
    const params = new URLSearchParams(window.location.search)
    if (params.get('connect') === 'success') {
      setSuccessBanner(true)
    }
    loadStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  const loadStatus = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/stripe/connect/${role}/status`)
      setStatus(res.data.status)
    } catch (err) {
      console.error('Failed to load connect status', err)
      setStatus('not_connected')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    setConnecting(true)
    setError('')
    try {
      const res = await api.post(`/stripe/connect/${role}`, { email })
      window.location.href = res.data.url
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to start bank connection. Please try again.',
      )
      setConnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking connection status…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Return banner after Stripe onboarding */}
      {successBanner && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">Bank account connected!</p>
            <p className="text-sm text-green-700 mt-0.5">
              Stripe is reviewing your information. Payouts will be enabled once your
              account is fully verified (usually within minutes).
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ACTIVE — fully onboarded */}
      {status === 'active' && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">✓ Payouts Active</p>
            <p className="text-sm text-green-700 mt-0.5">
              Your bank account is connected. You can receive payments directly.
            </p>
          </div>
        </div>
      )}

      {/* PENDING — Express account created but onboarding incomplete */}
      {status === 'pending' && (
        <div className="space-y-3">
          <div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
              ⏳ Setup Incomplete
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Your Stripe account was created but setup is not complete. Please finish
            connecting your bank account to receive payments.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {connecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            {connecting ? 'Redirecting…' : 'Continue Setup on Stripe'}
          </button>
        </div>
      )}

      {/* NOT CONNECTED */}
      {status === 'not_connected' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Connect your bank account through Stripe to receive payments from clients
            and pay vendors. Setup is secure, fast, and handled entirely by Stripe.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {connecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
            {connecting ? 'Redirecting to Stripe…' : 'Connect Bank Account'}
          </button>
        </div>
      )}
    </div>
  )
}
