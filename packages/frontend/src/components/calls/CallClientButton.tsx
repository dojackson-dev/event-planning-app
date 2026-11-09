'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Phone } from 'lucide-react'
import {
  CallLog,
  CallProfile,
  callsRequest,
  CallsApiError,
  isFinished,
  loadCallProfile,
  STATUS_LABELS,
  TokenGetter,
} from '@/lib/calls'
import CallNotesDialog from './CallNotesDialog'

interface Props {
  /** Admin clients use 'client'; sales leads use 'lead'. The server looks the number up itself. */
  source: 'client' | 'lead'
  id: string
  name: string
  getToken: TokenGetter
}

const POLL_MS = 2000
const MAX_POLLS = 150

export default function CallClientButton({ source, id, name, getToken }: Props) {
  const [profile, setProfile] = useState<CallProfile | null>(null)
  const [call, setCall] = useState<CallLog | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [notesFor, setNotesFor] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    loadCallProfile(getToken)
      .then((p) => {
        if (alive.current) setProfile(p)
      })
      .catch(() => undefined)
    return () => {
      alive.current = false
      if (timer.current) clearTimeout(timer.current)
    }
  }, [getToken])

  const poll = useCallback(
    (callId: string, attempt: number) => {
      timer.current = setTimeout(async () => {
        try {
          const latest = await callsRequest<CallLog>(getToken, 'get', `/${callId}`)
          if (!alive.current) return
          setCall(latest)
          if (isFinished(latest.status)) {
            if (latest.answered_at) setNotesFor(latest.id)
            return
          }
        } catch {
          // keep trying; the call itself is unaffected
        }
        if (attempt < MAX_POLLS) poll(callId, attempt + 1)
      }, POLL_MS)
    },
    [getToken],
  )

  // Only people an admin has switched on see the button.
  if (!profile || !profile.configured || !profile.callingEnabled) return null

  const active = starting || (call !== null && !isFinished(call.status))

  const start = async () => {
    setError('')
    setCall(null)
    setStarting(true)
    try {
      const result = await callsRequest<{ id: string; status: string }>(
        getToken,
        'post',
        '/outbound',
        { source, id },
      )
      setCall({ id: result.id, status: result.status } as CallLog)
      poll(result.id, 0)
    } catch (e) {
      const err = e as CallsApiError
      setError(
        err.code === 'MOBILE_NOT_VERIFIED'
          ? 'Add and verify your cell phone on the Calls page first.'
          : err.message,
      )
    } finally {
      setStarting(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={start}
        disabled={active}
        aria-label={`Call ${name}`}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
        {active ? 'Calling…' : 'Call Client'}
      </button>
      {call && (
        <span className="text-xs text-gray-600" role="status">
          {STATUS_LABELS[call.status] ?? call.status}
        </span>
      )}
      {error && (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
      {notesFor && (
        <CallNotesDialog
          callId={notesFor}
          clientLabel={name}
          getToken={getToken}
          onClose={() => setNotesFor(null)}
        />
      )}
    </span>
  )
}
