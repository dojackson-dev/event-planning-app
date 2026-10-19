'use client'

export default function AttentionBanner({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-800">
      <span>
        Showing: <strong>{label}</strong>
      </span>
      <button type="button" onClick={onClear} className="font-medium text-indigo-700 hover:underline">
        Show all
      </button>
    </div>
  )
}
