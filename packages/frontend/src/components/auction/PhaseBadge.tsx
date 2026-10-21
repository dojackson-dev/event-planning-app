import type { AuctionPhase } from '@/lib/auctionApi'
import { PHASE_LABELS, PHASE_STYLES } from './phase'

export default function PhaseBadge({ phase, className = '' }: { phase: AuctionPhase; className?: string }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${PHASE_STYLES[phase]} ${className}`}>
      {PHASE_LABELS[phase]}
    </span>
  )
}
