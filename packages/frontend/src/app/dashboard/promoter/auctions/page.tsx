'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Gavel, Loader2, Plus, AlertCircle, Building2 } from 'lucide-react'
import api from '@/lib/api'
import { useOrganization } from './_components/useOrganization'
import {
  Auction,
  AUCTION_STATUS_LABEL,
  AUCTION_STATUS_STYLE,
  PHASE_LABEL,
  PHASE_STYLE,
  auctionPhase,
  errorMessage,
  formatDateTime,
} from './lib'

interface NonprofitStatus {
  status: 'unverified' | 'verified' | 'rejected' | string
}

export default function PromoterAuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [nonprofit, setNonprofit] = useState<NonprofitStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { org, loading: orgLoading, failed: orgFailed } = useOrganization()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [npRes, listRes] = await Promise.all([
        api.get<NonprofitStatus>('/nonprofit/status'),
        api.get<Auction[]>('/auctions/manage'),
      ])
      setNonprofit(npRes.data)
      setAuctions(listRes.data ?? [])
    } catch (err) {
      setError(errorMessage(err, 'Could not load your auctions.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" aria-label="Loading auctions" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{error}</p>
            <button onClick={load} className="mt-2 font-medium underline">Try again</button>
          </div>
        </div>
      </div>
    )
  }

  const verified = nonprofit?.status === 'verified'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gavel className="h-6 w-6 text-purple-600" /> Auctions
          </h1>
          <p className="text-sm text-gray-500 mt-1">Online silent auctions with buy-it-now and fixed-price items for your cause.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {!orgFailed && (
            <Link
              href="/dashboard/promoter/auctions/organization"
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              <Building2 className="h-4 w-4" /> Organization page
            </Link>
          )}
          {verified && (
            <Link
              href="/dashboard/promoter/auctions/new"
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" /> New auction
            </Link>
          )}
        </div>
      </div>

      {!orgLoading && !orgFailed && !org && (
        <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">
          <p className="font-semibold">Tell your story with a public organization page</p>
          <p className="mt-1">
            Add your cause, photos and sponsors once, and every auction shares it. You can also collect item donations before bidding opens.{' '}
            <Link href="/dashboard/promoter/auctions/organization" className="underline font-medium">Create your organization page</Link>
          </p>
        </div>
      )}

      {!verified && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Auctions are for verified non-profits</p>
          <p className="mt-1">
            Verify your non-profit status on your{' '}
            <Link href="/dashboard/promoter/profile" className="underline font-medium">profile</Link>{' '}
            to create and publish auctions. Existing auctions stay visible below.
          </p>
        </div>
      )}

      {auctions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Gavel className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 mb-1">No auctions yet</p>
          {verified && (
            <Link href="/dashboard/promoter/auctions/new" className="text-sm text-purple-600 hover:underline">
              Create your first auction
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid gap-3">
          {auctions.map((a) => {
            const phase = a.phase ?? auctionPhase(a)
            return (
            <li key={a.id}>
              <Link
                href={`/dashboard/promoter/auctions/${a.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-purple-300 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-gray-900 truncate">{a.title}</h2>
                    {a.event_title && <p className="text-xs text-gray-500 mt-0.5">Event: {a.event_title}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${AUCTION_STATUS_STYLE[a.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {AUCTION_STATUS_LABEL[a.status] ?? a.status}
                    </span>
                    {phase && (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${PHASE_STYLE[phase]}`} title="What the public sees">
                        {PHASE_LABEL[phase]}
                      </span>
                    )}
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-gray-500">
                  <div><dt className="font-medium text-gray-700">Items</dt><dd>{a.item_count ?? 0}</dd></div>
                  <div><dt className="font-medium text-gray-700">Starts</dt><dd>{formatDateTime(a.starts_at)}</dd></div>
                  <div><dt className="font-medium text-gray-700">Ends</dt><dd>{formatDateTime(a.ends_at)}</dd></div>
                </dl>
              </Link>
            </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
