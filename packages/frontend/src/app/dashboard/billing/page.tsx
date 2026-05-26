'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import {
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  Zap,
  Shield,
  BarChart3,
  RefreshCw,
  Link2,
  XCircle,
} from 'lucide-react'

interface SubscriptionStatus {
  status: string
  planId: string | null
  planName: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  venueLimit: number | null
  teamMemberLimit: number | null
}

interface ConnectStatus {
  status: string
  connectId: string | null
}

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    description: 'Get started with basic event management',
    features: [
      '1 venue',
      '0 included team members',
      'Additional team members at $15/mo each',
      '3% EventEcos fee on all payments',
      'Basic event & client management',
      'Invoicing & intake forms',
      'Stripe processing fees apply',
    ],
    limits: { venues: 1, team: 0 },
    priceId: null,
    highlighted: false,
    cta: 'Current Free Plan',
    ctaDisabled: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    priceLabel: '$149',
    description: 'For growing promoters, venue owners & event businesses',
    features: [
      'Up to 3 venues',
      '3 team members included',
      'Unlimited events & bookings',
      'Client management & intake forms',
      'Invoicing & online payments',
      'Contracts & e-signatures',
      'Vendor management',
      'Door list & security',
      'SMS notifications',
      '1.5% platform fee on direct payments',
      '3% platform fee on ticket sales',
      'Priority support',
    ],
    limits: { venues: 3, team: 3 },
    priceId: 'price_1TZs56Q777mo7OFqwxVgp4dE',
    highlighted: false,
    cta: 'Subscribe — $149/mo',
    ctaDisabled: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 299,
    priceLabel: '$299',
    description: 'For high-volume promoters, venues & event companies',
    features: [
      'Up to 5 venues',
      '5 team members included',
      'Everything in Pro',
      '1% platform fee on direct payments (lowest rate)',
      '3% platform fee on ticket sales',
      'Multi-venue support',
      'Custom branding',
      'Ticket sales & promoter tools',
      'Dedicated account manager',
    ],
    limits: { venues: 5, team: 5 },
    priceId: 'price_1TZs57Q777mo7OFqU56SIUsu',
    highlighted: true,
    cta: 'Subscribe — $299/mo',
    ctaDisabled: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    priceLabel: 'Custom',
    description: 'For multi-venue operators, agencies & large organizations',
    features: [
      'Custom venue limits',
      'Custom team member access',
      'Tailored transaction pricing',
      '3% platform fee on ticket sales',
      'Advanced reporting',
      'Dedicated onboarding support',
      'Custom platform features',
      'SLA & priority engineering support',
    ],
    limits: { venues: null, team: null },
    priceId: null,
    highlighted: false,
    cta: 'Contact Us',
    ctaDisabled: false,
  },
]

function statusBadge(status: string) {
  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3" /> Active
        </span>
      )
    case 'trialing':
    case 'trial':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Clock className="h-3 w-3" /> Free Trial
        </span>
      )
    case 'past_due':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <AlertTriangle className="h-3 w-3" /> Past Due
        </span>
      )
    case 'canceled':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="h-3 w-3" /> Canceled
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <Clock className="h-3 w-3" /> {status || 'No Plan'}
        </span>
      )
  }
}

function connectBadge(status: string) {
  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3" /> Connected
        </span>
      )
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3" /> Pending
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <XCircle className="h-3 w-3" /> Not Connected
        </span>
      )
  }
}

