'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { isUnavailable, parseApiError, resolveAuction, ResolvedAuction } from '@/lib/auctionApi'
import AuctionView from './AuctionView'
import DonateView from './DonateView'
import ItemView from './ItemView'
import LoginView from './LoginView'
import MyBidsView from './MyBidsView'
import RegisterView from './RegisterView'

export type SlugView = 'auction' | 'item' | 'register' | 'login' | 'my-bids' | 'donate'

interface Props {
  orgSlug: string
  auctionSlug: string
  view: SlugView
  itemId?: string
}

/** Resolves `<org-slug>/<auction-slug>` to the auction id, then renders the shared view on the slug URL scheme. */
export default function SlugRoute({ orgSlug, auctionSlug, view, itemId }: Props) {
  const [resolved, setResolved] = useState<ResolvedAuction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const resolve = useCallback(async () => {
    setError(null)
    try {
      setResolved(await resolveAuction(orgSlug, auctionSlug))
    } catch (err) {
      if (isUnavailable(err)) setNotFound(true)
      else setError(parseApiError(err).message)
    }
  }, [orgSlug, auctionSlug])

  useEffect(() => {
    resolve()
  }, [resolve])

  if (notFound) {
    return (
      <div className="py-16 text-center">
        <p className="mb-3 text-gray-600">This auction could not be found or is not available.</p>
        <Link href={`/auctions/${orgSlug}`} className="mr-4 font-medium text-purple-600 underline">View the organization</Link>
        <Link href="/auctions" className="font-medium text-purple-600 underline">See all auctions</Link>
      </div>
    )
  }
  if (error) {
    return (
      <div className="py-16 text-center">
        <p role="alert" className="mb-3 text-gray-600">{error}</p>
        <button onClick={resolve} className="font-medium text-purple-600 underline">Try again</button>
      </div>
    )
  }
  if (!resolved) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-purple-600" aria-label="Loading auction" /></div>
  }

  const auctionId = resolved.auctionId
  const basePath = `/auctions/${orgSlug}/${auctionSlug}`

  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-purple-600" aria-label="Loading" /></div>}>
      {view === 'auction' && <AuctionView auctionId={auctionId} basePath={basePath} />}
      {view === 'item' && itemId && <ItemView auctionId={auctionId} itemId={itemId} basePath={basePath} />}
      {view === 'register' && <RegisterView auctionId={auctionId} basePath={basePath} />}
      {view === 'login' && <LoginView auctionId={auctionId} basePath={basePath} />}
      {view === 'my-bids' && <MyBidsView auctionId={auctionId} basePath={basePath} />}
      {view === 'donate' && <DonateView auctionId={auctionId} basePath={basePath} />}
    </Suspense>
  )
}
