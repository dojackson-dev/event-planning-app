'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { auctionApi, BidFeedEntry, isUnavailable, parseApiError, PublicAuction, PublicItem } from '@/lib/auctionApi'
import BidPanel from '@/components/auction/BidPanel'
import Countdown from '@/components/auction/Countdown'
import { formatUsd } from '@/components/auction/format'
import StatusBadge from '@/components/auction/StatusBadge'
import { useAuctionState } from '@/components/auction/useAuctionState'
import { useBidder } from '@/components/auction/useBidder'

interface ItemResponse {
  auction: PublicAuction
  item: PublicItem
  bids: BidFeedEntry[]
}

export default function ItemPage() {
  const { id, itemId } = useParams<{ id: string; itemId: string }>()
  const [data, setData] = useState<ItemResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [image, setImage] = useState(0)
  const { items: live, auctionState, offsetMs, refresh } = useAuctionState(id, !!data)
  const { me, reload: reloadMe } = useBidder(id)
  const lastBidCount = useRef<number | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const res = await auctionApi.get<ItemResponse>(`/items/${itemId}`)
      if (res.data.item.auction_id !== id) {
        setNotFound(true)
        return
      }
      setData(res.data)
      lastBidCount.current = res.data.item.bid_count
    } catch (err) {
      if (isUnavailable(err)) setNotFound(true)
      else setError(parseApiError(err).message)
    }
  }, [id, itemId])

  useEffect(() => {
    load()
  }, [load])

  const liveItem = live[itemId]
  // The bid feed is not part of the polled state, so reload it when the bid count moves.
  useEffect(() => {
    if (liveItem && lastBidCount.current != null && liveItem.bid_count !== lastBidCount.current) {
      lastBidCount.current = liveItem.bid_count
      load()
    }
  }, [liveItem, load])

  const onChanged = useCallback(() => {
    refresh()
    reloadMe()
    load()
  }, [refresh, reloadMe, load])

  if (notFound) {
    return (
      <div className="py-16 text-center">
        <p className="mb-3 text-gray-600">This item could not be found or is not available.</p>
        <Link href={`/auctions/${id}`} className="font-medium text-purple-600 underline">Back to the auction</Link>
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
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-purple-600" aria-label="Loading item" /></div>
  }

  const item = { ...data.item, ...(liveItem ?? {}) }
  const isAuction = item.sale_mode === 'auction'
  const auctionStatus = auctionState?.status ?? data.auction.status
  const open = item.status === 'open'
  const images = item.image_urls

  return (
    <div>
      <Link href={`/auctions/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> {data.auction.title}
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
            {images[image] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[image]} alt={item.title} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">No photo</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((src, i) => (
                <button key={src} onClick={() => setImage(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === image} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === image ? 'border-purple-600' : 'border-transparent'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {item.lot_number != null && <span className="text-sm text-gray-500">Lot {item.lot_number}</span>}
              {item.category && <span className="text-sm text-gray-500">| {item.category}</span>}
              {!open && <StatusBadge status={item.status} />}
            </div>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">{item.title}</h1>
            {item.donor_name && <p className="text-sm text-gray-500">Donated by {item.donor_name}</p>}
          </div>

          <div className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">{isAuction ? (item.bid_count > 0 ? 'Current bid' : 'Starting bid') : 'Price'}</p>
                <p className="text-3xl font-bold text-gray-900" aria-live="polite" aria-atomic="true">
                  {formatUsd(isAuction ? (item.bid_count > 0 ? item.current_price_cents : item.starting_bid_cents ?? item.current_price_cents) : item.fixed_price_cents)}
                </p>
                {isAuction && <p className="text-xs text-gray-500">{item.bid_count} bid{item.bid_count === 1 ? '' : 's'}{item.bid_count > 0 && !item.reserve_met ? ' | reserve not yet met' : ''}</p>}
              </div>
              <div className="text-right text-sm">
                {open && isAuction && <Countdown endsAt={item.ends_at} offsetMs={offsetMs} />}
                {open && !isAuction && item.quantity_remaining != null && <span className="text-gray-700">{item.quantity_remaining} remaining</span>}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">Fair market value: {formatUsd(item.fair_market_value_cents)}</p>
          </div>

          <BidPanel auctionId={id} auctionStatus={auctionStatus} startsAt={data.auction.starts_at} item={item} me={me} onChanged={onChanged} />

          {item.description && (
            <div>
              <h2 className="mb-1 font-semibold text-gray-900">About this item</h2>
              <p className="whitespace-pre-line text-gray-700">{item.description}</p>
            </div>
          )}

          {isAuction && (
            <div>
              <h2 className="mb-2 font-semibold text-gray-900">Bid history</h2>
              {data.bids.length === 0 ? (
                <p className="text-sm text-gray-500">No bids yet. Be the first!</p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-xl bg-white ring-1 ring-gray-200">
                  {data.bids.map((b) => (
                    <li key={b.id} className="flex justify-between px-4 py-2 text-sm">
                      <span className="text-gray-700">{b.bidder_label}</span>
                      <span className="font-medium text-gray-900">{formatUsd(b.amount_cents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400">
            Winning bidders are charged on the card they save when registering. Taxes and card processing fees, if any, are shown before payment.
          </p>
        </div>
      </div>
    </div>
  )
}