export default function BillingPage() {
  const { user, activeRole } = useAuth()
  const router = useRouter()
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [connectLoading, setConnectLoading] = useState(false)
  const [ownerAccountId, setOwnerAccountId] = useState<string | null>(null)

  useEffect(() => {
    if (activeRole === 'associate') router.replace('/dashboard')
  }, [activeRole, router])

  const fetchBillingData = useCallback(async () => {
    if (!user) return
    try {
      // Fetch owner account ID and subscription status in parallel
      const [accountRes, connectRes] = await Promise.all([
        api.get('/owner/account-id'),
        api.get('/stripe/connect/owner/status'),
      ])

      setConnectStatus(connectRes.data)

      const accountId = accountRes.data?.ownerAccountId
      if (accountId) {
        setOwnerAccountId(String(accountId))
        const subRes = await api.get(`/stripe/subscription?ownerAccountId=${accountId}`)
        setSubscription(subRes.data)
      }
    } catch (err) {
      console.error('Failed to fetch billing data:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchBillingData()
  }, [fetchBillingData])

  // Check for return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('subscribed') === 'true' || params.get('connect') === 'success') {
      fetchBillingData()
    }
  }, [fetchBillingData])

  const handleSubscribe = async (plan: typeof PLANS[number]) => {
    if (plan.id === 'enterprise') {
      window.location.href = 'mailto:hello@eventecos.com?subject=Enterprise%20Plan%20Inquiry'
      return
    }
    if (!plan.priceId || !ownerAccountId || !user) return
    setCheckoutLoading(plan.priceId)
    try {
      const res = await api.post('/stripe/checkout', {
        ownerAccountId,
        priceId: plan.priceId,
        email: user.email,
        businessName: user.firstName + ' ' + user.lastName,
      })
      window.location.href = res.data.url
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to start checkout')
      setCheckoutLoading(null)
    }
  }

  const handleBillingPortal = async () => {
    if (!ownerAccountId) return
    setPortalLoading(true)
    try {
      const res = await api.post('/stripe/billing-portal', { ownerAccountId })
      window.location.href = res.data.url
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to open billing portal')
    } finally {
      setPortalLoading(false)
    }
  }

  const handleConnectOnboarding = async () => {
    if (!user) return
    setConnectLoading(true)
    try {
      const res = await api.post('/stripe/connect/owner', { email: user.email })
      window.location.href = res.data.url
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to start Connect onboarding')
    } finally {
      setConnectLoading(false)
    }
  }

  const isSubscribed = subscription?.status === 'active' || subscription?.status === 'trialing'
  const currentPlanId = subscription?.planName ?? 'free'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-500 mt-1">Manage your EventEcos plan and payment settings</p>
      </div>

      {/* ── Current Status Card ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Current Plan</p>
            <div className="flex items-center gap-3">
              <p className="text-xl font-bold text-gray-900 capitalize">
                {subscription?.planName
                  ? `EventEcos ${subscription.planName.charAt(0).toUpperCase() + subscription.planName.slice(1)}`
                  : 'EventEcos Free'}
              </p>
              {subscription ? statusBadge(subscription.status) : statusBadge('trial')}
            </div>
            {subscription?.venueLimit != null && (
              <p className="text-xs text-gray-400 mt-1">
                {subscription.venueLimit} {subscription.venueLimit === 1 ? 'venue' : 'venues'} ·{' '}
                {subscription.teamMemberLimit ?? 0} team {(subscription.teamMemberLimit ?? 0) === 1 ? 'member' : 'members'}
              </p>
            )}
            {subscription?.stripeSubscriptionId && (
              <p className="text-xs text-gray-400 mt-1 font-mono">
                {subscription.stripeSubscriptionId}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchBillingData}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            {subscription?.stripeCustomerId && (
              <button
                onClick={handleBillingPortal}
                disabled={portalLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {portalLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Manage Subscription
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stripe Test Mode Banner ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex items-start gap-3">
        <Zap className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Test Mode Active</p>
          <p className="text-sm text-amber-700 mt-0.5">
            Use test card <span className="font-mono font-bold">4242 4242 4242 4242</span> with any future expiry and any CVC.{' '}
            <a
              href="https://stripe.com/docs/testing#cards"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              View all test cards →
            </a>
          </p>
        </div>
      </div>

      {/* ── Upgrade Hero (free/trial users) ── */}
      {!isSubscribed && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-8 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-bold mb-1">Upgrade Your Plan</h2>
              <p className="text-sm text-indigo-100">
                You're on the Free plan. Upgrade to reduce your platform fees, add venues, and unlock team management.
                All your data, clients, and settings carry over automatically — nothing is lost.
              </p>
              <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1">
                {[
                  'Lower platform fees',
                  'Multiple venues',
                  'Team member access',
                  'E-signature contracts',
                  'Vendor management',
                  'Cancel anytime',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-indigo-100">
                    <CheckCircle className="h-3.5 w-3.5 text-indigo-300 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-shrink-0 text-center">
              <p className="text-xs text-indigo-200 mb-2">Pro starts at</p>
              <p className="text-4xl font-extrabold">$149<span className="text-lg font-normal">/mo</span></p>
              <p className="text-xs text-indigo-200 mt-1">Choose a plan below ↓</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Plans Grid ── */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {PLANS.map((plan) => {
            const isCurrent = currentPlanId === plan.id
            const isLoading = checkoutLoading === plan.priceId
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-xl border-2 p-5 flex flex-col ${
                  isCurrent
                    ? 'border-indigo-500 shadow-md'
                    : plan.highlighted
                    ? 'border-primary-500 shadow-lg'
                    : 'border-gray-200 shadow-sm'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      Current Plan
                    </span>
                  </div>
                )}
                {plan.highlighted && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-gray-500 text-xs mt-1">{plan.description}</p>
                  <div className="mt-3">
                    <span className="text-2xl font-bold text-gray-900">{plan.priceLabel}</span>
                    {plan.price !== null && (
                      <span className="text-gray-500 text-sm">/month</span>
                    )}
                    {plan.price === null && (
                      <span className="text-gray-500 text-sm"> pricing</span>
                    )}
                  </div>
                  <div className="mt-2 flex gap-3 text-xs text-gray-500">
                    <span>
                      {plan.limits.venues !== null ? `${plan.limits.venues} venue${plan.limits.venues !== 1 ? 's' : ''}` : 'Custom venues'}
                    </span>
                    <span>·</span>
                    <span>
                      {plan.limits.team !== null ? `${plan.limits.team} team member${plan.limits.team !== 1 ? 's' : ''}` : 'Custom team'}
                    </span>
                  </div>
                </div>
                <ul className="space-y-1.5 mb-5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={plan.ctaDisabled || isCurrent || (!plan.priceId && plan.id !== 'enterprise') || isLoading}
                  className={`w-full py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
                    isCurrent
                      ? 'bg-indigo-50 text-indigo-700 cursor-default'
                      : plan.highlighted
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : plan.id === 'enterprise'
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : plan.id === 'enterprise' ? (
                    <ExternalLink className="h-4 w-4" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  {isCurrent ? 'Current Plan' : plan.cta}
                </button>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          Cancel anytime. Stripe processing fees apply to all transactions. Platform fees shown are EventEcos fees only.
        </p>
      </div>

      {/* ── Stripe Connect Section ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Link2 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">Stripe Connect</h3>
                {connectStatus && connectBadge(connectStatus.status)}
              </div>
              <p className="text-sm text-gray-500">
                Connect your Stripe account to accept payments from clients and pay vendors.
                Platform fees on direct payments: <strong>3%</strong> Free · <strong>1.5%</strong> Pro · <strong>1%</strong> Premium &amp; Enterprise. Stripe processing fees are always paid by the payer.
              </p>
              {connectStatus?.connectId && (
                <p className="text-xs text-gray-400 mt-1 font-mono">{connectStatus.connectId}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleConnectOnboarding}
            disabled={connectLoading || connectStatus?.status === 'active'}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
          >
            {connectLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            {connectStatus?.status === 'active'
              ? 'Already Connected'
              : connectStatus?.status === 'pending'
              ? 'Continue Setup'
              : 'Set Up Payouts'}
          </button>
        </div>
      </div>

      {/* ── Feature Highlights ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: Shield,
            color: 'text-green-600',
            bg: 'bg-green-50',
            title: 'Secure Payments',
            desc: 'All transactions processed by Stripe — PCI DSS compliant.',
          },
          {
            icon: BarChart3,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            title: 'Real-time Reporting',
            desc: 'Track every payment, payout, and fee in your dashboard.',
          },
          {
            icon: Zap,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            title: 'Instant Payouts',
            desc: 'Funds deposited directly to your bank via Stripe Connect.',
          },
        ].map(({ icon: Icon, color, bg, title, desc }) => (
          <div key={title} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-3">
            <div className={`${bg} p-2 rounded-lg flex-shrink-0`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
