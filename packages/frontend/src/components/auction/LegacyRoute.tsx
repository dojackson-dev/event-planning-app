import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { UUID_RE } from '@/lib/auctionApi'
import AuctionView from './AuctionView'
import DonateView from './DonateView'
import ItemView from './ItemView'
import LoginView from './LoginView'
import MyBidsView from './MyBidsView'
import RegisterView from './RegisterView'
import type { SlugView } from './SlugRoute'

/** Legacy `/auctions/<auction-uuid>/...` routes: the id comes straight from the URL, no slug resolution needed. */
export default function LegacyRoute({ id, view, itemId }: { id: string; view: SlugView; itemId?: string }) {
  if (!UUID_RE.test(id)) notFound()
  const basePath = `/auctions/${id}`
  return (
    <Suspense fallback={null}>
      {view === 'auction' && <AuctionView auctionId={id} basePath={basePath} />}
      {view === 'item' && itemId && <ItemView auctionId={id} itemId={itemId} basePath={basePath} />}
      {view === 'register' && <RegisterView auctionId={id} basePath={basePath} />}
      {view === 'login' && <LoginView auctionId={id} basePath={basePath} />}
      {view === 'my-bids' && <MyBidsView auctionId={id} basePath={basePath} />}
      {view === 'donate' && <DonateView auctionId={id} basePath={basePath} />}
    </Suspense>
  )
}
