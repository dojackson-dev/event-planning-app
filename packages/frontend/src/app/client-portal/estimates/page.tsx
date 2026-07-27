'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import clientApi from '@/lib/clientApi'
import { FileText, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, DollarSign, ChevronRight, Search } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     color: 'bg-gray-100 text-gray-600 border-gray-200',         icon: <FileText className="h-4 w-4" /> },
  sent:      { label: 'Sent',      color: 'bg-blue-100 text-blue-700 border-blue-200',          icon: <Clock className="h-4 w-4" /> },
  approved:  { label: 'Approved',  color: 'bg-green-100 text-green-700 border-green-200',       icon: <CheckCircle2 className="h-4 w-4" /> },
  rejected:  { label: 'Rejected',  color: 'bg-red-100 text-red-700 border-red-200',             icon: <XCircle className="h-4 w-4" /> },
  expired:   { label: 'Expired',   color: 'bg-orange-100 text-orange-700 border-orange-200',    icon: <AlertCircle className="h-4 w-4" /> },
  converted: { label: 'Converted', color: 'bg-purple-100 text-purple-700 border-purple-200',    icon: <CheckCircle2 className="h-4 w-4" /> },
}

function isExpiringSoon(estimate: any): boolean {
  if (!estimate.expiration_date) return false
  const status = estimate.status
  if (status !== 'sent' && status !== 'draft') return false
  const days = (new Date(estimate.expiration_date + 'T12:00:00').getTime() - Date.now()) / 86_400_000
  return days >= 0 && days <= 7
}

export default function ClientEstimatesPage() {
  const router = useRouter()
  const [estimates, setEstimates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    clientApi.get('/estimates')
      .then((res) => setEstimates(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = estimates.filter((e: any) => {
    if (filter !== 'all' && e.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        (e.event_name ?? '').toLowerCase().includes(q) ||
        (e.title ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading estimates...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary-600" />
          Estimates
        </h1>
        <span className="text-sm text-gray-500">{estimates.length} estimate{estimates.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Search + status filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search estimates…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="min-w-[180px] px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          <option value="all">All Statuses ({estimates.length})</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
          <option value="converted">Converted</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No estimates found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((estimate: any) => {
            const cfg = STATUS_CONFIG[estimate.status] ?? STATUS_CONFIG.draft
            const expiring = isExpiringSoon(estimate)
            return (
              <div
                key={estimate.id}
                onClick={() => router.push(`/client-portal/estimates/${estimate.id}`)}
                className={`bg-white rounded-xl border shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow ${expiring ? 'border-orange-300' : 'border-gray-200'}`}
              >
                {expiring && (
                  <div className="mb-3 flex items-center gap-2 text-sm text-orange-700 bg-orange-50 rounded-lg px-3 py-2 border border-orange-200">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    This estimate expires soon – please review and respond.
                  </div>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{estimate.title ?? `Estimate #${estimate.estimate_number}`}</h3>
                      {estimate.estimate_number && estimate.title && (
                        <span className="text-xs text-gray-400">#{estimate.estimate_number}</span>
                      )}
                    </div>

                    {estimate.event && (
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {estimate.event.name}
                        {estimate.event.date &&
                          ` · ${new Date(estimate.event.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        }
                      </p>
                    )}

                    {estimate.description && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{estimate.description}</p>
                    )}

                    {/* Line items / breakdown */}
                    {Array.isArray(estimate.line_items) && estimate.line_items.length > 0 && (
                      <div className="mt-3 rounded-lg border border-gray-100 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 text-xs text-gray-500">
                              <th className="text-left px-3 py-2">Item</th>
                              <th className="text-right px-3 py-2">Qty</th>
                              <th className="text-right px-3 py-2">Price</th>
                              <th className="text-right px-3 py-2">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {estimate.line_items.map((li: any, idx: number) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 text-gray-800">{li.name ?? li.description}</td>
                                <td className="px-3 py-2 text-right text-gray-600">{li.quantity ?? 1}</td>
                                <td className="px-3 py-2 text-right text-gray-600">${Number(li.unit_price ?? li.price ?? 0).toFixed(2)}</td>
                                <td className="px-3 py-2 text-right font-medium text-gray-800">${Number(li.total ?? (li.unit_price ?? li.price ?? 0) * (li.quantity ?? 1)).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                      {estimate.created_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created {new Date(estimate.created_at).toLocaleDateString()}
                        </span>
                      )}
                      {estimate.expiration_date && (
                        <span className={`flex items-center gap-1 ${expiring ? 'text-orange-600 font-medium' : ''}`}>
                          <AlertCircle className="h-3 w-3" />
                          Expires {new Date(estimate.expiration_date + 'T12:00:00').toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>

                    {estimate.total_amount != null && (
                      <p className="text-xl font-bold text-gray-900 flex items-center gap-0.5">
                        <DollarSign className="h-4 w-4" />
                        {Number(estimate.total_amount).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
