'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { auctionApi, isUnavailable, parseApiError, PublicAuction } from '@/lib/auctionApi'
import { formatDateTime } from '@/components/auction/format'
import PhaseBadge from '@/components/auction/PhaseBadge'
import { isPhase } from '@/components/auction/phase'
import StatusBadge from '@/components/auction/StatusBadge'

type Row = PublicAuction & { item_count: number }

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const res = await auctionApi.get<{ auctions: Row[] }>('')
      setAuctions(res.data.auctions)
    } catch (err) {
      if (isUnavailable(err)) setUnavailable(true)
      else setError(parseApiError(err).message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (unavailable) {
    return <p className="py-16 text-center text-gray-600">Online auctions are not available right now. Please check back soon.</p>
  }
  if (error) {
    return (
      <div className="py-16 text-center">
        <p role="alert" className="mb-3 text-gray-600">{error}</p>
        <button onClick={load} className="font-medium text-purple-600 underline">Try again</button>
      </div>
    )
  }
  if (!auctions) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-purple-600" aria-label="Loading auctions" /></div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Live and upcoming auctions</h1>
      <p className="mt-1 text-gray-600">Every auction supports a verified non-profit organization.</p>

      {auctions.length === 0 ? (
        <p className="py-16 text-center text-gray-500">No auctions are open right now.</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {auctions.map((a) => (
            <li key={a.id}>
              <Link href={a.org_slug && a.slug ? `/auctions/${a.org_slug}/${a.slug}` : `/auctions/${a.id}`} className="block rounded-xl border border-gray-200 bg-white p-5 transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">{a.title}</h2>
                  {isPhase(a.phase) ? <PhaseBadge phase={a.phase} className="shrink-0" /> : <StatusBadge status={a.status} />}
                </div>
                {a.org_name && <p className="mt-1 text-sm text-purple-700">{a.org_name}</p>}
                {a.cover_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.cover_image_url} alt="" loading="lazy" className="mt-3 aspect-[16/7] w-full rounded-lg bg-gray-50 object-contain" />
                )}
                {a.event_title && <p className="text-sm text-gray-500">{a.event_title}</p>}
                <p className="mt-3 text-sm text-gray-600">
                  {['live', 'closed', 'settled'].includes(a.status) ? `Ends ${formatDateTime(a.ends_at)}` : a.starts_at ? `Opens ${formatDateTime(a.starts_at)}` : 'Dates to be announced'}
                </p>
                <p className="text-sm text-gray-500">{a.item_count} item{a.item_count === 1 ? '' : 's'}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
