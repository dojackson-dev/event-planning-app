'use client'

/**
 * TrialBanner
 * Shown at the top of the dashboard while the owner is on a free trial.
 * Fetches /owner/trial-status and renders a countdown + upgrade CTA.
 * Hidden once the owner has an active subscription.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Clock, Zap, X } from 'lucide-react'

interface TrialStatus {
  isTrial: boolean
  subscriptionStatus: string
  daysRemaining: number
  trialEndsAt: string | null
}

export default function TrialBanner() {
  const [status, setStatus] = useState<TrialStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    api.get<TrialStatus>('/owner/trial-status')
      .then(r => setStatus(r.data))
      .catch(() => {})
  }, [])

  // Don't show if not a trial, already dismissed this session, or loaded active
  if (!status || !status.isTrial || dismissed) return null

  const { daysRemaining } = status
  const isUrgent = daysRemaining <= 5

  const urgentClass = isUrgent
    ? 'bg-red-600 border-red-700'
    : 'bg-indigo-600 border-indigo-700'

  const label = daysRemaining === 0
    ? 'Your free trial has expired.'
    : daysRemaining === 1
    ? '1 day left on your free trial.'
    : `${daysRemaining} days left on your free trial.`

  return (
    <div className={`relative flex items-center gap-3 px-4 py-3 rounded-xl mb-6 text-white border ${urgentClass}`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isUrgent ? (
          <Zap className="h-4 w-4 flex-shrink-0" />
        ) : (
          <Clock className="h-4 w-4 flex-shrink-0" />
        )}
        <p className="text-sm font-medium truncate">
          {label}{' '}
          <span className="font-normal opacity-90">
            Upgrade to keep all your data and unlock full access.
          </span>
        </p>
      </div>

      <Link
        href="/dashboard/billing"
        className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-white text-indigo-700 hover:bg-indigo-50 transition-colors whitespace-nowrap"
      >
        Upgrade Now →
      </Link>

      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity ml-1"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
