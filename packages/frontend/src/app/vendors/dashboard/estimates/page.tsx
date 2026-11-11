'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { ChevronRight, Plus, ClipboardCheck } from 'lucide-react'
import { ESTIMATE_STATUS } from '@/components/vendor/estimateStatus'

interface EstimateRow {
  id: string
  estimate_number: string
  client_name: string
  client_email: string | null
  total_amount: number
  expiration_date: string
  status: string
}

export default function VendorEstimatesPage() {
  const router = useRouter()
  const [estimates, setEstimates] = useState<EstimateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.replace('/vendors/login'); return }
    api.get('/vendor-estimates/mine')
      .then(res => setEstimates(res.data || []))
      .catch(err => {
        if (err.response?.status === 401) router.replace('/vendors/login')
        else setError('We could not load your estimates. Please refresh to try again.')
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600" />
      </div>
    )
  }

  const open = estimates.filter(e => ['sent', 'viewed'].includes(e.status))
  const approved = estimates.filter(e => e.status === 'approved')
  const sum = (rows: EstimateRow[]) => rows.reduce((total, e) => total + Number(e.total_amount), 0)

  return (
    <div className="bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/vendors/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          ← Back to Dashboard
        </Link>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Waiting for client', value: `$${sum(open).toFixed(2)}`, color: 'text-blue-600' },
            { label: 'Approved, not invoiced', value: `$${sum(approved).toFixed(2)}`, color: 'text-green-600' },
            { label: 'All estimates', value: String(estimates.length), color: 'text-gray-900' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h1 className="font-semibold text-gray-700 text-sm">Estimates</h1>
          <Link
            href="/vendor-portal/estimates/new"
            className="inline-flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Estimate
          </Link>
        </div>

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">{error}</div>
        )}

        {estimates.length === 0 && !error ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No estimates yet</p>
            <p className="text-sm text-gray-400 mt-1">Send an itemized quote, then turn it into an invoice once the client agrees.</p>
            <Link href="/vendor-portal/estimates/new" className="mt-4 inline-flex items-center gap-2 text-primary-600 text-sm hover:underline">
              <Plus className="w-4 h-4" /> Create your first estimate
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {estimates.map(est => {
              const cfg = ESTIMATE_STATUS[est.status] ?? ESTIMATE_STATUS.draft
              return (
                <Link
                  key={est.id}
                  href={`/vendor-portal/estimates/${est.id}`}
                  className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-primary-300 hover:shadow-md transition-all"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{est.estimate_number}</p>
                    <p className="text-xs text-gray-500 truncate">{est.client_name}{est.client_email ? ` · ${est.client_email}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="font-bold text-gray-900 text-sm">${Number(est.total_amount).toFixed(2)}</p>
                      <p className="text-xs text-gray-400">Valid until {est.expiration_date}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
