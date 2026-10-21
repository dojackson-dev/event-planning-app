const STYLES: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  live: 'bg-green-100 text-green-800',
  scheduled: 'bg-blue-100 text-blue-800',
  closed: 'bg-gray-200 text-gray-700',
  settled: 'bg-gray-200 text-gray-700',
  sold: 'bg-purple-100 text-purple-800',
  unsold: 'bg-gray-200 text-gray-700',
  reserve_not_met: 'bg-amber-100 text-amber-800',
}

const LABELS: Record<string, string> = {
  open: 'Open',
  live: 'Live',
  scheduled: 'Upcoming',
  closed: 'Closed',
  settled: 'Ended',
  sold: 'Sold',
  unsold: 'Unsold',
  reserve_not_met: 'Reserve not met',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {LABELS[status] ?? status}
    </span>
  )
}
