'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { ExternalLink, CheckCircle, AlertCircle, Loader2, Building2, Info, ToggleLeft, ToggleRight } from 'lucide-react'

interface ConnectBankButtonProps {
  role: 'owner' | 'vendor' | 'artist' | 'promoter'
  email: string
}

type ConnectStatus = 'not_connected' | 'pending' | 'active' | null

export default function ConnectBankButton({ role, email }: ConnectBankButtonProps) {
  const [status, setStatus] = useState<ConnectStatus>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState('')
  const [successBanner, setSuccessBanner] = useState(false)
  const [enableBnpl, setEnableBnpl] = useState(false)
  const [bnplSaving, setBnplSaving] = useState(false)

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
      setEnableBnpl(res.data.enableBnpl ?? false)
    } catch (err) {
      console.error('Failed to load connect status', err)
      setStatus('not_connected')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleBnpl = async (checked: boolean) => {
    setBnplSaving(true)
    try {
      await api.patch(`/stripe/connect/${role}/bnpl`, { enabled: checked })
      setEnableBnpl(checked)
    } catch (err) {
      console.error('Failed to save BNPL preference', err)
    } finally {
      setBnplSaving(false)
    }
  }

  const handleConnect = async () => {
    setConnecting(true)
    setError('')
    try {
      const lsUser = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()
      const lsEmail = lsUser.email || ''
      const resolvedEmail = email || lsEmail
      console.log('[ConnectBank] email prop:', JSON.stringify(email), 'ls email:', JSON.stringify(lsEmail), 'resolved:', JSON.stringify(resolvedEmail))
      if (!resolvedEmail) {
        setError('Could not determine your email. Please log out and log back in.')
        setConnecting(false)
        return
      }
      const res = await api.post(`/stripe/connect/${role}`, { email: resolvedEmail })
      window.location.href = res.data.url
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to start bank connection. Please try again.',
      )
      setConnecting(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('This will disconnect your current Stripe account so you can start fresh. Continue?')) return
    setResetting(true)
    setError('')
    try {
      await api.delete(`/stripe/connect/${role}/reset`)
      setStatus('not_connected')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset. Please try again.')
    } finally {
      setResetting(false)
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
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">✓ Payouts Active</p>
              <p className="text-sm text-green-700 mt-0.5">
                Your bank account is connected. You can receive payments directly.
              </p>
            </div>
          </div>

          {/* BNPL toggle */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Buy Now, Pay Later options</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  Let your clients pay with Afterpay, Klarna, or Affirm. Clients pay nothing extra — you receive the same amount.
                </p>
              </div>
              <button
                onClick={() => handleToggleBnpl(!enableBnpl)}
                disabled={bnplSaving}
                aria-label="Toggle BNPL"
                className="flex-shrink-0 text-gray-400 hover:text-indigo-600 disabled:opacity-50 transition-colors"
              >
                {enableBnpl
                  ? <ToggleRight className="h-8 w-8 text-indigo-600" />
                  : <ToggleLeft className="h-8 w-8" />}
              </button>
            </div>

            {/* Fee disclosure */}
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md p-3">
              <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <strong>Processing fee notice:</strong> Afterpay, Klarna, and Affirm charge <strong>~6%</strong> per transaction (vs. 2.9% + $0.30 for cards). This fee is deducted from your payout by Stripe. ACH Direct Debit charges 0.8% (capped at $5).
              </p>
            </div>
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
          <button
            onClick={handleReset}
            disabled={resetting}
            className="text-xs text-gray-400 hover:text-red-500 underline transition-colors disabled:opacity-50"
          >
            {resetting ? 'Resetting…' : 'Start fresh with a new Stripe account'}
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
          <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-200 rounded-md p-3">
            <Info className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-800">
              Once connected, you can optionally offer <strong>Afterpay, Klarna, Affirm, and ACH Direct Debit</strong> to your clients. BNPL methods carry a <strong>~6% processing fee</strong>; ACH is 0.8% (capped at $5).
            </p>
          </div>
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
