export type CatalogUnit = 'each' | 'hour' | 'person' | 'flat'
export type CatalogKind = 'item' | 'package'

export const UNIT_OPTIONS: { value: CatalogUnit; label: string; short: string }[] = [
  { value: 'each', label: 'Each', short: '' },
  { value: 'hour', label: 'Per hour', short: 'per hour' },
  { value: 'person', label: 'Per person', short: 'per person' },
  { value: 'flat', label: 'Flat fee', short: 'flat fee' },
]

export const unitSuffix = (unit: string) => UNIT_OPTIONS.find(u => u.value === unit)?.short ?? ''

export interface IncludedItem {
  item_id?: string
  name: string
  quantity: number
}

/** An entry in the vendor's own catalog. */
export interface CatalogItem {
  id: string
  name: string
  description: string | null
  section: string | null
  kind: CatalogKind
  unit: CatalogUnit
  price: number
  hide_price: boolean
  visible_to_clients: boolean
  image_url: string | null
  is_active: boolean
  sort_order: number
  includes: IncludedItem[]
}

/** An entry as clients see it (the price is null when the vendor hides it). */
export interface PublicCatalogItem {
  id: string
  name: string
  description: string | null
  kind: CatalogKind
  unit: CatalogUnit
  unit_label: string
  price: number | null
  image_url: string | null
  includes: { name: string; quantity: number }[]
}

export interface PublicCatalog {
  enabled: boolean
  vendor_id: string
  sections: { name: string | null; items: PublicCatalogItem[] }[]
}

/** What a client picked: item id -> quantity. */
export type CatalogSelection = Record<string, number>

export const formatMoney = (n: number) => `$${n.toFixed(2)}`

export const priceLabel = (item: { price: number | null; unit: string }) => {
  if (item.price === null) return 'Request a quote'
  const suffix = unitSuffix(item.unit)
  return suffix && suffix !== 'flat fee' ? `${formatMoney(item.price)} ${suffix}` : formatMoney(item.price)
}

/** The wording used for the matching line on an estimate or invoice (mirrors the server). */
export function lineDescription(item: {
  name: string
  kind: string
  unit: string
  includes?: { name: string; quantity: number }[]
}): string {
  let text = item.name
  const suffix = unitSuffix(item.unit)
  if (suffix) text += ` (${suffix})`
  if (item.kind === 'package' && item.includes?.length) {
    const parts = item.includes.map(i => (i.quantity === 1 ? i.name : `${i.name} ×${i.quantity}`))
    text += ` — includes: ${parts.join(', ')}`
  }
  return text
}

/** Total of the priced picks, and how many picks have no public price. */
export function selectionTotal(catalog: PublicCatalog | null, selection: CatalogSelection) {
  let total = 0
  let quoteOnly = 0
  let count = 0
  for (const section of catalog?.sections ?? []) {
    for (const item of section.items) {
      const qty = selection[item.id] || 0
      if (qty <= 0) continue
      count += 1
      if (item.price === null) quoteOnly += 1
      else total += item.price * qty
    }
  }
  return { total, quoteOnly, count }
}

export const selectionToPayload = (selection: CatalogSelection) =>
  Object.entries(selection)
    .filter(([, qty]) => qty > 0)
    .map(([item_id, quantity]) => ({ item_id, quantity }))

/** An item a client picked on a booking request (stored as a snapshot on the request). */
export interface RequestedItem {
  item_id: string
  name: string
  kind: CatalogKind
  unit: CatalogUnit
  quantity: number
  unit_price: number | null
  description: string | null
  includes: { name: string; quantity: number }[]
}
