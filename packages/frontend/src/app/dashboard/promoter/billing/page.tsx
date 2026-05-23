'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import {
  CheckCircle,
  Zap,
  Star,
  Crown,
  Loader2,
  RefreshCw,
  Ticket,
  DollarSign,
  CreditCard,
} from 'lucide-react'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    icon: Zap,
    iconColor: 'text-gray-500',
    iconBg: 'bg-gray-100',
    description: 'Everything you need to get started',
    features: [
      'Unlimited events & ticket tiers',
      'Stripe Connect payouts',
      '3% ticket sales fee (paid by buyer)',
      '3% direct payment fee',
      'Attendee management',
      'Email ticket delivery',
    ],
    ticketFee: '3%',
    directFee: '3%',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    icon: Star,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-100',
    description: 'For growing promoters and venues',
    features: [
      'Everything in Free',
      '3% ticket sales fee (paid by buyer)',
      '1.5% direct payment fee',
      'Priority support',
      'Advanced analytics',
      'Custom invoice branding',
    ],
    ticketFee: '3%',
    directFee: '1.5%',
    highlight: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 299,
    icon: Crown,
    iconColor: 'text-yellow-600',
    iconBg: 'bg-yellow-100',
    description: 'High-volume operators',
    features: [
      'Everything in Pro',
      '3% ticket sales fee (paid by buyer)',
      '1% direct payment fee',
      'Dedicated account manager',
      'API access',
      'White-label options',
    ],
    ticketFee: '3%',
    directFee: '1%',
    highlight: false,
  },
]

const PLAN_LABELS: Record<string, string> = { free: 'Free', pro: 'Pro', premium: 'Premium' }

export default function PromoterBillingPage() {
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/promoter/profile')
      setCurrentPlan(res.data?.plan ?? 'free')
      setHasSubscription(!!(res.data?.stripe_subscription_id))
    } catch {
      setErrorMsg('Failed to load plan information')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
    // Show success/canceled message from Stripe redirect
    const params = new URLSearchParams(window.location.search)
    if (params.get('subscribed') === 'true') {
      setSuccessMsg('Subscription activated! Your plan will update momentarily.')
    } else if (params.get('canceled') === 'true') {
      setErrorMsg('Checkout canceled — no changes were made.')
    }
  }, [fetchProfile])

  const handleSelectPlan = async (planId: string) => {
    if (planId === currentPlan) return
    setUpdating(planId)
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      if (planId === 'free') {
        // Downgrade: direct PATCH (no payment needed)
        await api.patch('/promoter/plan', { plan: 'free' })
        setCurrentPlan('free')
        setHasSubscription(false)
        setSuccessMsg('Downgraded to Free plan.')
      } else {
        // Upgrade: redirect to Stripe Checkout
        const res = await api.post('/stripe/promoter-checkout', { plan: planId })
        window.location.href = res.data.url
        return // don't clear updating — page is navigating away
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to update plan')
    } finally {
      setUpdating(null)
    }
  }

  const handleBillingPortal = async () => {
    setUpdating('portal')
    try {
      const res = await api.post('/stripe/promoter-billing-portal')
      window.location.href = res.data.url
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to open billing portal')
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Plan & Billing</h1>
        <p className="text-gray-500 mt-1">
          Your plan determines the platform fee on direct payments (invoices).
          Ticket sales fees are always 3% and are passed to the buyer.
        </p>
      </div>

      {/* Current plan banner */}
      {currentPlan && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-purple-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-purple-900">
                Current plan: <span className="capitalize">{PLAN_LABELS[currentPlan]}</span>
                {currentPlan === 'free' ? ' — $0/month' : ` — $${PLANS.find(p => p.id === currentPlan)?.price}/month`}
              </p>
              <p className="text-xs text-purple-700 mt-0.5">
                Direct payment fee:{' '}
                <strong>{PLANS.find(p => p.id === currentPlan)?.directFee}</strong>
              </p>
            </div>
          </div>
          {hasSubscription && (
            <button
              onClick={handleBillingPortal}
              disabled={updating === 'portal'}
              className="text-sm text-purple-700 border border-purple-300 rounded-lg px-3 py-1.5 hover:bg-purple-100 transition-colors flex items-center gap-2 shrink-0"
            >
              {updating === 'portal' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Manage Subscription
            </button>
          )}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-2 text-green-800 text-sm">
          <CheckCircle className="h-4 w-4 shrink-0" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Fee comparison callout */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-purple-500" /> Fee Comparison
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-500 font-medium">Plan</th>
                <th className="text-center py-2 text-gray-500 font-medium">Monthly Fee</th>
                <th className="text-center py-2 text-gray-500 font-medium">
                  <span className="flex items-center justify-center gap-1">
                    <Ticket className="h-3.5 w-3.5" /> Ticket Sales
                  </span>
                </th>
                <th className="text-center py-2 text-gray-500 font-medium">
                  <span className="flex items-center justify-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" /> Direct Payments
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {PLANS.map(plan => (
                <tr
                  key={plan.id}
                  className={`border-b border-gray-50 ${currentPlan === plan.id ? 'bg-purple-50' : ''}`}
                >
                  <td className="py-2.5 font-medium text-gray-800 flex items-center gap-2">
                    {currentPlan === plan.id && (
                      <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                    )}
                    {plan.name}
                  </td>
                  <td className="py-2.5 text-center text-gray-600">
                    {plan.price === 0 ? 'Free' : `$${plan.price}/mo`}
                  </td>
                  <td className="py-2.5 text-center text-gray-500">{plan.ticketFee} (buyer pays)</td>
                  <td className={`py-2.5 text-center font-semibold ${plan.id === 'free' ? 'text-gray-600' : 'text-green-600'}`}>
                    {plan.directFee}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Stripe processing fee (2.9% + $0.30) is always passed through to the buyer on ticket purchases.
        </p>
      </div>

      {/* Plan cards */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose a Plan</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {PLANS.map(plan => {
          const Icon = plan.icon
          const isActive = currentPlan === plan.id
          const isLoading = updating === plan.id

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-xl border-2 p-6 flex flex-col transition-all ${
                isActive
                  ? 'border-purple-500 shadow-md'
                  : plan.highlight
                  ? 'border-purple-200 shadow-sm'
                  : 'border-gray-200'
              }`}
            >
              {plan.highlight && !isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              {isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Current Plan
                  </span>
                </div>
              )}

              <div className="mb-4">
                <div className={`${plan.iconBg} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className={`h-5 w-5 ${plan.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
                <div className="mt-3">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-bold text-gray-900">Free</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                      <span className="text-gray-500 text-sm">/month</span>
                    </>
                  )}
                </div>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isActive || isLoading || updating !== null}
                className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${
                  isActive
                    ? 'bg-purple-100 text-purple-700 cursor-default'
                    : plan.highlight
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isActive ? (
                  <><CheckCircle className="h-4 w-4" /> Current Plan</>
                ) : (
                  plan.price === 0 ? 'Downgrade to Free' : `Upgrade to ${plan.name} — $${plan.price}/mo`
                )}
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Pro and Premium plans are billed monthly via Stripe. Cancel anytime through "Manage Subscription".
        Downgrading to Free takes effect immediately.
      </p>
    </div>
  )
}
