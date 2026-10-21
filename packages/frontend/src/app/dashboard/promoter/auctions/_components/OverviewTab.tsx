'use client'

import ShareBlock from './ShareBlock'
import { Auction, AuctionSummary, formatUsd } from '../lib'
import { ReportState, useReport } from './useReport'

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-xl font-bold text-gray-900">{value}</dd>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

export default function OverviewTab({ auctionId, refreshKey, auction, itemCount }: { auctionId: string; refreshKey: number; auction?: Auction; itemCount?: number }) {
  const { data, loading, error, reload } = useReport<AuctionSummary | null>(`/auctions/manage/${auctionId}/summary?k=${refreshKey}`, null)

  const share = auction ? <ShareBlock auction={auction} itemCount={itemCount} /> : null

  if (!data) {
    return (
      <div className="space-y-6">
        {share}
        <ReportState loading={loading} error={error} onRetry={reload} empty={false} emptyText="" />
      </div>
    )
  }

  const { items, bidders, revenue, orders } = data
  return (
    <div className="space-y-6">
      {share}
      {data.reserve_pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">{data.reserve_pending.length} item{data.reserve_pending.length === 1 ? '' : 's'} waiting for your decision</p>
          <p className="mt-1">The top bid did not reach the reserve. Open the Items tab to accept or decline. The auction cannot settle until you decide.</p>
        </div>
      )}

      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Paid to you" value={formatUsd(revenue.paid_subtotal_cents)} hint="Before fees and tax" />
        <Stat label="Hammer total" value={formatUsd(revenue.hammer_total_cents)} hint="Auction items sold" />
        <Stat label="Fixed-price sales" value={formatUsd(revenue.fixed_sales_cents)} />
        <Stat label="Outstanding" value={formatUsd(revenue.outstanding_cents)} hint="Unpaid orders" />
        <Stat label="Registered bidders" value={String(bidders.registered)} hint={`${bidders.card_ready} with a card on file`} />
        <Stat label="Bids placed" value={String(data.bids.total)} />
        <Stat label="Items" value={String(items.total ?? 0)} hint={`${items.sold ?? 0} sold, ${items.open ?? 0} open`} />
        <Stat label="Defaulted" value={formatUsd(revenue.defaulted_cents)} hint={`${orders.defaulted ?? 0} order${(orders.defaulted ?? 0) === 1 ? '' : 's'}`} />
      </dl>
    </div>
  )
}
