'use client'

import { useCallback, useEffect, useState } from 'react'
import { Voicemail as VoicemailIcon, PhoneIncoming, PhoneOutgoing } from 'lucide-react'
import {
  CallLog,
  CallProfile,
  callsRequest,
  clearCallProfileCache,
  formatCallTime,
  formatDuration,
  OUTCOME_LABELS,
  STATUS_LABELS,
  TokenGetter,
  Voicemail,
} from '@/lib/calls'
import CallNotesDialog from './CallNotesDialog'

interface Props {
  getToken: TokenGetter
}

function MobileSetup({
  profile,
  getToken,
  onChange,
}: {
  profile: CallProfile
  getToken: TokenGetter
  onChange: (p: CallProfile) => void
}) {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const sendCode = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const res = await callsRequest<{ sentTo: string }>(getToken, 'post', '/me/mobile', { phone })
      setCodeSent(true)
      setMessage(`We texted a 6-digit code to ${res.sentTo}.`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    setBusy(true)
    setError('')
    try {
      const updated = await callsRequest<CallProfile>(getToken, 'post', '/me/mobile/verify', { code })
      clearCallProfileCache()
      onChange(updated)
      setCodeSent(false)
      setPhone('')
      setCode('')
      setMessage('Your cell phone is verified.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm('Remove your cell phone number? You will not be able to place or receive calls until you add and verify a number again.')) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const updated = await callsRequest<CallProfile>(getToken, 'delete', '/me/mobile')
      clearCallProfileCache()
      onChange(updated)
      setCodeSent(false)
      setPhone('')
      setCode('')
      setMessage('Your cell phone number was removed.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-base font-semibold text-gray-900">Your cell phone</h2>
      <p className="mt-1 text-sm text-gray-600">
        When you press Call Client, EventEcos rings this phone first. Press 1 and we connect you to the client,
        who sees the EventEcos number. Your personal number is never shown.
      </p>

      <p className="mt-3 text-sm">
        {profile.mobileVerified ? (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Verified {profile.mobile}
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            Not verified yet
          </span>
        )}
        {!profile.callingEnabled && (
          <span className="ml-2 text-xs text-gray-500">
            Calling is not switched on for your account yet. Ask an EventEcos admin.
          </span>
        )}
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="staff-mobile" className="block text-xs font-medium text-gray-700">
            {profile.mobileVerified ? 'Change cell phone' : 'Cell phone number'}
          </label>
          <input
            id="staff-mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(601) 555-0123"
            className="mt-1 w-52 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={sendCode}
          disabled={busy || phone.trim().length < 10}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Text me a code
        </button>
        {(profile.mobileVerified || profile.pendingMobile) && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Remove my number
          </button>
        )}
      </div>

      {codeSent && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="staff-code" className="block text-xs font-medium text-gray-700">
              6-digit code
            </label>
            <input
              id="staff-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="mt-1 w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm tracking-widest"
            />
          </div>
          <button
            type="button"
            onClick={verify}
            disabled={busy || code.length !== 6}
            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Verify
          </button>
        </div>
      )}

      {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}

function Voicemails({ getToken }: { getToken: TokenGetter }) {
  const [items, setItems] = useState<Voicemail[] | null>(null)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState<{ id: string; url: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    callsRequest<{ voicemails: Voicemail[] }>(getToken, 'get', '/voicemails')
      .then((r) => {
        if (!cancelled) setItems(r.voicemails)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [getToken])

  useEffect(() => {
    return () => {
      if (playing) URL.revokeObjectURL(playing.url)
    }
  }, [playing])

  const play = async (id: string) => {
    setError('')
    try {
      const blob = await callsRequest<Blob>(getToken, 'get', `/voicemails/${id}/audio`, undefined, 'blob')
      setPlaying({ id, url: URL.createObjectURL(blob) })
      setItems((prev) =>
        prev?.map((v) => (v.id === id ? { ...v, listened_at: v.listened_at ?? new Date().toISOString() } : v)) ?? prev,
      )
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
        <VoicemailIcon className="h-4 w-4" aria-hidden="true" /> Shared voicemail
      </h2>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {items === null && !error && <p className="mt-3 text-sm text-gray-500">Loading…</p>}
      {items?.length === 0 && <p className="mt-3 text-sm text-gray-500">No voicemails yet.</p>}
      <ul className="mt-3 divide-y divide-gray-100">
        {items?.map((v) => (
          <li key={v.id} className="py-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className={v.listened_at ? 'text-gray-600' : 'font-semibold text-gray-900'}>
                {v.from_number ?? 'Unknown caller'} · {formatCallTime(v.created_at)} · {formatDuration(v.duration_seconds)}
              </span>
              <button
                type="button"
                onClick={() => play(v.id)}
                className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >
                Play
              </button>
            </div>
            {playing?.id === v.id && (
              <audio className="mt-2 w-full" controls autoPlay src={playing.url} />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function CallsPanel({ getToken }: Props) {
  const [profile, setProfile] = useState<CallProfile | null>(null)
  const [calls, setCalls] = useState<CallLog[] | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<CallLog | null>(null)

  const load = useCallback(async () => {
    setError('')
    try {
      const [p, h] = await Promise.all([
        callsRequest<CallProfile>(getToken, 'get', '/me'),
        callsRequest<{ calls: CallLog[] }>(getToken, 'get', '/history'),
      ])
      setProfile(p)
      setCalls(h.calls)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [getToken])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
        {error}{' '}
        <button type="button" onClick={load} className="underline">
          Try again
        </button>
      </div>
    )
  }
  if (!profile || !calls) return <p className="text-sm text-gray-500">Loading calls…</p>

  return (
    <div className="space-y-6">
      {!profile.configured && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Calling is not set up on the server yet, so Call Client buttons are hidden.
        </p>
      )}

      <MobileSetup profile={profile} getToken={getToken} onChange={setProfile} />

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Call history</h2>
        {calls.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No calls yet. Use Call Client next to a phone number to start one.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Client</th>
                  <th className="py-2 pr-4">Result</th>
                  <th className="py-2 pr-4">Length</th>
                  <th className="py-2 pr-4">Outcome / notes</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {calls.map((c) => (
                  <tr key={c.id} className="align-top">
                    <td className="py-2 pr-4 whitespace-nowrap text-gray-700">{formatCallTime(c.created_at)}</td>
                    <td className="py-2 pr-4">
                      <span className="flex items-center gap-1.5 text-gray-900">
                        {c.direction === 'inbound' ? (
                          <PhoneIncoming className="h-3.5 w-3.5 text-green-600" aria-label="Incoming" />
                        ) : (
                          <PhoneOutgoing className="h-3.5 w-3.5 text-indigo-600" aria-label="Outgoing" />
                        )}
                        {c.client_name ?? c.client_phone}
                      </span>
                      {c.client_name && <span className="text-xs text-gray-500">{c.client_phone}</span>}
                      {c.staff_name && <span className="block text-xs text-gray-500">{c.staff_name}</span>}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">{STATUS_LABELS[c.status] ?? c.status}</td>
                    <td className="py-2 pr-4 text-gray-700">{formatDuration(c.duration_seconds)}</td>
                    <td className="py-2 pr-4 text-gray-700">
                      {c.outcome && <span className="font-medium">{OUTCOME_LABELS[c.outcome] ?? c.outcome}</span>}
                      {c.notes && <span className="block text-xs text-gray-600">{c.notes}</span>}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        {c.outcome || c.notes ? 'Edit' : 'Add notes'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(profile.kind === 'admin' || profile.callingEnabled) && <Voicemails getToken={getToken} />}

      {editing && (
        <CallNotesDialog
          callId={editing.id}
          clientLabel={editing.client_name ?? editing.client_phone}
          initialOutcome={editing.outcome}
          initialNotes={editing.notes}
          getToken={getToken}
          onClose={(saved) => {
            if (saved) setCalls((prev) => prev?.map((c) => (c.id === saved.id ? saved : c)) ?? prev)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
