'use client'

import { useState, useEffect } from 'react'
import clientApi from '@/lib/clientApi'
import { FileText, Calendar, CheckCircle2, Clock, XCircle, Send } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     color: 'bg-gray-100 text-gray-600 border-gray-200',       icon: <FileText className="h-4 w-4" /> },
  sent:      { label: 'Sent',      color: 'bg-blue-100 text-blue-700 border-blue-200',        icon: <Send className="h-4 w-4" /> },
  signed:    { label: 'Signed',    color: 'bg-green-100 text-green-700 border-green-200',     icon: <CheckCircle2 className="h-4 w-4" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200',           icon: <XCircle className="h-4 w-4" /> },
}

export default function ClientContractsPage() {
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    clientApi.get('/contracts')
      .then((res) => setContracts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? contracts : contracts.filter((c: any) => c.status === filter)

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading contracts...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary-600" />
          Contracts
        </h1>
        <span className="text-sm text-gray-500">{contracts.length} contract{contracts.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'draft', 'sent', 'signed', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === s
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No contracts found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((contract: any) => {
            const cfg = STATUS_CONFIG[contract.status] ?? STATUS_CONFIG.draft
            return (
              <div key={contract.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{contract.title ?? `Contract #${contract.contract_number}`}</h3>
                      {contract.contract_number && contract.title && (
                        <span className="text-xs text-gray-400">#{contract.contract_number}</span>
                      )}
                    </div>

                    {contract.event && (
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {contract.event.name}
                        {contract.event.date &&
                          ` · ${new Date(contract.event.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        }
                      </p>
                    )}

                    {contract.content && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-3">{contract.content}</p>
                    )}

                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                      {contract.created_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created {new Date(contract.created_at).toLocaleDateString()}
                        </span>
                      )}
                      {contract.signed_at && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Signed {new Date(contract.signed_at).toLocaleDateString()}
                        </span>
                      )}
                      {contract.sent_at && !contract.signed_at && (
                        <span className="flex items-center gap-1 text-blue-500">
                          <Send className="h-3 w-3" />
                          Sent {new Date(contract.sent_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>

                    {contract.file_url && (
                      <a
                        href={contract.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-600 hover:underline"
                      >
                        View Document →
                      </a>
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
