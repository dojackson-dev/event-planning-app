'use client'

import { useState } from 'react'
import {
  CallLog,
  callsRequest,
  OUTCOME_LABELS,
  TokenGetter,
} from '@/lib/calls'

interface Props {
  callId: string
  clientLabel: string
  initialOutcome?: string | null
  initialNotes?: string | null
  getToken: TokenGetter
  onClose: (saved?: CallLog) => void
}

export default function CallNotesDialog({
  callId,
  clientLabel,
  initialOutcome,
  initialNotes,
  getToken,
  onClose,
}: Props) {
  const [outcome, setOutcome] = useState(initialOutcome ?? '')
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const saved = await callsRequest<CallLog>(
        getToken,
        'patch',
        `/${callId}`,
        { outcome: outcome || null, notes: notes.trim() || null },
      )
      onClose(saved)
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Call notes"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 text-left shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">How did the call go?</h2>
        <p className="mt-1 text-sm text-gray-500">{clientLabel}</p>

        <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="call-outcome">
          Outcome
        </label>
        <select
          id="call-outcome"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Choose…</option>
          {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="call-notes">
          Notes
        </label>
        <textarea
          id="call-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          rows={4}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="What was discussed, next steps…"
        />

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onClose()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
