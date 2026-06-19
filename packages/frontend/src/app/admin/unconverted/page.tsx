'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  Users,
  Clock,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface UnconvertedAccount {
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
  days_since_signup: number | null
}

interface Summary {
  trialing: number
  neverStarted: number
  cancelled: number
  pastDue: number
}

const STATUS_LABELS: Record<string, string> = {
  trialing: 'In Trial',
  trial: 'Never Started',
  cancelled: 'Cancelled',
  past_due: 'Past Due',
}

const STATUS_COLORS: Record<string, string> = {
  trialing: 'bg-blue-100 text-blue-800',
  trial: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-800',
  past_due: 'bg-orange-100 text-orange-800',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatRelative(iso: string | null) {
  if (!iso) return 'Never'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 30) return `${diff}d ago`
  if (diff < 365) return `${Math.floor(diff / 30)}mo ago`
  return `${Math.floor(diff / 365)}y ago`
}

export default function UnconvertedPage() {
  const [accounts, setAccounts] = useState<UnconvertedAccount[]>([])
  const [summary, setSummary] = useState<Summary>({ trialing: 0, neverStarted: 0, cancelled: 0, pastDue: 0 })
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const limit = 50

  useEffect(() => {
    fetchData()
  }, [page, statusFilter])

  const getToken = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        status: statusFilter === 'all' ? '' : statusFilter,
      })
      const res = await fetch(`${API_URL}/admin/unconverted?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.accounts || [])
        setTotal(data.total || 0)
        if (data.summary) setSummary(data.summary)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchData()
  }

  const totalPages = Math.ceil(total / limit)
  const totalUnconverted = summary.trialing + summary.neverStarted + summary.cancelled + summary.pastDue

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Unconverted Accounts</h1>
        <p className="text-gray-500 mt-1">Users who signed up but have not converted to a paid plan</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Users className="w-4 h-4" />
            Total Unconverted
          </div>
          <div className="text-2xl font-bold text-gray-900">{totalUnconverted}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-blue-500 text-sm mb-1">
            <Clock className="w-4 h-4" />
            In Trial
          </div>
          <div className="text-2xl font-bold text-blue-700">{summary.trialing}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <AlertCircle className="w-4 h-4" />
            Never Started Trial
          </div>
          <div className="text-2xl font-bold text-gray-700">{summary.neverStarted}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-red-500 text-sm mb-1">
            <XCircle className="w-4 h-4" />
            Cancelled
          </div>
          <div className="text-2xl font-bold text-red-700">{summary.cancelled}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, or business..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
            Search
          </button>
        </form>

        <div className="flex gap-2 items-center">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Statuses</option>
            <option value="trialing">In Trial</option>
            <option value="trial">Never Started</option>
            <option value="cancelled">Cancelled</option>
            <option value="past_due">Past Due</option>
          </select>

          <button
            onClick={() => fetchData()}
            className="p-2 border rounded-lg hover:bg-gray-50"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No unconverted accounts found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Business</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Signed Up</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Days Since Signup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.map(acct => (
                <tr key={acct.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {acct.first_name || acct.last_name
                        ? `${acct.first_name ?? ''} ${acct.last_name ?? ''}`.trim()
                        : <span className="text-gray-400 italic">No name</span>}
                    </div>
                    <div className="text-gray-400 text-xs">{acct.email ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{acct.business_name ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[acct.subscription_status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[acct.subscription_status] ?? acct.subscription_status}
                    </span>
                    {acct.subscription_status === 'trialing' && acct.trial_ends_at && (
                      <div className="text-xs text-gray-400 mt-0.5">ends {formatDate(acct.trial_ends_at)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(acct.account_created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-gray-600 ${!acct.last_login ? 'text-gray-300 italic' : ''}`}>
                      {formatRelative(acct.last_login)}
                    </span>
                    {acct.last_login && (
                      <div className="text-xs text-gray-400">{formatDate(acct.last_login)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {acct.days_since_signup !== null ? (
                      <span className={acct.days_since_signup > 30 ? 'text-orange-600 font-medium' : ''}>
                        {acct.days_since_signup}d
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 border rounded hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 border rounded bg-white">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 border rounded hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
