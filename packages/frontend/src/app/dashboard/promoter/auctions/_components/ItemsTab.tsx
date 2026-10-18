'use client'

import { useState } from 'react'
import { Pencil, Plus, Trash2, Ban, CheckCircle2, XCircle } from 'lucide-react'
import api from '@/lib/api'
import ConfirmDialog from './ConfirmDialog'
import ItemFormModal from './ItemFormModal'
import {
  AuctionDetail,
  AuctionItem,
  EDITABLE_AUCTION_STATUSES,
  ITEM_STATUS_LABEL,
  errorMessage,
  formatUsd,
} from '../lib'

interface Props {
  auction: AuctionDetail
  canWrite: boolean
  onChanged: () => void
}

type Pending =
  | { kind: 'delete'; item: AuctionItem }
  | { kind: 'withdraw'; item: AuctionItem }
  | { kind: 'reserve'; item: AuctionItem; accept: boolean }

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  sold: 'bg-purple-100 text-purple-700',
  unsold: 'bg-gray-100 text-gray-600',
  reserve_not_met: 'bg-amber-100 text-amber-700',
  withdrawn: 'bg-red-100 text-red-700',
}

function priceText(item: AuctionItem): string {
  if (item.sale_mode === 'fixed') {
    return `${formatUsd(item.fixed_price_cents)} each, ${item.quantity - item.quantity_sold} of ${item.quantity} left`
  }
  if (item.status === 'sold') return `Sold for ${formatUsd(item.final_price_cents)}${item.sold_via === 'buy_now' ? ' (buy-it-now)' : ''}`
  if (item.bid_count > 0) return `Current ${formatUsd(item.current_price_cents)}, ${item.bid_count} bid${item.bid_count === 1 ? '' : 's'}`
  return `Starts at ${formatUsd(item.starting_bid_cents)}`
}

export default function ItemsTab({ auction, canWrite, onChanged }: Props) {
  const [editing, setEditing] = useState<AuctionItem | null>(null)
  const [adding, setAdding] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const editable = canWrite && EDITABLE_AUCTION_STATUSES.includes(auction.status)
  const canWithdraw = canWrite && (auction.status === 'scheduled' || auction.status === 'live')

  const run = async () => {
    if (!pending) return
    setBusy(true)
    setError(null)
    try {
      if (pending.kind === 'delete') await api.delete(`/auctions/manage/items/${pending.item.id}`)
      else if (pending.kind === 'withdraw') await api.post(`/auctions/manage/items/${pending.item.id}/withdraw`)
      else await api.post(`/auctions/manage/items/${pending.item.id}/resolve-reserve`, { accept: pending.accept })
      setPending(null)
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const dialog = (() => {
    if (!pending) return { title: '', message: '', label: '', danger: false }
    const name = `"${pending.item.title}"`
    if (pending.kind === 'delete') return { title: 'Delete item', message: `Delete ${name}? This cannot be undone.`, label: 'Delete item', danger: true }
    if (pending.kind === 'withdraw') {
      return {
        title: 'Withdraw item',
        message: `Withdraw ${name}? Bidders with a standing bid on it are told it is void. This cannot be undone.`,
        label: 'Withdraw item',
        danger: true,
      }
    }
    return pending.accept
      ? { title: 'Accept the top bid', message: `Sell ${name} for ${formatUsd(pending.item.current_price_cents)}, below your reserve? The winner is charged.`, label: 'Accept and sell', danger: false }
      : { title: 'Decline the top bid', message: `Decline the top bid on ${name}? The item will be marked unsold.`, label: 'Decline bid', danger: true }
  })()

  return (
    <div>
      {editable && (
        <div className="mb-4 flex justify-end">
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700">
            <Plus className="h-4 w-4" /> Add item
          </button>
        </div>
      )}

      {auction.items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-sm text-gray-500">
          No items yet.{editable && ' Add your first item to get the auction ready to publish.'}
        </div>
      ) : (
        <ul className="grid gap-3">
          {auction.items.map((item) => {
            const open = item.status === 'open'
            const untouched = item.bid_count === 0 && item.quantity_sold === 0 && item.status !== 'sold'
            return (
              <li key={item.id} className="flex gap-4 bg-white border border-gray-200 rounded-xl p-4">
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {item.image_urls?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_urls[0]} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.lot_number && <span className="text-xs font-medium text-gray-500">Lot {item.lot_number}</span>}
                    <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[item.status] ?? 'bg-gray-100 text-gray-600'}`}>{ITEM_STATUS_LABEL[item.status] ?? item.status}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{item.sale_mode === 'fixed' ? 'Fixed price' : 'Auction'}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{priceText(item)}</p>
                  {item.sale_mode === 'auction' && (item.reserve_cents || item.buy_now_cents) && (
                    <p className="text-xs text-gray-400">
                      {item.reserve_cents ? `Reserve ${formatUsd(item.reserve_cents)}` : ''}
                      {item.reserve_cents && item.buy_now_cents ? ' | ' : ''}
                      {item.buy_now_cents ? `Buy-it-now ${formatUsd(item.buy_now_cents)}` : ''}
                    </p>
                  )}
                  {item.status === 'reserve_not_met' && canWrite && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button onClick={() => setPending({ kind: 'reserve', item, accept: true })} className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Accept top bid
                      </button>
                      <button onClick={() => setPending({ kind: 'reserve', item, accept: false })} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                        <XCircle className="h-3.5 w-3.5" /> Decline
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {editable && open && (
                    <button onClick={() => setEditing(item)} className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:underline">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  )}
                  {editable && untouched && (
                    <button onClick={() => setPending({ kind: 'delete', item })} className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  )}
                  {canWithdraw && open && (
                    <button onClick={() => setPending({ kind: 'withdraw', item })} className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:underline">
                      <Ban className="h-3.5 w-3.5" /> Withdraw
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {(adding || editing) && (
        <ItemFormModal
          auctionId={auction.id}
          item={editing ?? undefined}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={() => { setAdding(false); setEditing(null); onChanged() }}
        />
      )}

      <ConfirmDialog
        open={!!pending}
        title={dialog.title}
        message={dialog.message}
        confirmLabel={dialog.label}
        danger={dialog.danger}
        busy={busy}
        error={error}
        onConfirm={run}
        onCancel={() => { setPending(null); setError(null) }}
      />
    </div>
  )
}
