'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { useAffiliateAuth } from '@/contexts/AffiliateAuthContext'
import { Search, RefreshCw, Users, TrendingUp, CheckCircle, XCircle } from 'lucide-react'

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

interface ManagerUser {
  id: string
  owner_id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  business_name: string | null
  subscription_status: string
  trial_ends_at: string | null
  account_created_at: string
  last_login: string | null
  referred_by: { name: string; code: string } | null
}

interface ManagerSummary {
  total: number
  trialing: number
  active: number
  cancelled: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://eventecos.com'

const SUB_STATUS_LABELS: Record<string, string> = {
  active:    'Active',
  trialing:  'In Trial',
  trial:     'Never Started',
  cancelled: 'Cancelled',
  past_due:  'Past Due',
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending:   'bg-yellow-50 text-yellow-700 border-yellow-200',
    converted: 'bg-green-50 text-green-700 border-green-200',
    churned:   'bg-gray-50 text-gray-500 border-gray-200',
    paid:      'bg-green-50 text-green-700 border-green-200',
    void:      'bg-red-50 text-red-500 border-red-200',
    active:    'bg-green-50 text-green-700 border-green-200',
    trialing:  'bg-blue-50 text-blue-700 border-blue-200',
    trial:     'bg-gray-50 text-gray-500 border-gray-200',
    past_due:  'bg-orange-50 text-orange-700 border-orange-200',
    cancelled: 'bg-red-50 text-red-500 border-red-200',
    inactive:  'bg-gray-50 text-gray-500 border-gray-200',
  }
  return `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
    ${map[status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`
}

function fmtRelative(iso: string | null) {
  if (!iso) return 'Never'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 30) return `${diff}d ago`
  if (diff < 365) return `${Math.floor(diff / 30)}mo ago`
  return `${Math.floor(diff / 365)}y ago`
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

type Tab = 'overview' | 'referrals' | 'commissions' | 'users'

export default function SalesPortalDashboard() {
  const { affiliate: authAffiliate, isAuthenticated, loading: authLoading, logout } = useAffiliateAuth()
  const router = useRouter()

  const [tab,             setTab]            = useState<Tab>('overview')
  const [dashboard,       setDashboard]      = useState<DashboardData | null>(null)
  const [referrals,       setReferrals]      = useState<Referral[]>([])
  const [commissions,     setCommissions]    = useState<Commission[]>([])
  const [managerUsers,    setManagerUsers]   = useState<ManagerUser[]>([])
  const [managerSummary,  setManagerSummary] = useState<ManagerSummary | null>(null)
  const [userSearch,      setUserSearch]     = useState('')
  const [userStatusFilter,setUserStatusFilter] = useState('all')
  const [loadingData,     setLoadingData]    = useState(true)
  const [loadingUsers,    setLoadingUsers]   = useState(false)
  const [copied,          setCopied]         = useState(false)

  const isManager = authAffiliate?.email === 'sales@eventecos.com'

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

  const fetchManagerUsers = useCallback(async (search = '', status = '') => {
    setLoadingUsers(true)
    try {
      const res = await api.get('/affiliates/manager/users', {
        params: { search, status },
      })
      setManagerUsers(res.data.users || [])
      setManagerSummary(res.data.summary || null)
    } catch {
      // not a manager or token expired
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  // Load users tab on first visit
  useEffect(() => {
    if (tab === 'users' && isManager && managerUsers.length === 0) {
      fetchManagerUsers(userSearch, userStatusFilter)
    }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUserSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchManagerUsers(userSearch, userStatusFilter)
  }

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
              Eventecos <span className="text-indigo-600">Sales Portal</span>
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
          <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
            {(['overview', 'referrals', 'commissions'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize whitespace-nowrap
                  ${tab === t
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {t}
              </button>
            ))}
            {isManager && (
              <button
                onClick={() => setTab('users')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1
                  ${tab === 'users'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Users className="w-3.5 h-3.5" />All Users
              </button>
            )}
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

          {/* ── Users (manager only) ─── */}
          {tab === 'users' && isManager && (
            <div className="space-y-5">

              {/* Summary cards */}
              {managerSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border p-4">
                    <p className="text-xs text-gray-500 mb-1">Total Accounts</p>
                    <p className="text-2xl font-bold text-gray-900">{managerSummary.total}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl border border-green-200 p-4">
                    <p className="text-xs text-green-600 mb-1">Paid / Active</p>
                    <p className="text-2xl font-bold text-green-700">{managerSummary.active}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                    <p className="text-xs text-blue-600 mb-1">In Trial</p>
                    <p className="text-2xl font-bold text-blue-700">{managerSummary.trialing}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                    <p className="text-xs text-red-500 mb-1">Cancelled</p>
                    <p className="text-2xl font-bold text-red-700">{managerSummary.cancelled}</p>
                  </div>
                </div>
              )}

              {/* Search + filter */}
              <div className="bg-white rounded-xl border p-4 flex flex-col sm:flex-row gap-3">
                <form onSubmit={handleUserSearch} className="flex gap-2 flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search name, email, or business..."
                      className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                    Search
                  </button>
                </form>
                <div className="flex gap-2 items-center">
                  <select
                    value={userStatusFilter}
                    onChange={e => {
                      setUserStatusFilter(e.target.value)
                      fetchManagerUsers(userSearch, e.target.value)
                    }}
                    className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active (Paid)</option>
                    <option value="trialing">In Trial</option>
                    <option value="trial">Never Started</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="past_due">Past Due</option>
                  </select>
                  <button
                    onClick={() => fetchManagerUsers(userSearch, userStatusFilter)}
                    className="p-2 border rounded-lg hover:bg-gray-50"
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border overflow-hidden">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                  </div>
                ) : managerUsers.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">No accounts found</div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['User', 'Business', 'Subscription', 'Signed Up', 'Last Login', 'Referred By'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {managerUsers.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">
                              {u.first_name || u.last_name
                                ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
                                : <span className="text-gray-400 italic">No name</span>}
                            </p>
                            <p className="text-xs text-gray-400">{u.email ?? '—'}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{u.business_name ?? <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-3">
                            <span className={statusBadge(u.subscription_status)}>
                              {SUB_STATUS_LABELS[u.subscription_status] ?? u.subscription_status}
                            </span>
                            {u.subscription_status === 'trialing' && u.trial_ends_at && (
                              <p className="text-xs text-gray-400 mt-0.5">ends {fmtDate(u.trial_ends_at)}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(u.account_created_at)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={u.last_login ? 'text-gray-700' : 'text-gray-300 italic'}>
                              {fmtRelative(u.last_login)}
                            </span>
                            {u.last_login && (
                              <p className="text-xs text-gray-400">{fmtDate(u.last_login)}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {u.referred_by ? (
                              <div>
                                <p className="text-gray-700 text-xs font-medium">{u.referred_by.name}</p>
                                <p className="text-gray-400 text-xs font-mono">{u.referred_by.code}</p>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-xs">Organic</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
