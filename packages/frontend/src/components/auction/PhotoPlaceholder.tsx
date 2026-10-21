import { Building2, ImageOff } from 'lucide-react'

/** Shown wherever an item has no photo yet. Fills its parent; size it with an aspect/height class on the wrapper or pass `className`. */
export function ItemPhotoPlaceholder({ label = 'Photo coming soon', className = '', compact = false }: { label?: string; className?: string; compact?: boolean }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-purple-50 via-white to-purple-100 text-purple-300 ${className}`}
    >
      <ImageOff className={compact ? 'h-6 w-6' : 'h-10 w-10'} aria-hidden="true" />
      {!compact && <span className="text-xs font-medium text-purple-400">{label}</span>}
    </div>
  )
}

const SIZES = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-base',
} as const

const initials = (name: string) =>
  name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

/** Round donor avatar: initials of the donor, or a building icon for a business-only donor. Decorative (the name is always shown beside it). */
export function DonorAvatar({ name, business, size = 'sm', className = '' }: { name?: string | null; business?: string | null; size?: keyof typeof SIZES; className?: string }) {
  const text = name ? initials(name) : ''
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-purple-100 font-semibold text-purple-700 ${SIZES[size]} ${className}`}
    >
      {text || (business ? <Building2 className="h-1/2 w-1/2" /> : '?')}
    </span>
  )
}
