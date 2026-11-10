'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

export interface PickableItem {
  id: string
  name: string
  description?: string | null
  default_price?: number | string
  defaultPrice?: number | string
}

interface ItemPickerProps {
  items: PickableItem[]
  loading?: boolean
  error?: boolean
  onPick: (item: PickableItem) => void
  onCustom: () => void
}

export const itemPrice = (item: PickableItem) => Number(item.default_price ?? item.defaultPrice) || 0

/** The catalog of saved items and packages, plus a button for a one-off custom line. */
export default function ItemPicker({ items, loading, error, onPick, onCustom }: ItemPickerProps) {
  const [search, setSearch] = useState('')
  const shown = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items
    return items.filter(i => `${i.name} ${i.description ?? ''}`.toLowerCase().includes(term))
  }, [items, search])

  return (
    <div className="mb-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label className="block text-sm font-medium text-gray-700">Add an item or package</label>
        <button
          type="button"
          onClick={onCustom}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
        >
          + Add Custom Item
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading your items and packages…</p>
      ) : error ? (
        <p className="text-sm text-amber-700">
          Your saved items and packages could not be loaded. You can still add a custom item.
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">
          No saved items or packages yet. Add them under{' '}
          <Link href="/dashboard/items" className="text-primary-600 underline">
            Items &amp; Packages
          </Link>
          , or add a custom item above.
        </p>
      ) : (
        <>
          {items.length > 8 && (
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search items and packages…"
              aria-label="Search items and packages"
              className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm sm:w-72"
            />
          )}
          {shown.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing matches &ldquo;{search}&rdquo;.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shown.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPick(item)}
                  className="flex flex-col items-start rounded-lg border border-blue-200 bg-blue-50 p-3 text-left text-sm transition-colors hover:bg-blue-100"
                >
                  <span className="font-medium text-gray-900">{item.name}</span>
                  <span className="mt-1 text-xs text-blue-600">${itemPrice(item).toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
