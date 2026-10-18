'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import ConfirmDialog from '@/app/dashboard/promoter/auctions/_components/ConfirmDialog'
import {
  auctionApi,
  bidderHeaders,
  BidderMe,
  ChargeResult,
  ItemState,
  parseApiError,
  PlaceBidResponse,
  PublicItem,
} from '@/lib/auctionApi'
import { dollarsToCents, formatUsd } from './format'

interface Props {
  auctionId: string
  auctionStatus: string
  startsAt: string | null
  item: PublicItem & Partial<ItemState>
  me: BidderMe | null
  /** Called after any successful action so the page refreshes state, profile and bid feed. */
  onChanged: () => void
}

type Pending =
  | { kind: 'bid'; amountCents: number; confirmLarge: boolean }
  | { kind: 'buy-now' }
  | { kind: 'purchase'; quantity: number }

const OUTCOME_MESSAGE: Record<PlaceBidResponse['outcome'], string> = {
  leading: 'Your bid is placed. You are the high bidder.',
  outbid: 'Your bid was placed, but another bidder has a higher maximum. Bid again to take the lead.',
  max_raised: 'Your maximum bid was raised.',
}

function chargeMessage(charge: ChargeResult | null | undefined): { text: string; ok: boolean; payUrl?: string } {
  if (!charge) return { text: 'Purchase recorded. You will receive payment instructions by email.', ok: true }
  switch (charge.status) {
    case 'paid':
      return { text: 'Purchase complete. Your card was charged and a receipt is on its way.', ok: true }
    case 'requires_action':
      return { text: 'Your bank needs one more step to approve this payment.', ok: false, payUrl: charge.payUrl }
    case 'failed':
      return { text: 'Your card could not be charged. Use the link we emailed to pay another way.', ok: false, payUrl: charge.payUrl }
    default:
      return { text: 'Purchase recorded. Your payment is processing.', ok: true }
  }
}

