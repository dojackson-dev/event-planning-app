'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import api from '@/lib/api'

interface AccessStatus {
  stripeConnected: boolean
  planName: string | null
  subscriptionActive: boolean
  daysRemaining: number // days until restriction kicks in (negative = already restricted)
  restricted: boolean
}

export function useStripeAccessStatus(): { accessStatus: AccessStatus | null; loading: boolean } {
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/stripe/connect/owner/status')
      .then((res) => {
        const { status, accountCreatedAt, planName, subscriptionStatus } = res.data
        const stripeConnected = status === 'active'
        const subscriptionActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'

        const createdAt = accountCreatedAt ? new Date(accountCreatedAt) : new Date()
        const ageMs = Date.now() - createdAt.getTime()
        const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24))
        const daysRemaining = 30 - ageDays

        // Restricted: free plan + no active subscription + no Stripe Connect + trial expired
        const restricted = !subscriptionActive && !stripeConnected && daysRemaining < 0

        setAccessStatus({ stripeConnected, planName, subscriptionActive, daysRemaining, restricted })
      })
      .catch(() => setAccessStatus(null))
      .finally(() => setLoading(false))
  }, [])

  return { accessStatus, loading }
}

export default function StripeSetupBanner({ feature }: { feature: string }) {
  const router = useRouter()
  const { accessStatus, loading } = useStripeAccessStatus()

  if (loading || !accessStatus) return null
  if (accessStatus.stripeConnected || accessStatus.subscriptionActive) return null

  const daysRemaining = accessStatus.daysRemaining

  if (daysRemaining >= 0) {
    // Still in trial — show soft warning
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">
            {daysRemaining === 0
              ? 'Your free trial ends today'
              : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left in your free trial`}
          </p>
          <p className="text-sm text-amber-700 mt-0.5">
            Connect Stripe Payments or upgrade your plan to keep using {feature} after your trial ends.
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/billing')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 whitespace-nowrap"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Set Up Payments
        </button>
      </div>
    )
  }

  // Trial expired — show blocking banner
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">
          {feature} requires Stripe Payments or an active plan
        </p>
        <p className="text-sm text-red-700 mt-0.5">
          Your 30-day free trial has ended. Connect Stripe to accept payments, or upgrade your EventEcos plan to restore full access.
        </p>
      </div>
      <button
        onClick={() => router.push('/dashboard/billing')}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 whitespace-nowrap"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Go to Billing
      </button>
    </div>
  )
}
