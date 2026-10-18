'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { auctionApi, isUnavailable, parseApiError, PublicAuction, PublicItem } from '@/lib/auctionApi'
import Countdown from '@/components/auction/Countdown'
import { formatDateTime } from '@/components/auction/format'
import ItemCard from '@/components/auction/ItemCard'
import StatusBadge from '@/components/auction/StatusBadge'
import { useAuctionState } from '@/components/auction/useAuctionState'
import { useBidder } from '@/components/auction/useBidder'

export default function AuctionPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<{ auction: PublicAuction; items: PublicItem[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const { items: live, auctionState, offsetMs } = useAuctionState(id, !!data)
  const { me, signOut } = useBidder(id)

  const load = useCallback(async () => {
    try {
      setError(null)
      const res = await auctionApi.get<{ auction: PublicAuction; items: PublicItem[] }>(`/${id}`)
      setData(res.data)
    } catch (err) {
      if (isUnavailable(err)) setNotFound(true)
      else setError(parseApiError(err).message)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const categories = useMemo(
    () => Array.from(new Set((data?.items ?? []).map((i) => i.category).filter((c): c is string => !!c))).sort(),
    [data],
  )
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.items ?? []).filter((i) => (!category || i.category === category) && (!q || i.title.toLowerCase().includes(q)))
  }, [data, category, query])

  if (notFound) {
    return (
      <div className="py-16 text-center">
        <p className="mb-3 text-gray-600">This auction could not be found or is not available.</p>
        <Link href="/auctions" className="font-medium text-purple-600 underline">See all auctions</Link>
      </div>
    )
  }
  if (error) {
    return (
      <div className="py-16 text-center">
        <p role="alert" className="mb-3 text-gray-600">{error}</p>
        <button onClick={load} className="font-medium text-purple-600 underline">Try again</button>
      </div>
    )
  }
  if (!data) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-purple-600" aria-label="Loading auction" /></div>
  }

  const { auction } = data
  const status = auctionState?.status ?? auction.status
  const endsAt = auctionState?.ends_at ?? auction.ends_at

  return (
    <div>
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{auction.title}</h1>
              <StatusBadge status={status} />
            </div>
            {auction.org_name && <p className="mt-1 text-purple-700">Benefiting {auction.org_name}</p>}
            {auction.event_title && (
              <p className="text-sm text-gray-500">
                {auction.event_title}{auction.event_date ? ` | ${formatDateTime(auction.event_date)}` : ''}
              </p>
            )}
            {auction.description && <p className="mt-3 max-w-2xl whitespace-pre-line text-gray-700">{auction.description}</p>}
          </div>
          <div className="text-right text-sm">
            {status === 'scheduled' ? (
              <p className="text-gray-700">Opens {formatDateTime(auction.starts_at)}</p>
            ) : status === 'live' ? (
              <p className="text-base"><Countdown endsAt={endsAt} offsetMs={offsetMs} prefix="Auction ends in" /></p>
            ) : (
              <p className="text-gray-600">This auction has ended.</p>
            )}
            <p className="text-gray-500">Ends {formatDateTime(endsAt)}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 text-sm">
          {me ? (
            <>
              <span className="text-gray-700">Signed in as <strong>{me.bidder.paddle_label ?? me.bidder.display_name}</strong></span>
              {!me.bidder.can_bid && !me.bidder.blocked && (
                <Link href={`/auctions/${id}/register?next=${encodeURIComponent(`/auctions/${id}`)}`} className="font-medium text-amber-700 underline">Finish setup to bid</Link>
              )}
              <Link href={`/auctions/${id}/my-bids`} className="font-medium text-purple-700 underline">My bids</Link>
              <button onClick={signOut} className="text-gray-500 underline">Sign out</button>
            </>
          ) : status === 'closed' || status === 'settled' ? (
            <Link href={`/auctions/${id}/login`} className="font-medium text-purple-700 underline">Log in to see your orders</Link>
          ) : (
            <>
              <Link href={`/auctions/${id}/register`} className="rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700">Register to bid</Link>
              <Link href={`/auctions/${id}/login`} className="font-medium text-purple-700 underline">I already registered</Link>
            </>
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-xl font-semibold text-gray-900">Items ({visible.length})</h2>
          <label className="sr-only" htmlFor="search">Search items</label>
          <input id="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          {categories.length > 0 && (
            <>
              <label className="sr-only" htmlFor="category">Category</label>
              <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </>
          )}
        </div>
        {visible.length === 0 ? (
          <p className="py-12 text-center text-gray-500">{data.items.length === 0 ? 'No items have been added yet.' : 'No items match your search.'}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <li key={item.id}><ItemCard item={item} live={live[item.id]} offsetMs={offsetMs} /></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
