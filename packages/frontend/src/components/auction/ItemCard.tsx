'use client'

import Link from 'next/link'
import { Gavel } from 'lucide-react'
import { ItemState, PublicItem } from '@/lib/auctionApi'
import Countdown from './Countdown'
import { formatUsd } from './format'
import StatusBadge from './StatusBadge'

interface Props {
  item: PublicItem
  live?: ItemState
  offsetMs: number
}

export default function ItemCard({ item: base, live, offsetMs }: Props) {
  const item = { ...base, ...(live ?? {}) }
  const isAuction = item.sale_mode === 'auction'
  const open = item.status === 'open'
  const image = item.image_urls[0]
  const priceLabel = isAuction ? (item.bid_count > 0 ? 'Current bid' : 'Starting bid') : 'Price'
  const price = isAuction ? (item.bid_count > 0 ? item.current_price_cents : item.starting_bid_cents ?? item.current_price_cents) : item.fixed_price_cents

  return (
    <Link
      href={`/auctions/${item.auction_id}/items/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500"
    >
      <div className="relative aspect-[4/3] bg-gray-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300"><Gavel className="h-10 w-10" aria-hidden="true" /></div>
        )}
        {item.lot_number != null && <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs font-medium text-white">Lot {item.lot_number}</span>}
        {item.you_are_leading && open && <span className="absolute right-2 top-2 rounded bg-green-600 px-2 py-0.5 text-xs font-medium text-white">You are winning</span>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-purple-700">{item.title}</h3>
        {item.category && <p className="text-xs text-gray-500">{item.category}</p>}
        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500">{priceLabel}</p>
            <p className="text-lg font-bold text-gray-900" aria-live="polite">{formatUsd(price)}</p>
            {isAuction && item.bid_count > 0 && <p className="text-xs text-gray-500">{item.bid_count} bid{item.bid_count === 1 ? '' : 's'}</p>}
          </div>
          <div className="text-right text-xs">
            {open ? (
              isAuction ? <Countdown endsAt={item.ends_at} offsetMs={offsetMs} /> : item.quantity_remaining != null && <span className="text-gray-600">{item.quantity_remaining} left</span>
            ) : (
              <StatusBadge status={item.status} />
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
