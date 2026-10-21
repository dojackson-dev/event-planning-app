'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import api from '@/lib/api'
import { AuctionItem, Donation, dollarsToCents, errorMessage, formatUsd } from '../lib'

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100'

interface Props {
  donation: Donation
  onClose: () => void
  onApproved: (donation: Donation, item: AuctionItem | null) => void
}

/** Approving creates the auction item, so the organizer sets its price terms here. */
export default function DonationApproveModal({ donation, onClose, onApproved }: Props) {
  const [startingBid, setStartingBid] = useState('')
  const [increment, setIncrement] = useState('')
  const [reserve, setReserve] = useState('')
  const [buyNow, setBuyNow] = useState('')
  const [category, setCategory] = useState(donation.category ?? '')
  const [lot, setLot] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const start = dollarsToCents(startingBid)
    const inc = dollarsToCents(increment)
    if (!start || start < 1) return setError('Enter a starting bid.')
    if (!inc || inc < 1) return setError('Enter a minimum bid increment.')
    const res = reserve.trim() ? dollarsToCents(reserve) : null
    const bn = buyNow.trim() ? dollarsToCents(buyNow) : null
    if (reserve.trim() && !res) return setError('Enter a valid reserve.')
    if (buyNow.trim() && !bn) return setError('Enter a valid buy-it-now price.')
    if (res && res < start) return setError('The reserve must be at least the starting bid.')
    if (bn && bn <= start) return setError('Buy-it-now must be higher than the starting bid.')
    if (bn && res && bn < res) return setError('Buy-it-now cannot be below the reserve.')

    const body: Record<string, unknown> = { starting_bid_cents: start, increment_cents: inc }
    if (res) body.reserve_cents = res
    if (bn) body.buy_now_cents = bn
    if (category.trim()) body.category = category.trim()
    if (lot.trim()) {
      const n = Number(lot)
      if (!Number.isInteger(n) || n < 1) return setError('Lot number must be a whole number of 1 or more.')
      body.lot_number = n
    }

    setSaving(true)
    try {
      const response = await api.post<{ donation?: Donation; item?: AuctionItem }>(`/auctions/manage/donations/${donation.id}/approve`, body)
      const item = response.data?.item ?? null
      onApproved({ ...donation, ...(response.data?.donation ?? {}), status: 'approved', item_id: item?.id ?? response.data?.donation?.item_id ?? donation.item_id }, item)
    } catch (err) {
      setError(errorMessage(err, 'Could not approve the donation.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="donation-approve-title">
      <form onSubmit={submit} className="mx-auto my-6 w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl" noValidate>
        <div className="flex items-center justify-between">
          <h2 id="donation-approve-title" className="text-lg font-semibold text-gray-900">Approve donation</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-gray-600">
          Approving adds <span className="font-medium">&quot;{donation.title}&quot;</span> to this auction as an item. Set how bidding starts.
          {donation.estimated_value_cents ? ` The donor estimated its value at ${formatUsd(donation.estimated_value_cents)}.` : ''}
        </p>
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="da-start" className="block text-sm font-medium text-gray-700 mb-1">Starting bid (USD)</label>
            <input id="da-start" inputMode="decimal" className={inputClass} value={startingBid} onChange={(e) => setStartingBid(e.target.value)} disabled={saving} required autoFocus />
          </div>
          <div>
            <label htmlFor="da-inc" className="block text-sm font-medium text-gray-700 mb-1">Minimum bid increment (USD)</label>
            <input id="da-inc" inputMode="decimal" className={inputClass} value={increment} onChange={(e) => setIncrement(e.target.value)} disabled={saving} required />
          </div>
          <div>
            <label htmlFor="da-reserve" className="block text-sm font-medium text-gray-700 mb-1">Reserve (optional)</label>
            <input id="da-reserve" inputMode="decimal" className={inputClass} value={reserve} onChange={(e) => setReserve(e.target.value)} disabled={saving} />
          </div>
          <div>
            <label htmlFor="da-buynow" className="block text-sm font-medium text-gray-700 mb-1">Buy-it-now (optional)</label>
            <input id="da-buynow" inputMode="decimal" className={inputClass} value={buyNow} onChange={(e) => setBuyNow(e.target.value)} disabled={saving} />
          </div>
          <div>
            <label htmlFor="da-category" className="block text-sm font-medium text-gray-700 mb-1">Category (optional)</label>
            <input id="da-category" className={inputClass} value={category} maxLength={100} onChange={(e) => setCategory(e.target.value)} disabled={saving} />
          </div>
          <div>
            <label htmlFor="da-lot" className="block text-sm font-medium text-gray-700 mb-1">Lot number (optional)</label>
            <input id="da-lot" inputMode="numeric" className={inputClass} value={lot} onChange={(e) => setLot(e.target.value)} disabled={saving} />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Donor recognition follows the donor&apos;s choice: {donation.recognition_ok ? 'they agreed to be recognized publicly.' : 'they asked not to be named publicly.'}
        </p>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Approve and add item
          </button>
        </div>
      </form>
    </div>
  )
}
