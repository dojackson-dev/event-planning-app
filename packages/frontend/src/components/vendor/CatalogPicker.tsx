'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { formatMoney, lineDescription, unitSuffix, type CatalogItem } from '@/lib/vendorCatalog'

interface Props {
  onPick: (line: { description: string; quantity: string; unit_price: string }) => void
}

/** Quick-add from the vendor's Items & Packages: choosing one adds a ready-to-edit line. */
export default function CatalogPicker({ onPick }: Props) {
  const [items, setItems] = useState<CatalogItem[] | null>(null)

  useEffect(() => {
    let cancelled = false
    api.get('/vendor-catalog/mine')
      .then(res => { if (!cancelled) setItems((res.data?.items ?? []).filter((i: CatalogItem) => i.is_active)) })
      .catch(() => { if (!cancelled) setItems([]) })
    return () => { cancelled = true }
  }, [])

  const sections = useMemo(() => {
    const groups = new Map<string, CatalogItem[]>()
    for (const item of items ?? []) {
      const key = item.section || 'Other'
      groups.set(key, [...(groups.get(key) ?? []), item])
    }
    return [...groups.entries()]
  }, [items])

  if (items === null) return null

  if (items.length === 0) {
    return (
      <p className="mb-4 text-xs text-gray-500">
        Tip: save what you offer under{' '}
        <Link href="/vendors/dashboard/catalog" className="text-primary-600 underline">Items &amp; Packages</Link>{' '}
        to add it here in one click.
      </p>
    )
  }

  return (
    <div className="mb-4 rounded-lg border border-primary-100 bg-primary-50/40 p-3">
      <label htmlFor="catalog-picker" className="block text-xs font-medium text-gray-700 mb-1">
        Add from my items &amp; packages
      </label>
      <select
        id="catalog-picker"
        value=""
        onChange={e => {
          const item = items.find(i => i.id === e.target.value)
          if (!item) return
          onPick({
            description: lineDescription(item),
            quantity: '1',
            unit_price: String(Number(item.price)),
          })
        }}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">Choose an item to add…</option>
        {sections.map(([section, rows]) => (
          <optgroup key={section} label={section}>
            {rows.map(item => (
              <option key={item.id} value={item.id}>
                {item.kind === 'package' ? '📦 ' : ''}{item.name} — {formatMoney(Number(item.price))}
                {unitSuffix(item.unit) && unitSuffix(item.unit) !== 'flat fee' ? ` ${unitSuffix(item.unit)}` : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}
