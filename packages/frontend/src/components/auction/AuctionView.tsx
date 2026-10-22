'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Gift, Loader2, Search } from 'lucide-react'
import {
  auctionApi,
  AuctionStoryData,
  getAuctionStory,
  isUnavailable,
  parseApiError,
  PublicAuction,
  PublicItem,
} from '@/lib/auctionApi'
import Countdown from './Countdown'
import { formatDateTime } from './format'
import Gallery from './Gallery'
import ItemCard from './ItemCard'
import { AboutCause, GoalProgress, OrgHero, OrgLinks, SponsorsSection } from './OrgSections'
import PhaseBadge from './PhaseBadge'
import { phaseMessage, resolvePhase } from './phase'
import ShareButton from './ShareButton'
import { useAuctionState } from './useAuctionState'
import { useBidder } from './useBidder'

interface Props {
  auctionId: string
  /** URL prefix of this auction (`/auctions/<uuid>` or `/auctions/<org>/<auction>`); every internal link is built from it. */
  basePath: string
}

export default function AuctionView({ auctionId: id, basePath }: Props) {
  const [data, setData] = useState<{ auction: PublicAuction; items: PublicItem[] } | null>(null)
  const [story, setStory] = useState<AuctionStoryData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const { items: live, auctionState, offsetMs } = useAuctionState(id, !!data)
  const { me, signOut } = useBidder(id)

  const load = useCallback(async () => {
    try {
      setError(null)
      const [res, storyData] = await Promise.all([
        auctionApi.get<{ auction: PublicAuction; items: PublicItem[] }>(`/${id}`),
        getAuctionStory(id),
      ])
      setData({ auction: res.data.auction, items: res.data.items ?? [] })
      setStory(storyData)
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
    return (data?.items ?? []).filter(
      (i) => (!category || i.category === category) && (!q || i.title.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q)),
    )
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
  const org = story?.organization ?? null
  const status = auctionState?.status ?? auction.status
  const endsAt = auctionState?.ends_at ?? auction.ends_at
  // Live status from the poller wins so the page flips to "Bidding Open" / "Auction Closed" without a reload.
  const phase =
    status === 'live' || status === 'closed' || status === 'settled' || status === 'cancelled'
      ? resolvePhase({ status })
      : resolvePhase({ phase: story?.auction.phase ?? auction.phase, status, hasItems: data.items.length > 0 })
  const ended = phase === 'closed'
  const donationsOpen = !ended && (story?.auction.donations_open ?? auction.donations_open ?? phase === 'accepting_donations')
  const biddingStarted = phase === 'bidding_open' || ended
  const orgSlug = story?.auction.org_slug ?? auction.org_slug ?? org?.slug ?? null
  const auctionSlug = story?.auction.slug ?? auction.slug ?? null
  const canonicalPath = orgSlug && auctionSlug ? `/auctions/${orgSlug}/${auctionSlug}` : basePath
  const coverImage = story?.auction.cover_image_url ?? auction.cover_image_url ?? null
  const orgName = org?.name ?? auction.org_name
  const goal = story?.goal_cents ?? org?.goal_cents ?? null

  const scrollToItems = () => {
    const el = document.getElementById('items')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    el?.focus({ preventScroll: true })
  }

  const bidderBar = (
    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 text-sm">
      {me ? (
        <>
          <span className="text-gray-700">Signed in as <strong>{me.bidder.paddle_label ?? me.bidder.display_name}</strong></span>
          {!me.bidder.can_bid && !me.bidder.blocked && (
            <Link href={`${basePath}/register?next=${encodeURIComponent(canonicalPath)}`} className="font-medium text-amber-700 underline">Finish setup to bid</Link>
          )}
          <Link href={`${basePath}/my-bids`} className="font-medium text-purple-700 underline">My bids</Link>
          <button onClick={signOut} className="text-gray-500 underline">Sign out</button>
        </>
      ) : ended ? (
        <Link href={`${basePath}/login`} className="font-medium text-purple-700 underline">Log in to see your orders</Link>
      ) : phase === 'accepting_donations' || phase === 'upcoming' ? null : (
        <>
          <Link href={`${basePath}/register`} className="rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700">Register to bid</Link>
          <Link href={`${basePath}/login`} className="font-medium text-purple-700 underline">I already registered</Link>
        </>
      )}
    </div>
  )

  return (
    <div className="space-y-8">
      <OrgHero
        org={org}
        coverImage={coverImage}
        title={auction.title}
        subtitle={auction.description}
        aside={goal ? <GoalProgress goalCents={goal} raisedCents={story?.raised_cents} /> : undefined}
        eyebrow={
          <div className="flex flex-wrap items-center gap-3">
            <PhaseBadge phase={phase} />
            {orgName && (
              org?.slug ? (
                <Link href={`/auctions/${org.slug}`} className="text-sm font-medium text-purple-700 hover:underline">Benefiting {orgName}</Link>
              ) : (
                <span className="text-sm font-medium text-purple-700">Benefiting {orgName}</span>
              )
            )}
          </div>
        }
      >
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4 text-sm text-gray-600">
          <div>
            {auction.event_title && (
              <p className="text-gray-500">{auction.event_title}{auction.event_date ? ` | ${formatDateTime(auction.event_date)}` : ''}</p>
            )}
            {phase === 'bidding_open' ? (
              <p className="text-base"><Countdown endsAt={endsAt} offsetMs={offsetMs} prefix="Auction ends in" /></p>
            ) : ended ? (
              <p>This auction has ended.</p>
            ) : (
              auction.starts_at && <p className="text-gray-700">Bidding opens {formatDateTime(auction.starts_at)}</p>
            )}
            {endsAt && <p className="text-gray-500">{ended ? 'Ended' : 'Ends'} {formatDateTime(endsAt)}</p>}
            {donationsOpen && story?.auction.donations_close_at && (
              <p className="text-gray-500">Donations accepted until {formatDateTime(story.auction.donations_close_at)}</p>
            )}
          </div>
          {!biddingStarted && <p className="max-w-md rounded-lg bg-gray-50 p-3 text-gray-700">{phaseMessage(phase, auction.starts_at)}</p>}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={scrollToItems} className="rounded-lg bg-purple-600 px-5 py-2.5 font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
            Browse Items
          </button>
          {donationsOpen && (
            <Link href={`${basePath}/donate`} className="inline-flex items-center gap-2 rounded-lg border border-purple-300 bg-white px-5 py-2.5 font-medium text-purple-700 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500">
              <Gift className="h-4 w-4" aria-hidden="true" /> Donate an Item
            </Link>
          )}
          <ShareButton path={canonicalPath} title={auction.title} />
          {org && <OrgLinks org={org} />}
        </div>
        {bidderBar}
      </OrgHero>

      {org && <AboutCause org={org} />}
      {story && <Gallery images={story.gallery} />}

      <section id="items" tabIndex={-1} aria-labelledby="items-heading" className="scroll-mt-4 focus:outline-none">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 id="items-heading" className="mr-auto text-2xl font-bold text-gray-900">Items ({visible.length})</h2>
          <div className="relative">
            <label className="sr-only" htmlFor="search">Search items</label>
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
            <input id="search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items" className="rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500" />
          </div>
          {categories.length > 0 && (
            <>
              <label className="sr-only" htmlFor="category">Category</label>
              <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500">
                <option value="">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </>
          )}
        </div>
        {visible.length === 0 ? (
          <p className="rounded-xl bg-white py-12 text-center text-gray-500 ring-1 ring-gray-200">
            {data.items.length === 0
              ? phase === 'accepting_donations'
                ? 'Items will appear here as the organizers approve donations.'
                : 'No items have been added yet.'
              : 'No items match your search.'}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <li key={item.id}><ItemCard item={item} live={live[item.id]} offsetMs={offsetMs} basePath={basePath} biddingOpen={biddingStarted} /></li>
            ))}
          </ul>
        )}
      </section>

      {story && <SponsorsSection sponsors={story.sponsors} />}
    </div>
  )
}
