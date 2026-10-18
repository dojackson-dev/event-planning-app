'use client'

import { BidRow, formatDateTime, formatUsd } from '../lib'
import { ReportState, useReport } from './useReport'

export default function BidsTab({ auctionId, refreshKey }: { auctionId: string; refreshKey: number }) {
  const { data, loading, error, reload } = useReport<BidRow[]>(`/auctions/manage/${auctionId}/bids?k=${refreshKey}`, [])

  return (
    <div>
      <ReportState loading={loading} error={error} onRetry={reload} empty={!loading && !error && data.length === 0} emptyText="No bids yet." />
      {!loading && !error && data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Lot</th>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2">Bidder</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((b) => (
                <tr key={b.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-500">{formatDateTime(b.created_at)}</td>
                  <td className="px-4 py-2">{b.lot_number ?? '-'}</td>
                  <td className="px-4 py-2">{b.item_title ?? '-'}</td>
                  <td className="px-4 py-2">
                    <span className="font-medium text-gray-800">{b.paddle_number ? `#${b.paddle_number} ` : ''}{b.bidder_name ?? 'Unknown'}</span>
                    {b.kind === 'proxy_auto' && <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">auto-bid</span>}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{formatUsd(b.amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
