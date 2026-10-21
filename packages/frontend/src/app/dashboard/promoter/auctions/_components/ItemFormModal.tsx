'use client'

import { useRef, useState } from 'react'
import { Loader2, X, ImagePlus } from 'lucide-react'
import api from '@/lib/api'
import {
  AuctionItem,
  FULFILLMENT_LABEL,
  FulfillmentMethod,
  SaleMode,
  centsToDollars,
  dollarsToCents,
  errorMessage,
} from '../lib'

const MAX_IMAGES = 5
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

interface Props {
  auctionId: string
  /** Existing item when editing. */
  item?: AuctionItem
  onClose: () => void
  onSaved: () => void
}

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:text-gray-500'

export default function ItemFormModal({ auctionId, item, onClose, onSaved }: Props) {
  const editing = !!item
  // The backend freezes price terms once bids exist and the sale mode/price once something sold.
  const priceLocked = (item?.bid_count ?? 0) > 0
  const modeLocked = priceLocked || (item?.quantity_sold ?? 0) > 0

  const [saleMode, setSaleMode] = useState<SaleMode>(item?.sale_mode ?? 'auction')
  const [title, setTitle] = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [category, setCategory] = useState(item?.category ?? '')
  const [donor, setDonor] = useState(item?.donor_name ?? '')
  const [images, setImages] = useState<string[]>(item?.image_urls ?? [])
  const [fmv, setFmv] = useState(centsToDollars(item?.fair_market_value_cents ?? undefined))
  const [taxCode, setTaxCode] = useState(item?.tax_code ?? '')
  const [lot, setLot] = useState(item?.lot_number ? String(item.lot_number) : '')
  const [startingBid, setStartingBid] = useState(centsToDollars(item?.starting_bid_cents))
  const [reserve, setReserve] = useState(centsToDollars(item?.reserve_cents))
  const [increment, setIncrement] = useState(centsToDollars(item?.increment_cents))
  const [buyNow, setBuyNow] = useState(centsToDollars(item?.buy_now_cents))
  const [fixedPrice, setFixedPrice] = useState(centsToDollars(item?.fixed_price_cents))
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1))
  const [perBidder, setPerBidder] = useState(item?.per_bidder_limit ? String(item.per_bidder_limit) : '')
  const [condition, setCondition] = useState(item?.condition ?? '')
  const [specifications, setSpecifications] = useState(item?.specifications ?? '')
  const [whatsIncluded, setWhatsIncluded] = useState(item?.whats_included ?? '')
  const [restrictions, setRestrictions] = useState(item?.restrictions ?? '')
  const [expiresOn, setExpiresOn] = useState(item?.expires_on ? item.expires_on.slice(0, 10) : '')
  const [fulfillment, setFulfillment] = useState<FulfillmentMethod | ''>(item?.fulfillment_method ?? '')
  const [fulfillmentDetails, setFulfillmentDetails] = useState(item?.fulfillment_details ?? '')
  const [isExperience, setIsExperience] = useState(item?.is_experience ?? false)
  const [scheduling, setScheduling] = useState(item?.scheduling_requirements ?? '')
  const [blackout, setBlackout] = useState(item?.blackout_dates ?? '')
  const [donorBusiness, setDonorBusiness] = useState(item?.donor_business ?? '')
  const [recognizeDonor, setRecognizeDonor] = useState(item?.donor_recognition ?? true)

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const uploadImage = async (file: File) => {
    if (images.length >= MAX_IMAGES) return setError(`You can add up to ${MAX_IMAGES} photos.`)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setError('Photos must be JPEG, PNG or WebP.')
    if (file.size > MAX_UPLOAD_BYTES) return setError('Each photo must be under 5 MB.')
    setError(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post<{ url: string }>('/auctions/manage/upload/item-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImages((prev) => [...prev, res.data.url])
    } catch (err) {
      setError(errorMessage(err, 'Photo upload failed.'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) return setError('Enter a title.')
    const fmvCents = dollarsToCents(fmv)
    if (fmvCents === null) return setError('Enter the fair market value (use 0 if the item has none).')

    const body: Record<string, unknown> = {
      sale_mode: saleMode,
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      donor_name: donor.trim() || null,
      image_urls: images,
      fair_market_value_cents: fmvCents,
      tax_code: taxCode.trim() || null,
      condition: condition.trim() || null,
      specifications: specifications.trim() || null,
      whats_included: whatsIncluded.trim() || null,
      restrictions: restrictions.trim() || null,
      expires_on: expiresOn || null,
      fulfillment_method: fulfillment || null,
      fulfillment_details: fulfillmentDetails.trim() || null,
      is_experience: isExperience,
      scheduling_requirements: isExperience ? scheduling.trim() || null : null,
      blackout_dates: isExperience ? blackout.trim() || null : null,
      donor_business: donorBusiness.trim() || null,
      donor_recognition: recognizeDonor,
    }
    if (lot.trim()) {
      const n = Number(lot)
      if (!Number.isInteger(n) || n < 1) return setError('Lot number must be a whole number of 1 or more.')
      body.lot_number = n
    } else if (editing) {
      body.lot_number = null
    }

    if (saleMode === 'auction') {
      const start = dollarsToCents(startingBid)
      if (!start || start < 1) return setError('Enter a starting bid.')
      const res = reserve.trim() ? dollarsToCents(reserve) : null
      const inc = increment.trim() ? dollarsToCents(increment) : null
      const bn = buyNow.trim() ? dollarsToCents(buyNow) : null
      if (reserve.trim() && !res) return setError('Enter a valid reserve.')
      if (increment.trim() && !inc) return setError('Enter a valid bid increment.')
      if (buyNow.trim() && !bn) return setError('Enter a valid buy-it-now price.')
      if (res && res < start) return setError('The reserve must be at least the starting bid.')
      if (bn && bn <= start) return setError('Buy-it-now must be higher than the starting bid.')
      if (bn && res && bn < res) return setError('Buy-it-now cannot be below the reserve.')
      if (!priceLocked) {
        body.starting_bid_cents = start
        body.reserve_cents = res
        body.increment_cents = inc
        body.buy_now_cents = bn
      }
    } else {
      const price = dollarsToCents(fixedPrice)
      if (!price || price < 1) return setError('Enter a price.')
      const qty = Number(quantity)
      if (!Number.isInteger(qty) || qty < 1) return setError('Quantity must be a whole number of 1 or more.')
      let limit: number | null = null
      if (perBidder.trim()) {
        limit = Number(perBidder)
        if (!Number.isInteger(limit) || limit < 1) return setError('Per-bidder limit must be a whole number of 1 or more.')
        if (limit > qty) return setError('Per-bidder limit cannot exceed the quantity.')
      }
      body.quantity = qty
      body.per_bidder_limit = limit
      if (!modeLocked) body.fixed_price_cents = price
    }
    if (modeLocked) delete body.sale_mode

    try {
      setSaving(true)
      if (item) await api.put(`/auctions/manage/items/${item.id}`, body)
      else await api.post(`/auctions/manage/${auctionId}/items`, body)
      onSaved()
    } catch (err) {
      setError(errorMessage(err, 'Could not save the item.'))
    } finally {
      setSaving(false)
    }
  }

  const busy = saving || uploading

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="item-form-title">
      <form onSubmit={handleSubmit} className="mx-auto my-6 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 id="item-form-title" className="text-lg font-semibold text-gray-900">{editing ? 'Edit item' : 'Add item'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {priceLocked && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">This item has bids, so its pricing and sale type are locked. You can still edit the description and photos.</p>}
        {!priceLocked && modeLocked && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">This item has sales, so its price and sale type are locked.</p>}

        <fieldset className="flex gap-4" disabled={modeLocked || busy}>
          <legend className="sr-only">Sale type</legend>
          {([['auction', 'Auction (bids)'], ['fixed', 'Fixed price']] as const).map(([value, label]) => (
            <label key={value} className={`flex-1 cursor-pointer rounded-lg border p-3 text-sm ${saleMode === value ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
              <input type="radio" name="sale-mode" className="mr-2" checked={saleMode === value} onChange={() => setSaleMode(value)} />
              {label}
            </label>
          ))}
        </fieldset>

        <div>
          <label htmlFor="item-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input id="item-title" className={inputClass} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} disabled={busy} required />
        </div>
        <div>
          <label htmlFor="item-desc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea id="item-desc" rows={3} className={inputClass} value={description} maxLength={5000} onChange={(e) => setDescription(e.target.value)} disabled={busy} />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="item-category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input id="item-category" className={inputClass} value={category} maxLength={100} onChange={(e) => setCategory(e.target.value)} disabled={busy} />
          </div>
          <div>
            <label htmlFor="item-donor" className="block text-sm font-medium text-gray-700 mb-1">Donated by</label>
            <input id="item-donor" className={inputClass} value={donor} maxLength={200} onChange={(e) => setDonor(e.target.value)} disabled={busy} />
          </div>
          <div>
            <label htmlFor="item-lot" className="block text-sm font-medium text-gray-700 mb-1">Lot number</label>
            <input id="item-lot" inputMode="numeric" className={inputClass} value={lot} onChange={(e) => setLot(e.target.value)} disabled={busy} />
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">Photos (up to {MAX_IMAGES})</span>
          <div className="flex flex-wrap gap-3">
            {images.map((url) => (
              <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setImages((prev) => prev.filter((u) => u !== url))} aria-label="Remove photo" className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-xs text-gray-500 hover:border-purple-400 disabled:opacity-60">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                Add
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
        </div>

        <fieldset className="space-y-4 rounded-xl border border-gray-200 p-4" disabled={busy}>
          <legend className="px-1 text-sm font-semibold text-gray-800">Item details shown to bidders</legend>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="item-condition" className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
              <input id="item-condition" className={inputClass} value={condition} maxLength={200} placeholder="New, gently used, ..." onChange={(e) => setCondition(e.target.value)} />
            </div>
            <div>
              <label htmlFor="item-expires" className="block text-sm font-medium text-gray-700 mb-1">Expires on</label>
              <input id="item-expires" type="date" className={inputClass} value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
              <p className="mt-1 text-xs text-gray-400">For gift certificates and vouchers.</p>
            </div>
          </div>
          <div>
            <label htmlFor="item-specs" className="block text-sm font-medium text-gray-700 mb-1">Specifications / size</label>
            <textarea id="item-specs" rows={2} className={inputClass} value={specifications} maxLength={2000} onChange={(e) => setSpecifications(e.target.value)} />
          </div>
          <div>
            <label htmlFor="item-included" className="block text-sm font-medium text-gray-700 mb-1">What is included</label>
            <textarea id="item-included" rows={2} className={inputClass} value={whatsIncluded} maxLength={2000} onChange={(e) => setWhatsIncluded(e.target.value)} />
          </div>
          <div>
            <label htmlFor="item-restrictions" className="block text-sm font-medium text-gray-700 mb-1">Restrictions</label>
            <textarea id="item-restrictions" rows={2} className={inputClass} value={restrictions} maxLength={2000} onChange={(e) => setRestrictions(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="item-fulfillment" className="block text-sm font-medium text-gray-700 mb-1">How the winner receives it</label>
              <select id="item-fulfillment" className={inputClass} value={fulfillment} onChange={(e) => setFulfillment(e.target.value as FulfillmentMethod | '')}>
                <option value="">Not specified</option>
                {(Object.keys(FULFILLMENT_LABEL) as FulfillmentMethod[]).map((m) => (
                  <option key={m} value={m}>{FULFILLMENT_LABEL[m]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="item-fulfillment-details" className="block text-sm font-medium text-gray-700 mb-1">Fulfillment details</label>
              <input id="item-fulfillment-details" className={inputClass} value={fulfillmentDetails} maxLength={1000} placeholder="Pickup address, shipping cost, ..." onChange={(e) => setFulfillmentDetails(e.target.value)} />
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600" checked={isExperience} onChange={(e) => setIsExperience(e.target.checked)} />
            <span className="text-sm text-gray-800">This is an experience (trip, class, event, service)</span>
          </label>
          {isExperience && (
            <div className="grid sm:grid-cols-2 gap-4 pl-7">
              <div>
                <label htmlFor="item-scheduling" className="block text-sm font-medium text-gray-700 mb-1">Scheduling requirements</label>
                <textarea id="item-scheduling" rows={2} className={inputClass} value={scheduling} maxLength={1000} placeholder="Book 2 weeks ahead, weekdays only, ..." onChange={(e) => setScheduling(e.target.value)} />
              </div>
              <div>
                <label htmlFor="item-blackout" className="block text-sm font-medium text-gray-700 mb-1">Blackout dates</label>
                <textarea id="item-blackout" rows={2} className={inputClass} value={blackout} maxLength={1000} onChange={(e) => setBlackout(e.target.value)} />
              </div>
            </div>
          )}
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-gray-200 p-4" disabled={busy}>
          <legend className="px-1 text-sm font-semibold text-gray-800">Donor recognition</legend>
          <div>
            <label htmlFor="item-donor-business" className="block text-sm font-medium text-gray-700 mb-1">Donor business (optional)</label>
            <input id="item-donor-business" className={inputClass} value={donorBusiness} maxLength={200} onChange={(e) => setDonorBusiness(e.target.value)} />
          </div>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600" checked={recognizeDonor} onChange={(e) => setRecognizeDonor(e.target.checked)} />
            <span className="text-sm text-gray-800">
              Recognize the donor publicly
              <span className="block text-xs text-gray-500">When off, the donor name and business are not shown to the public. Only turn this on if the donor agreed.</span>
            </span>
          </label>
        </fieldset>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="item-fmv" className="block text-sm font-medium text-gray-700 mb-1">Fair market value (USD)</label>
            <input id="item-fmv" inputMode="decimal" className={inputClass} value={fmv} onChange={(e) => setFmv(e.target.value)} disabled={busy} required />
            <p className="mt-1 text-xs text-gray-400">Used on donor receipts. Enter 0 if the item has no retail value.</p>
          </div>
          <div>
            <label htmlFor="item-tax" className="block text-sm font-medium text-gray-700 mb-1">Tax code (optional)</label>
            <input id="item-tax" className={inputClass} value={taxCode} maxLength={50} onChange={(e) => setTaxCode(e.target.value)} disabled={busy} />
          </div>
        </div>

        {saleMode === 'auction' ? (
          <fieldset className="grid sm:grid-cols-2 gap-4 rounded-xl border border-gray-200 p-4" disabled={priceLocked || busy}>
            <legend className="px-1 text-sm font-semibold text-gray-800">Auction pricing</legend>
            <div>
              <label htmlFor="item-start" className="block text-sm font-medium text-gray-700 mb-1">Starting bid (USD)</label>
              <input id="item-start" inputMode="decimal" className={inputClass} value={startingBid} onChange={(e) => setStartingBid(e.target.value)} />
            </div>
            <div>
              <label htmlFor="item-reserve" className="block text-sm font-medium text-gray-700 mb-1">Reserve (optional)</label>
              <input id="item-reserve" inputMode="decimal" className={inputClass} value={reserve} onChange={(e) => setReserve(e.target.value)} />
              <p className="mt-1 text-xs text-gray-400">If bidding ends below this, you decide whether to accept the top bid.</p>
            </div>
            <div>
              <label htmlFor="item-inc" className="block text-sm font-medium text-gray-700 mb-1">Bid increment (optional)</label>
              <input id="item-inc" inputMode="decimal" className={inputClass} value={increment} onChange={(e) => setIncrement(e.target.value)} />
              <p className="mt-1 text-xs text-gray-400">Leave blank to use automatic increments based on the price.</p>
            </div>
            <div>
              <label htmlFor="item-buynow" className="block text-sm font-medium text-gray-700 mb-1">Buy-it-now price (optional)</label>
              <input id="item-buynow" inputMode="decimal" className={inputClass} value={buyNow} onChange={(e) => setBuyNow(e.target.value)} />
              <p className="mt-1 text-xs text-gray-400">Removed automatically once the first bid is placed.</p>
            </div>
          </fieldset>
        ) : (
          <fieldset className="grid sm:grid-cols-3 gap-4 rounded-xl border border-gray-200 p-4" disabled={busy}>
            <legend className="px-1 text-sm font-semibold text-gray-800">Fixed pricing</legend>
            <div>
              <label htmlFor="item-price" className="block text-sm font-medium text-gray-700 mb-1">Price each (USD)</label>
              <input id="item-price" inputMode="decimal" className={inputClass} value={fixedPrice} onChange={(e) => setFixedPrice(e.target.value)} disabled={modeLocked} />
            </div>
            <div>
              <label htmlFor="item-qty" className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input id="item-qty" inputMode="numeric" className={inputClass} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div>
              <label htmlFor="item-limit" className="block text-sm font-medium text-gray-700 mb-1">Limit per bidder</label>
              <input id="item-limit" inputMode="numeric" className={inputClass} value={perBidder} onChange={(e) => setPerBidder(e.target.value)} />
            </div>
          </fieldset>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-60">Cancel</button>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? 'Save item' : 'Add item'}
          </button>
        </div>
      </form>
    </div>
  )
}
