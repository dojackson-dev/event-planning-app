'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { auctionApi, AuctionStoryData, BidFeedEntry, getAuctionStory, isUnavailable, parseApiError, PublicAuction, PublicItem } from '@/lib/auctionApi'
import BidPanel from './BidPanel'
import Countdown from './Countdown'
import { formatUsd } from './format'
import ItemGallery from './ItemGallery'
import { FULFILLMENT_LABELS, formatDateOnly } from './itemFields'
import PhaseBadge from './PhaseBadge'
import { resolvePhase } from './phase'
import ShareButton from './ShareButton'
import { DonorAvatar } from './PhotoPlaceholder'
import StatusBadge from './StatusBadge'
import { useAuctionState } from './useAuctionState'
import { useBidder } from './useBidder'

interface ItemResponse {
  auction: PublicAuction
  item: PublicItem
  bids: BidFeedEntry[]
}

interface Props {
  auctionId: string
  itemId: string
  basePath: string
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-gray-900">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-gray-700">{children}</dd>
    </div>
  )
}

export default function ItemView({ auctionId: id, itemId, basePath }: Props) {
  const [data, setData] = useState<ItemResponse | null>(null)
  const [story, setStory] = useState<AuctionStoryData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
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
      setData({ ...res.data, bids: res.data.bids ?? [] })
      lastBidCount.current = res.data.item.bid_count
    } catch (err) {
      if (isUnavailable(err)) setNotFound(true)
      else setError(parseApiError(err).message)
    }
  }, [id, itemId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    getAuctionStory(id).then((s) => { if (!cancelled) setStory(s) })
    return () => { cancelled = true }
  }, [id])

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
        <Link href={basePath} className="font-medium text-purple-600 underline">Back to the auction</Link>
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
  const phase =
    auctionStatus === 'live' || auctionStatus === 'closed' || auctionStatus === 'settled' || auctionStatus === 'cancelled'
      ? resolvePhase({ status: auctionStatus })
      : resolvePhase({ phase: story?.auction.phase ?? data.auction.phase, status: auctionStatus, hasItems: true })
  const biddingStarted = phase === 'bidding_open' || phase === 'closed'
  const open = item.status === 'open'
  const images = item.image_urls ?? []
  const orgSlug = story?.auction.org_slug ?? data.auction.org_slug
  const auctionSlug = story?.auction.slug ?? data.auction.slug
  const canonicalPath = orgSlug && auctionSlug ? `/auctions/${orgSlug}/${auctionSlug}/items/${item.id}` : `${basePath}/items/${item.id}`
  const donor = item.donor_name ? (item.donor_business ? `${item.donor_name}, ${item.donor_business}` : item.donor_name) : item.donor_business
  const fulfillment = item.fulfillment_method ? FULFILLMENT_LABELS[item.fulfillment_method] ?? item.fulfillment_method : null
  const hasDetails = !!(item.condition || item.specifications || item.whats_included || item.restrictions || item.expires_on || fulfillment || item.fulfillment_details)

  return (
    <div>
      <Link href={basePath} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {data.auction.title}
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <ItemGallery images={images} title={item.title} />

        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <PhaseBadge phase={phase} />
              {item.lot_number != null && <span className="text-sm text-gray-500">Lot {item.lot_number}</span>}
              {item.category && <span className="text-sm text-gray-500">| {item.category}</span>}
              {!open && biddingStarted && <StatusBadge status={item.status} />}
            </div>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">{item.title}</h1>
            {donor && (
              <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                <DonorAvatar name={item.donor_name} business={item.donor_business} size="md" />
                <span>Generously donated by <strong>{donor}</strong></span>
              </p>
            )}
            <div className="mt-3"><ShareButton path={canonicalPath} title={item.title} /></div>
          </div>

          <div className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">{isAuction ? (biddingStarted && item.bid_count > 0 ? 'Current bid' : 'Starting bid') : 'Price'}</p>
                <p className="text-3xl font-bold text-gray-900" aria-live="polite" aria-atomic="true">
                  {formatUsd(isAuction ? (biddingStarted && item.bid_count > 0 ? item.current_price_cents : item.starting_bid_cents ?? item.current_price_cents) : item.fixed_price_cents)}
                </p>
                {isAuction && biddingStarted && <p className="text-xs text-gray-500">{item.bid_count} bid{item.bid_count === 1 ? '' : 's'}{item.bid_count > 0 && !item.reserve_met ? ' | reserve not yet met' : ''}</p>}
              </div>
              <div className="text-right text-sm">
                {open && isAuction && phase === 'bidding_open' && <Countdown endsAt={item.ends_at} offsetMs={offsetMs} />}
                {open && !isAuction && item.quantity_remaining != null && <span className="text-gray-700">{item.quantity_remaining} remaining</span>}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">Fair market value: {formatUsd(item.fair_market_value_cents)}</p>
          </div>

          <BidPanel auctionId={id} auctionStatus={auctionStatus} startsAt={data.auction.starts_at} basePath={basePath} phase={phase} item={item} me={me} onChanged={onChanged} />

          {item.description && (
            <section aria-labelledby="about-item">
              <h2 id="about-item" className="mb-1 font-semibold text-gray-900">About this item</h2>
              <p className="whitespace-pre-line text-gray-700">{item.description}</p>
            </section>
          )}

          {hasDetails && (
            <section aria-labelledby="item-details" className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
              <h2 id="item-details" className="mb-3 font-semibold text-gray-900">Details</h2>
              <dl className="space-y-3">
                {item.condition && <Detail label="Condition">{item.condition}</Detail>}
                {item.specifications && <Detail label="Size / specifications">{item.specifications}</Detail>}
                {item.whats_included && <Detail label="What's included">{item.whats_included}</Detail>}
                {item.restrictions && <Detail label="Restrictions">{item.restrictions}</Detail>}
                {item.expires_on && <Detail label="Expires">{formatDateOnly(item.expires_on)}</Detail>}
                {(fulfillment || item.fulfillment_details) && (
                  <Detail label="Pickup, delivery or shipping">
                    {[fulfillment, item.fulfillment_details].filter(Boolean).join(': ')}
                  </Detail>
                )}
              </dl>
            </section>
          )}

          {item.is_experience && (item.scheduling_requirements || item.blackout_dates) && (
            <section aria-labelledby="item-experience" className="rounded-xl bg-purple-50 p-5">
              <h2 id="item-experience" className="mb-3 font-semibold text-purple-900">Experience scheduling</h2>
              <dl className="space-y-3">
                {item.scheduling_requirements && <Detail label="Scheduling requirements">{item.scheduling_requirements}</Detail>}
                {item.blackout_dates && <Detail label="Blackout dates">{item.blackout_dates}</Detail>}
              </dl>
            </section>
          )}

          {isAuction && biddingStarted && (
            <section aria-labelledby="bid-history">
              <h2 id="bid-history" className="mb-2 font-semibold text-gray-900">Bid history</h2>
              {data.bids.length === 0 ? (
                <p className="text-sm text-gray-500">No bids yet.{phase === 'bidding_open' ? ' Be the first!' : ''}</p>
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
            </section>
          )}

          <p className="text-xs text-gray-400">
            Winning bidders are charged on the card they save when registering. Taxes and card processing fees, if any, are shown before payment.
          </p>
        </div>
      </div>
    </div>
  )
}
