'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { ScrollText, Plus, Loader2, Search, Eye } from 'lucide-react'

interface PromoterContract {
  id: string
  contract_number: string
  title: string
  status: 'draft' | 'sent' | 'signed' | 'cancelled'
  client_name: string | null
  client_email: string | null
  contract_type: string | null
  sent_date: string | null
  signed_date: string | null
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-700',
  sent:      'bg-blue-100 text-blue-800',
  signed:    'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', signed: 'Signed', cancelled: 'Cancelled',
}

export default function PromoterContractsPage() {
  const router = useRouter()
  const [contracts, setContracts] = useState<PromoterContract[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'signed' | 'cancelled'>('all')

  useEffect(() => {
    api.get('/contracts')
      .then(res => setContracts(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = contracts.filter(c => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q
      || c.title.toLowerCase().includes(q)
      || (c.client_name ?? '').toLowerCase().includes(q)
      || (c.client_email ?? '').toLowerCase().includes(q)
      || c.contract_number.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Page Title Banner */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-4 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Artist Contracts</h1>
          <button
            onClick={() => router.push('/dashboard/promoter/contracts/new')}
            className="flex items-center gap-2 px-4 py-2 bg-white text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-50"
          >
            <Plus className="w-4 h-4" />
            New Contract
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by artist, title, or contract #…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="signed">Signed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <ScrollText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No contracts yet</h3>
            <p className="text-sm text-gray-500 mb-6">
              {contracts.length === 0 ? 'Create your first artist contract — use the standard template or upload your own.' : 'No contracts match your search.'}
            </p>
            {contracts.length === 0 && (
              <button
                onClick={() => router.push('/dashboard/promoter/contracts/new')}
                className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-xl text-sm hover:bg-purple-700"
              >
                Create Contract
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => (
              <div
                key={c.id}
                onClick={() => router.push(`/dashboard/promoter/contracts/${c.id}`)}
                className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4 cursor-pointer hover:shadow-sm transition-shadow"
              >
                <div className="p-2.5 bg-purple-50 rounded-lg flex-shrink-0">
                  <ScrollText className="w-5 h-5 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm truncate">{c.title}</span>
                    <span className="text-xs text-gray-400">{c.contract_number}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">
                    {c.client_name ?? c.client_email ?? 'No artist info'}
                  </p>
                  {c.sent_date && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Sent {new Date(c.sent_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {c.signed_date && ` · Signed ${new Date(c.signed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[c.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                  <Eye className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
