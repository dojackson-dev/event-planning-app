import type { FulfillmentMethod } from '@/lib/auctionApi'

export const FULFILLMENT_LABELS: Record<FulfillmentMethod, string> = {
  pickup: 'Pickup',
  delivery: 'Delivery',
  shipping: 'Shipping',
  digital: 'Digital / emailed',
  arranged_with_donor: 'Arranged with the donor',
}

export const FULFILLMENT_METHODS = Object.keys(FULFILLMENT_LABELS) as FulfillmentMethod[]

/** Date-only strings (YYYY-MM-DD) are shown without a timezone shift. */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '-'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}