export default function BidPanel({ auctionId, auctionStatus, startsAt, item, me, onChanged }: Props) {
  const isAuction = item.sale_mode === 'auction'
  const open = item.status === 'open'
  const minNext = item.min_next_bid_cents
  const [amount, setAmount] = useState('')
  const [touched, setTouched] = useState(false)
  const [mode, setMode] = useState<'manual' | 'max'>('manual')
  const [quantity, setQuantity] = useState(1)
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [result, setResult] = useState<{ text: string; ok: boolean; payUrl?: string } | null>(null)

  useEffect(() => {
    if (!touched && minNext != null) setAmount((minNext / 100).toFixed(2))
  }, [minNext, touched])

  const returnHref = (path: string) => `/auctions/${auctionId}/${path}?next=${encodeURIComponent(`/auctions/${auctionId}/items/${item.id}`)}`

  if (!open) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700">
        {item.status === 'sold' ? 'This item has been sold.' : item.status === 'reserve_not_met' ? 'Bidding ended and the reserve was not met.' : 'Bidding on this item has ended.'}
        {item.you_are_leading && <p className="mt-2 font-medium text-green-700">You won this item. Check My bids for payment details.</p>}
      </div>
    )
  }

  if (auctionStatus === 'scheduled') {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
        Bidding has not started yet.{startsAt ? ` It opens ${new Date(startsAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}.` : ''}
        {!me && (
          <p className="mt-2">
            <Link href={returnHref('register')} className="font-medium underline">Register now</Link> so you are ready to bid.
          </p>
        )}
      </div>
    )
  }

  if (!me) {
    return (
      <div className="rounded-xl border border-purple-200 bg-purple-50 p-5 text-sm">
        <p className="font-medium text-purple-900">Register to bid</p>
        <p className="mt-1 text-purple-800">Verify your email and phone and save a card. Your card is only charged for items you win or buy.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href={returnHref('register')} className="rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700">Register</Link>
          <Link href={returnHref('login')} className="rounded-lg border border-purple-300 px-4 py-2 font-medium text-purple-700 hover:bg-white">I already registered</Link>
        </div>
      </div>
    )
  }

  if (!me.bidder.can_bid) {
    return (
      <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        {me.bidder.blocked ? (
          'Your bidder account cannot place bids on this auction. Contact the organizer if you think this is a mistake.'
        ) : (
          <>
            Finish setting up your account to bid{!me.bidder.verified ? ' (verification needed)' : ' (a card on file is needed)'}.
            <p className="mt-2"><Link href={returnHref('register')} className="font-medium underline">Continue registration</Link></p>
          </>
        )}
      </div>
    )
  }

  const amountCents = dollarsToCents(amount)
  const maxQuantity = Math.max(1, Math.min(item.quantity_remaining ?? 1, item.per_bidder_limit ?? 100, 20))

  const run = async (p: Pending) => {
    setBusy(true)
    setDialogError(null)
    setError(null)
    try {
      const headers = bidderHeaders(auctionId)
      if (p.kind === 'bid') {
        const res = await auctionApi.post<PlaceBidResponse>(`/items/${item.id}/bids`, { amountCents: p.amountCents, mode, confirmLargeBid: p.confirmLarge }, { headers })
        setResult({
          text: `${OUTCOME_MESSAGE[res.data.outcome]}${res.data.extended ? ' Bidding was extended.' : ''}`,
          ok: res.data.outcome !== 'outbid',
        })
        setTouched(false)
      } else if (p.kind === 'buy-now') {
        const res = await auctionApi.post<{ charge: ChargeResult | null }>(`/items/${item.id}/buy-now`, {}, { headers })
        setResult(chargeMessage(res.data.charge))
      } else {
        const res = await auctionApi.post<{ charge: ChargeResult | null }>(`/items/${item.id}/purchase`, { quantity: p.quantity }, { headers })
        setResult(chargeMessage(res.data.charge))
      }
      setPending(null)
      onChanged()
    } catch (err) {
      const failure = parseApiError(err)
      if (failure.code === 'large_bid_confirmation_required' && p.kind === 'bid') {
        setPending({ ...p, confirmLarge: true })
        setDialogError(null)
      } else {
        const hint = typeof failure.data.min_next_bid_cents === 'number' ? ` The minimum bid is now ${formatUsd(failure.data.min_next_bid_cents)}.` : ''
        const text = `${failure.message}${failure.code === 'bid_too_low' ? hint : ''}`
        if (pending) setDialogError(text)
        else setError(text)
        if (failure.code === 'bid_too_low' || failure.code === 'item_closed') {
          setPending(null)
          setError(text)
          onChanged()
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const startBid = () => {
    setResult(null)
    setError(null)
    if (amountCents == null || amountCents < 1) {
      setError('Enter a valid amount, for example 125.00.')
      return
    }
    if (minNext != null && mode === 'manual' && amountCents < minNext) {
      setError(`Your bid must be at least ${formatUsd(minNext)}.`)
      return
    }
    setPending({ kind: 'bid', amountCents, confirmLarge: false })
  }

  const dialog = (() => {
    if (!pending) return null
    if (pending.kind === 'bid') {
      const large = pending.confirmLarge
      return {
        title: large ? 'Confirm this large bid' : mode === 'max' ? 'Confirm your maximum bid' : 'Confirm your bid',
        message: large ? (
          <>You are bidding <strong>{formatUsd(pending.amountCents)}</strong>, which is well above the current price. Make sure the amount is correct. Bids cannot be retracted.</>
        ) : mode === 'max' ? (
          <>We will bid for you, one increment at a time, up to <strong>{formatUsd(pending.amountCents)}</strong>. If you win, your card on file is charged the winning price, plus any applicable tax and fees. Bids cannot be retracted.</>
        ) : (
          <>You are bidding <strong>{formatUsd(pending.amountCents)}</strong> on {item.title}. If you win, your card on file is charged this amount plus any applicable tax and fees. Bids cannot be retracted.</>
        ),
        label: large ? 'Yes, place large bid' : 'Place bid',
      }
    }
    if (pending.kind === 'buy-now') {
      return {
        title: 'Confirm buy it now',
        message: <>Buy {item.title} for <strong>{formatUsd(item.buy_now_cents)}</strong>? Your card on file is charged right away, plus any applicable tax and fees.</>,
        label: 'Buy now',
      }
    }
    return {
      title: 'Confirm purchase',
      message: <>Buy {pending.quantity} x {item.title} for <strong>{formatUsd((item.fixed_price_cents ?? 0) * pending.quantity)}</strong>? Your card on file is charged right away, plus any applicable tax and fees.</>,
      label: 'Buy',
    }
  })()

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div aria-live="polite" className="sr-only">{item.you_are_leading ? 'You are the high bidder.' : ''}</div>
      {isAuction && item.you_are_leading && (
        <p className="mb-3 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800"><CheckCircle2 className="h-4 w-4" /> You are the high bidder.</p>
      )}
      {isAuction && !item.you_are_leading && item.bid_count > 0 && (
        <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">You are not the high bidder.</p>
      )}

      {result && (
        <div role="status" className={`mb-3 rounded-lg p-3 text-sm ${result.ok ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900'}`}>
          {result.text}
          {result.payUrl && <a href={result.payUrl} className="ml-1 font-medium underline">Complete payment</a>}
        </div>
      )}
      {error && <p role="alert" className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</p>}

      {isAuction ? (
        <form onSubmit={(e) => { e.preventDefault(); startBid() }} className="space-y-3">
          <fieldset>
            <legend className="sr-only">Bid type</legend>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="radio" name="mode" checked={mode === 'manual'} onChange={() => setMode('manual')} /> Bid now</label>
              <label className="flex items-center gap-2"><input type="radio" name="mode" checked={mode === 'max'} onChange={() => setMode('max')} /> Set a maximum</label>
            </div>
          </fieldset>
          <div>
            <label htmlFor="bid-amount" className="mb-1 block text-sm font-medium text-gray-700">{mode === 'max' ? 'Your maximum bid' : 'Your bid'}</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input id="bid-amount" inputMode="decimal" value={amount} onChange={(e) => { setTouched(true); setAmount(e.target.value) }} className="w-full rounded-lg border border-gray-300 py-2 pl-7 pr-3 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500" />
            </div>
            {minNext != null && <p className="mt-1 text-xs text-gray-500">Minimum next bid: {formatUsd(minNext)}</p>}
            {mode === 'max' && <p className="mt-1 text-xs text-gray-500">We bid the minimum needed to keep you in the lead, up to this amount.</p>}
          </div>
          <button type="submit" className="w-full rounded-lg bg-purple-600 py-2.5 font-medium text-white hover:bg-purple-700">{mode === 'max' ? 'Set maximum bid' : 'Place bid'}</button>
          {item.buy_now_available && item.buy_now_cents != null && (
            <button type="button" onClick={() => { setResult(null); setPending({ kind: 'buy-now' }) }} className="w-full rounded-lg border border-purple-300 py-2.5 font-medium text-purple-700 hover:bg-purple-50">
              Buy it now for {formatUsd(item.buy_now_cents)}
            </button>
          )}
        </form>
      ) : (
        <div className="space-y-3">
          {maxQuantity > 1 && (
            <div>
              <label htmlFor="qty" className="mb-1 block text-sm font-medium text-gray-700">Quantity</label>
              <select id="qty" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value, 10))} className="rounded-lg border border-gray-300 px-3 py-2">
                {Array.from({ length: maxQuantity }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}
          <button type="button" onClick={() => { setResult(null); setPending({ kind: 'purchase', quantity }) }} className="w-full rounded-lg bg-purple-600 py-2.5 font-medium text-white hover:bg-purple-700">
            Buy for {formatUsd((item.fixed_price_cents ?? 0) * quantity)}
          </button>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500">
        Bidding as {me.bidder.paddle_label ?? me.bidder.display_name}. Your remaining bidding limit is {formatUsd(me.exposure.remaining_cents)}.
      </p>

      <ConfirmDialog
        open={!!pending && !!dialog}
        title={dialog?.title ?? ''}
        message={dialog?.message}
        confirmLabel={dialog?.label ?? 'Confirm'}
        busy={busy}
        error={dialogError}
        onConfirm={() => pending && run(pending)}
        onCancel={() => { setPending(null); setDialogError(null) }}
      />
    </div>
  )
}
