'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Package, Minus, Plus, Boxes } from 'lucide-react'
import {
  formatMoney,
  priceLabel,
  selectionTotal,
  type CatalogSelection,
  type PublicCatalog,
  type PublicCatalogItem,
} from '@/lib/vendorCatalog'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Props {
  /** Load the menu through a booking link slug, or directly by vendor id. */
  slug?: string
  vendorId?: string
  selection: CatalogSelection
  onChange: (selection: CatalogSelection) => void
  /** Heading shown above the menu. */
  title?: string
  /** Classes for the wrapping section (a card, say); only applied when a menu is shown. */
  className?: string
  /** Shown in the selection summary, e.g. a "Request these items" button. */
  action?: ReactNode
}

const MAX_QTY = 10000

/** The vendor's menu for clients: pick items and quantities, with a running total. Renders nothing when the vendor has no public menu. */
export default function CatalogMenu({ slug, vendorId, selection, onChange, title = 'Choose what you need', className = '', action }: Props) {
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null)

  useEffect(() => {
    const url = slug
      ? `${API_URL}/vendor-catalog/public/link/${encodeURIComponent(slug)}`
      : vendorId
        ? `${API_URL}/vendor-catalog/public/vendor/${encodeURIComponent(vendorId)}`
        : null
    if (!url) return
    let cancelled = false
    fetch(url)
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (!cancelled) setCatalog(data) })
      .catch(() => { if (!cancelled) setCatalog(null) })
    return () => { cancelled = true }
  }, [slug, vendorId])

  if (!catalog?.enabled || catalog.sections.length === 0) return null

  const setQty = (id: string, raw: number) => {
    const qty = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), MAX_QTY) : 0
    const next = { ...selection }
    if (qty > 0) next[id] = Math.round(qty * 1000) / 1000
    else delete next[id]
    onChange(next)
  }

  const { total, quoteOnly, count } = selectionTotal(catalog, selection)

  const renderItem = (item: PublicCatalogItem) => {
    const qty = selection[item.id] || 0
    return (
      <div
        key={item.id}
        className={`rounded-xl border bg-white overflow-hidden flex flex-col ${qty > 0 ? 'border-indigo-400 ring-1 ring-indigo-200' : 'border-gray-200'}`}
      >
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt="" className="w-full aspect-[4/3] object-cover" />
        )}
        <div className="p-3 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-gray-900 text-sm">
              {item.name}
              {item.kind === 'package' && (
                <span className="ml-2 align-middle text-[10px] font-medium bg-purple-100 text-purple-700 rounded-full px-2 py-0.5">Package</span>
              )}
            </p>
            <p className="text-sm font-bold text-gray-900 text-right">{priceLabel(item)}</p>
          </div>
          {item.description && <p className="text-xs text-gray-600 mt-1">{item.description}</p>}
          {item.kind === 'package' && item.includes.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Includes: {item.includes.map(i => (i.quantity === 1 ? i.name : `${i.name} ×${i.quantity}`)).join(', ')}
            </p>
          )}

          <div className="mt-3 pt-1 flex items-center justify-end">
            {qty > 0 ? (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQty(item.id, qty - 1)}
                  aria-label={`Fewer ${item.name}`}
                  className="h-8 w-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-50"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  inputMode="decimal"
                  aria-label={`Quantity of ${item.name}`}
                  value={qty}
                  onChange={e => setQty(item.id, parseFloat(e.target.value))}
                  className="h-8 w-14 rounded-lg border border-gray-300 text-center text-sm"
                />
                <button
                  type="button"
                  onClick={() => setQty(item.id, qty + 1)}
                  aria-label={`More ${item.name}`}
                  className="h-8 w-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setQty(item.id, 1)}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <section aria-label="Items and packages" className={`space-y-5 ${className}`}>
      <div>
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Boxes className="w-5 h-5 text-indigo-600" /> {title}
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Pick items and quantities. The vendor reviews your request and sends you an estimate to confirm, so nothing is charged now.
        </p>
      </div>

      {catalog.sections.map(section => (
        <div key={section.name ?? 'other'}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            {section.name === 'Packages' && <Package className="w-3.5 h-3.5" />}
            {section.name ?? 'Other'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{section.items.map(renderItem)}</div>
        </div>
      ))}

      {count > 0 && (
        <div className="sticky bottom-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm shadow-sm" aria-live="polite">
          <p className="font-semibold text-indigo-900">
            {count} item{count === 1 ? '' : 's'} selected
            {total > 0 && <> · about {formatMoney(total)}</>}
          </p>
          {quoteOnly > 0 && (
            <p className="text-xs text-indigo-800">
              {quoteOnly} item{quoteOnly === 1 ? ' is' : 's are'} quoted separately by the vendor.
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {action}
            <button
              type="button"
              onClick={() => onChange({})}
              className="text-xs text-indigo-700 underline"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
