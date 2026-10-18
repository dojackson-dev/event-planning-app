'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { auctionApi, bidderHeaders, BidderOrder, clearBidderToken, parseApiError, PublicItem } from '@/lib/auctionApi'
import Countdown from '@/components/auction/Countdown'
import { formatDateTime, formatUsd } from '@/components/auction/format'
import { useAuctionState } from '@/components/auction/useAuctionState'
import { useBidder } from '@/components/auction/useBidder'

const ORDER_LABEL: Record<string, string> = {
  pending: 'Payment pending',
  processing: 'Processing',
  requires_action: 'Action needed',
  failed: 'Payment failed',
  paid: 'Paid',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  defaulted: 'Unpaid',
}

export default function MyBidsPage() {
  const { id } = useParams<{ id: string }>()
  const { me, loading, error: meError, signOut } = useBidder(id)
  const { offsetMs } = useAuctionState(id, !!me)
  const [orders, setOrders] = useState<BidderOrder[] | null>(null)
  const [titles, setTitles] = useState<Record<string, PublicItem>>({})
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const [o, a] = await Promise.all([
        auctionApi.get<{ orders: BidderOrder[] }>('/bidder/orders', { headers: bidderHeaders(id) }),
        auctionApi.get<{ items: PublicItem[] }>(`/${id}`),
      ])
      setOrders(o.data.orders)
      setTitles(Object.fromEntries(a.data.items.map((i) => [i.id, i])))
    } catch (err) {
      const failure = parseApiError(err)
      if (failure.status === 401) clearBidderToken(id)
      setError(failure.message)
    }
  }, [id])

  useEffect(() => {
    if (me) load()
  }, [me, load])

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-purple-600" aria-label="Loading" /></div>
  }
  if (!me) {
    return (
      <div className="py-16 text-center">
        <p className="mb-3 text-gray-600">{meError ?? 'Log in to see your bids and orders.'}</p>
        <Link href={`/auctions/${id}/login?next=${encodeURIComponent(`/auctions/${id}/my-bids`)}`} className="font-medium text-purple-600 underline">Log in</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/auctions/${id}`} className="text-sm text-gray-500 hover:text-gray-700">Back to the auction</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">My bids</h1>
        <button onClick={() => { signOut() }} className="text-sm text-gray-500 underline">Sign out</button>
      </div>
      <p className="text-sm text-gray-600">
        {me.bidder.display_name}{me.bidder.paddle_label ? ` (${me.bidder.paddle_label})` : ''}
        {me.bidder.card_last4 ? ` | ${me.bidder.card_brand ?? 'Card'} ending ${me.bidder.card_last4}` : ''}
      </p>

      <section className="mt-6 rounded-xl bg-white p-5 ring-1 ring-gray-200">
        <h2 className="font-semibold text-gray-900">Bidding limit</h2>
        <p className="mt-1 text-sm text-gray-600">
          {formatUsd(me.exposure.remaining_cents)} remaining of {formatUsd(me.exposure.limit_cents)}. Standing bids {formatUsd(me.exposure.standing_bids_cents)}, unpaid wins {formatUsd(me.exposure.unpaid_wins_cents)}.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 font-semibold text-gray-900">Items you are winning</h2>
        {me.leading_items.length === 0 ? (
          <p className="rounded-xl bg-white p-5 text-sm text-gray-500 ring-1 ring-gray-200">You are not the high bidder on any open item.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl bg-white ring-1 ring-gray-200">
            {me.leading_items.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <Link href={`/auctions/${id}/items/${l.id}`} className="font-medium text-purple-700 hover:underline">{titles[l.id]?.title ?? 'View item'}</Link>
                <span className="text-right">
                  <span className="block font-semibold text-gray-900">{formatUsd(l.current_price_cents)}</span>
                  <span className="text-xs"><Countdown endsAt={l.ends_at} offsetMs={offsetMs} /></span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 font-semibold text-gray-900">Orders</h2>
        {error ? (
          <p role="alert" className="rounded-xl bg-white p-5 text-sm text-red-600 ring-1 ring-gray-200">{error} <button onClick={load} className="font-medium underline">Try again</button></p>
        ) : !orders ? (
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" aria-label="Loading orders" />
        ) : orders.length === 0 ? (
          <p className="rounded-xl bg-white p-5 text-sm text-gray-500 ring-1 ring-gray-200">No orders yet. Items you win or buy appear here.</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{o.auction_title}</p>
                    <p className="text-xs text-gray-500">Ordered {formatDateTime(o.created_at)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${o.status === 'paid' ? 'bg-green-100 text-green-800' : o.status === 'failed' || o.status === 'defaulted' || o.status === 'requires_action' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>
                    {ORDER_LABEL[o.status] ?? o.status}
                  </span>
                </div>
                <ul className="mt-3 text-sm text-gray-700">
                  {o.items.map((i, n) => (
                    <li key={n} className="flex justify-between"><span>{i.lot_number ? `Lot ${i.lot_number}: ` : ''}{i.title}{i.quantity > 1 ? ` x${i.quantity}` : ''}</span><span>{formatUsd(i.price_cents * i.quantity)}</span></li>
                  ))}
                </ul>
                <div className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600">
                  {o.tax_cents > 0 && <p className="flex justify-between"><span>Tax</span><span>{formatUsd(o.tax_cents)}</span></p>}
                  {o.processing_fee_cents > 0 && <p className="flex justify-between"><span>Processing fee</span><span>{formatUsd(o.processing_fee_cents)}</span></p>}
                  <p className="flex justify-between font-semibold text-gray-900"><span>Total</span><span>{formatUsd(o.total_cents > 0 ? o.total_cents : o.subtotal_cents)}</span></p>
                </div>
                {o.status === 'paid' ? (
                  <p className="mt-2 text-xs text-gray-500">Paid {formatDateTime(o.paid_at)}</p>
                ) : o.status !== 'cancelled' && o.status !== 'refunded' ? (
                  <p className="mt-2 text-xs text-gray-500">Pay by {formatDateTime(o.pay_by_at)}. If your card could not be charged, use the payment link we emailed and texted you.</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
