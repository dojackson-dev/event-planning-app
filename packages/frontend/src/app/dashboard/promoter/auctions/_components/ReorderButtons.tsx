'use client'

import { ArrowDown, ArrowUp } from 'lucide-react'

interface Props {
  index: number
  count: number
  label: string
  disabled?: boolean
  onMove: (from: number, to: number) => void
}

/** Keyboard-accessible up/down reorder buttons for list rows. */
export default function ReorderButtons({ index, count, label, disabled, onMove }: Props) {
  const cls = 'rounded border border-gray-200 p-1 text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-30'
  return (
    <div className="flex flex-col gap-1">
      <button type="button" className={cls} disabled={disabled || index === 0} onClick={() => onMove(index, index - 1)} aria-label={`Move ${label} up`}>
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={cls} disabled={disabled || index === count - 1} onClick={() => onMove(index, index + 1)} aria-label={`Move ${label} down`}>
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
