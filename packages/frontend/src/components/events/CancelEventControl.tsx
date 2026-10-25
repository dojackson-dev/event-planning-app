'use client'

import { useState } from 'react'
import { Ban, RotateCcw } from 'lucide-react'
import api from '@/lib/api'

interface Props {
  eventId: string
  status?: string
  /** Called after the event was cancelled or reinstated so the page can reload the event and its notes. */
  onChanged: (newStatus: string) => void
  className?: string
}

const MIN_REASON = 3

/** Cancel (with a required reason saved to the event notes) or reinstate an event. */
export default function CancelEventControl({ eventId, status, onChanged, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCancelled = status === 'cancelled'
  if (status === 'completed') return null

  const close = () => { setOpen(false); setReason(''); setError(null) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api.post(`/events/${eventId}/${isCancelled ? 'reinstate' : 'cancel'}`, { reason: reason.trim() })
      onChanged(res.data?.status || (isCancelled ? 'scheduled' : 'cancelled'))
      close()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      {isCancelled && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>This event is cancelled.</strong> The reason is saved in the event notes.
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          isCancelled ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
        }`}
      >
        {isCancelled ? <RotateCcw className="h-4 w-4 mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
        {isCancelled ? 'Reinstate Event' : 'Cancel Event'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-event-title">
          <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="cancel-event-title" className="text-lg font-bold text-gray-900">
              {isCancelled ? 'Reinstate this event?' : 'Cancel this event?'}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {isCancelled
                ? 'The event goes back to Scheduled. A note is added to the event.'
                : 'The event is marked Cancelled and your reason is added to the event notes.'}
            </p>
            <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="cancel-reason">
              {isCancelled ? 'Note (optional)' : 'Reason for cancelling *'}
            </label>
            <textarea
              id="cancel-reason"
              autoFocus
              rows={4}
              maxLength={1000}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={isCancelled ? 'Why is it back on?' : 'e.g. Client called to cancel — family emergency'}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={close} disabled={busy} className="rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Keep as is
              </button>
              <button
                type="submit"
                disabled={busy || (!isCancelled && reason.trim().length < MIN_REASON)}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${isCancelled ? 'bg-primary-600 hover:bg-primary-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {busy ? 'Saving…' : isCancelled ? 'Reinstate' : 'Cancel Event'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
