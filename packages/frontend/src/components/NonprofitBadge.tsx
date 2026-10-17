import { HeartHandshake } from 'lucide-react'

export interface NonprofitInfo {
  is_nonprofit?: boolean | null
  nonprofit_status?: string | null
  nonprofit_legal_name?: string | null
}

export function isVerifiedNonprofit(p: NonprofitInfo | null | undefined): boolean {
  return Boolean(p?.is_nonprofit) && p?.nonprofit_status === 'verified'
}

/** Shows who the verified non-profit is; renders nothing for everyone else. */
export default function NonprofitBadge({
  promoter,
  tone = 'light',
  className = '',
}: {
  promoter: NonprofitInfo | null | undefined
  tone?: 'light' | 'dark'
  className?: string
}) {
  if (!isVerifiedNonprofit(promoter)) return null
  const name = promoter?.nonprofit_legal_name
  const colors =
    tone === 'dark'
      ? 'bg-white/20 text-white border-white/30'
      : 'bg-pink-50 text-pink-700 border-pink-200'
  return (
    <span
      title="Verified 501(c)(3) non-profit"
      className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors} ${className}`}
    >
      <HeartHandshake className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{name ? `Non-profit · ${name}` : 'Verified non-profit'}</span>
    </span>
  )
}
