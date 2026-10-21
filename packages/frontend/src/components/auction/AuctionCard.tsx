import Link from 'next/link'
import { Gavel } from 'lucide-react'
import type { PublicAuctionCard } from '@/lib/auctionApi'
import { formatDateTime, formatUsd } from './format'
import PhaseBadge from './PhaseBadge'

function dateLine(a: PublicAuctionCard): string {
  if (a.phase === 'closed') return a.ends_at ? `Ended ${formatDateTime(a.ends_at)}` : 'Ended'
  if (a.phase === 'bidding_open') return a.ends_at ? `Closes ${formatDateTime(a.ends_at)}` : 'Bidding is open'
  if (a.starts_at) return `Bidding opens ${formatDateTime(a.starts_at)}`
  return 'Dates to be announced'
}

/** Server-renderable card linking to the slug URL when available, otherwise the legacy UUID URL. */
export default function AuctionCard({ auction, orgSlug }: { auction: PublicAuctionCard; orgSlug: string | null | undefined }) {
  const href = orgSlug && auction.slug ? `/auctions/${orgSlug}/${auction.slug}` : `/auctions/${auction.id}`
  return (
    <Link href={href} className="group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500">
      <div className="aspect-[16/9] bg-gradient-to-br from-purple-100 to-indigo-100">
        {auction.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={auction.cover_image_url} alt="" loading="lazy" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-purple-300"><Gavel className="h-10 w-10" aria-hidden="true" /></div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <PhaseBadge phase={auction.phase} className="self-start" />
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-700">{auction.title}</h3>
        {auction.description && <p className="line-clamp-2 text-sm text-gray-600">{auction.description}</p>}
        <div className="mt-auto pt-2 text-sm text-gray-600">
          <p>{dateLine(auction)}</p>
          <p className="text-gray-500">
            {auction.item_count} item{auction.item_count === 1 ? '' : 's'}
            {auction.bid_total_cents ? ` | ${formatUsd(auction.bid_total_cents)} in bids` : ''}
          </p>
        </div>
      </div>
    </Link>
  )
}
