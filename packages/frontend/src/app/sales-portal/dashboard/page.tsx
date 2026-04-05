'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { useAffiliateAuth } from '@/contexts/AffiliateAuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  affiliate: {
    first_name: string
    last_name: string
    email: string
    referral_code: string
  }
  stats: {
    totalReferred:   number
    totalConverted:  number
    totalEarned:     number
    pendingEarnings: number
  }
}

interface Referral {
  id: string
  status: 'pending' | 'converted' | 'churned'
  converted_at: string | null
  commission_expires_at: string | null
  created_at: string
  owner_accounts: {
    id: string
    business_name: string
    subscription_status: string
  }
}

interface Commission {
  id: string
  commission_type: 'conversion' | 'recurring'
  commission_rate: number
  subscription_amount: number
  commission_amount: number
  status: 'pending' | 'paid' | 'void'
  period_start: string | null
  period_end: string | null
  created_at: string
  owner_accounts: { business_name: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://dovenuesuite.com'

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending:   'bg-yellow-50 text-yellow-700 border-yellow-200',
    converted: 'bg-green-50 text-green-700 border-green-200',
    churned:   'bg-gray-50 text-gray-500 border-gray-200',
    paid:      'bg-green-50 text-green-700 border-green-200',
    void:      'bg-red-50 text-red-500 border-red-200',
    active:    'bg-green-50 text-green-700 border-green-200',
    trial:     'bg-blue-50 text-blue-700 border-blue-200',
    inactive:  'bg-gray-50 text-gray-500 border-gray-200',
  }
  return `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
    ${map[status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'referrals' | 'commissions'

export default function SalesPortalDashboard() {
  const { affiliate: authAffiliate, isAuthenticated, loading: authLoading, logout } = useAffiliateAuth()
  const router = useRouter()

  const [tab,         setTab]         = useState<Tab>('overview')
  const [dashboard,   setDashboard]   = useState<DashboardData | null>(null)
  const [referrals,   setReferrals]   = useState<Referral[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [copied,      setCopied]      = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/sales-portal/login')
    }
  }, [authLoading, isAuthenticated, router])

  const fetchData = useCallback(async () => {
    setLoadingData(true)
    try {
      const [dashRes, refRes, comRes] = await Promise.all([
        api.get('/affiliates/dashboard'),
        api.get('/affiliates/referrals'),
        api.get('/affiliates/commissions'),
      ])
      setDashboard(dashRes.data)
      setReferrals(refRes.data)
      setCommissions(comRes.data)
    } catch {
      // token may have expired — context interceptor will redirect
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) fetchData()
  }, [isAuthenticated, fetchData])

  const referralLink = dashboard
    ? `${FRONTEND_URL}/register?ref=${dashboard.affiliate.referral_code}`
    : ''

  const copyLink = () => {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    )
  }

  const stats = dashboard?.stats

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 text-sm">
              DoVenueSuite <span className="text-indigo-600">Sales Portal</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {dashboard && (
              <span className="text-sm text-gray-500 hidden sm:block">
                Hi, {dashboard.affiliate.first_name}
              </span>
            )}
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Referral Link Banner */}
        {referralLink && (
          <div className="bg-indigo-600 rounded-2xl p-6 text-white">
            <p className="text-sm font-medium text-indigo-200 mb-1">Your unique referral link</p>
            <p className="text-xs text-indigo-300 mb-3">
              Share this link — when someone subscribes through it, you earn commissions automatically.
            </p>
            <div className="flex items-center gap-2 bg-indigo-700 rounded-lg px-4 py-2">
              <span className="flex-1 text-sm font-mono text-indigo-100 truncate">{referralLink}</span>
              <button
                onClick={copyLink}
                className="shrink-0 text-xs bg-white text-indigo-700 font-semibold px-3 py-1 rounded-md hover:bg-indigo-50 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="mt-3 text-xs text-indigo-300">
              Code: <span className="font-mono font-semibold text-white">{dashboard?.affiliate.referral_code}</span>
            </p>
          </div>
        )}

        {/* How It Works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Share Your Link', desc: 'Send your referral link to venue owners, bloggers, and event planners.' },
            { step: '2', title: 'They Subscribe', desc: 'When they sign up and subscribe, you earn 50% of their first payment.' },
            { step: '3', title: 'Earn Monthly', desc: 'Get 3% of every recurring payment for up to 3 years.' },
          ].map(item => (
            <div key={item.step} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mb-3">
                {item.step}
              </div>
              <p className="font-semibold text-gray-900 text-sm mb-1">{item.title}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div>
          <div className="flex gap-1 border-b border-gray-200 mb-6">
            {(['overview', 'referrals', 'commissions'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize
                  ${tab === t
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* ── Overview ─── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {loadingData ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-20" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard
                    label="Total Referred"
                    value={String(stats?.totalReferred ?? 0)}
                    color="text-gray-900"
                    sub="owners signed up via your link"
                  />
                  <StatCard
                    label="Active Subscribers"
                    value={String(stats?.totalConverted ?? 0)}
                    color="text-green-600"
                    sub="currently earning you commissions"
                  />
                  <StatCard
                    label="Total Earned"
                    value={fmt(stats?.totalEarned ?? 0)}
                    color="text-indigo-600"
                    sub="lifetime commissions"
                  />
                  <StatCard
                    label="Pending Payout"
                    value={fmt(stats?.pendingEarnings ?? 0)}
                    color="text-amber-600"
                    sub="awaiting processing"
                  />
                </div>
              )}

              {/* Commission rate card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Your Commission Structure</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-indigo-700">50%</p>
                    <p className="text-sm font-medium text-indigo-800 mt-1">Conversion Bonus</p>
                    <p className="text-xs text-indigo-600 mt-1">Earned on the first subscription payment of every owner you convert.</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-green-700">3%</p>
                    <p className="text-sm font-medium text-green-800 mt-1">Recurring Revenue</p>
                    <p className="text-xs text-green-600 mt-1">Earned on every monthly payment for up to 3 years per subscriber.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Referrals ─── */}
          {tab === 'referrals' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {loadingData ? (
                <div className="p-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                </div>
              ) : referrals.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">No referrals yet. Share your link to get started!</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Business', 'Subscription', 'Status', 'Referred', 'Converted', 'Commission Expires'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {referrals.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {r.owner_accounts.business_name}
                        </td>
                        <td className="px-4 py-3">
                          <span className={statusBadge(r.owner_accounts.subscription_status)}>
                            {r.owner_accounts.subscription_status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={statusBadge(r.status)}>{r.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.created_at)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.converted_at)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.commission_expires_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Commissions ─── */}
          {tab === 'commissions' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {loadingData ? (
                <div className="p-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                </div>
              ) : commissions.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">No commissions yet. Commissions appear once referred owners subscribe.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Business', 'Type', 'Owner Paid', 'Rate', 'Your Commission', 'Period', 'Status', 'Date'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {commissions.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {c.owner_accounts.business_name}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            c.commission_type === 'conversion'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-teal-50 text-teal-700 border-teal-200'
                          }`}>
                            {c.commission_type === 'conversion' ? 'Conversion' : 'Recurring'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{fmt(c.subscription_amount)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {(Number(c.commission_rate) * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-700">{fmt(c.commission_amount)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {c.period_start ? `${fmtDate(c.period_start)} – ${fmtDate(c.period_end)}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={statusBadge(c.status)}>{c.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(c.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
