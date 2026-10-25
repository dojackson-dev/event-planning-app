'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Loader2, RotateCcw, Search } from 'lucide-react'
import api from '@/lib/api'
import { formatTime } from '@/lib/dateUtils'

interface DoorListEvent {
  event_id: string
  event_name: string | null
  event_date: string | null
  start_time: string | null
  end_time: string | null
  venue_name: string | null
  guest_list_id: number | null
  total_guests: number
  arrived_guests: number
}

interface DoorListGuest {
  id: number
  name: string
  plus_one_count: number | null
  is_vip: boolean | null
  has_arrived: boolean
  arrived_at: string | null
}

const errText = (err: any, fallback: string) => err?.response?.data?.message || fallback

export default function VendorDoorListPage() {
  const router = useRouter()
  const [events, setEvents] = useState<DoorListEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<DoorListEvent | null>(null)
  const [guests, setGuests] = useState<DoorListGuest[]>([])
  const [guestsLoading, setGuestsLoading] = useState(false)
  const [guestsError, setGuestsError] = useState('')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get<DoorListEvent[]>('/vendors/door-lists/events')
      setEvents(res.data || [])
    } catch (err: any) {
      if (err?.response?.status === 401) { router.replace('/vendors/login'); return }
      setError(errText(err, 'Could not load your door lists.'))
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { loadEvents() }, [loadEvents])

  const openEvent = async (ev: DoorListEvent) => {
    setSelected(ev)
    setGuests([])
    setSearch('')
    setActionError('')
    setGuestsError('')
    setGuestsLoading(true)
    try {
      const res = await api.get<{ event: DoorListEvent; guests: DoorListGuest[] }>(`/vendors/door-lists/event/${ev.event_id}`)
      setSelected(res.data.event)
      setGuests(res.data.guests || [])
    } catch (err: any) {
      setGuestsError(errText(err, 'Could not load this door list.'))
    } finally {
      setGuestsLoading(false)
    }
  }

  const toggle = async (g: DoorListGuest) => {
    setBusyId(g.id)
    setActionError('')
    try {
      const res = await api.post<DoorListGuest>(`/vendors/door-lists/guests/${g.id}/${g.has_arrived ? 'unarrive' : 'arrive'}`)
      setGuests(prev => prev.map(x => (x.id === g.id ? res.data : x)))
    } catch (err: any) {
      setActionError(errText(err, `Could not update ${g.name}.`))
    } finally {
      setBusyId(null)
    }
  }

  const arrivedCount = guests.filter(g => g.has_arrived).length
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? guests.filter(g => g.name.toLowerCase().includes(q)) : guests
  }, [guests, search])

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
  }

  if (!selected) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Door List</h1>
        <p className="text-sm text-gray-500 mb-6">Events you are booked on as security. Open one to check guests in.</p>
        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error} <button type="button" onClick={loadEvents} className="underline font-medium">Try again</button>
          </div>
        )}
        {!error && events.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
            No events yet. When an owner books you for an event and you confirm it, its door list shows up here.
          </div>
        ) : (
          <ul className="space-y-3">
            {events.map(ev => (
              <li key={ev.event_id}>
                <button type="button" onClick={() => openEvent(ev)} className="w-full text-left rounded-xl bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <p className="font-semibold text-gray-900">{ev.event_name || 'Event'}</p>
                  <p className="text-sm text-gray-500">
                    {ev.event_date ? new Date(ev.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    {ev.start_time ? ` · ${formatTime(ev.start_time)}` : ''}
                    {ev.end_time ? ` – ${formatTime(ev.end_time)}` : ''}
                  </p>
                  {ev.venue_name && <p className="text-sm text-gray-500">📍 {ev.venue_name}</p>}
                  <p className="mt-2 text-sm text-gray-700">
                    {ev.guest_list_id === null ? 'No door list yet' : `${ev.arrived_guests} of ${ev.total_guests} checked in`}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button type="button" onClick={() => { setSelected(null); loadEvents() }} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> All events
      </button>
      <h1 className="text-xl font-bold text-gray-900">{selected.event_name || 'Event'}</h1>
      <p className="text-sm text-gray-500 mb-4">
        {selected.start_time ? formatTime(selected.start_time) : ''}{selected.end_time ? ` – ${formatTime(selected.end_time)}` : ''}
        {selected.venue_name ? ` · ${selected.venue_name}` : ''}
      </p>

      {guestsError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {guestsError} <button type="button" onClick={() => openEvent(selected)} className="underline font-medium">Try again</button>
        </div>
      )}
      {actionError && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>}

      {guestsLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary-600" /></div>
      ) : !guestsError && guests.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">The owner hasn&apos;t added guests to this door list yet.</div>
      ) : !guestsError && (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search guests"
                aria-label="Search guests"
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <p className="text-sm font-medium text-gray-700 whitespace-nowrap">{arrivedCount} / {guests.length} in</p>
          </div>
          {visible.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No guests match &quot;{search}&quot;.</p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-xl bg-white shadow-sm">
              {visible.map(g => (
                <li key={g.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {g.name}{g.is_vip ? <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">VIP</span> : null}
                    </p>
                    <p className="text-xs text-gray-500">
                      {g.plus_one_count ? `+${g.plus_one_count} guest${g.plus_one_count > 1 ? 's' : ''}` : 'Just them'}
                      {g.has_arrived && g.arrived_at ? ` · in at ${new Date(g.arrived_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(g)}
                    disabled={busyId === g.id}
                    aria-label={g.has_arrived ? `Undo check-in for ${g.name}` : `Check in ${g.name}`}
                    className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${g.has_arrived ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-green-600 text-white hover:bg-green-700'}`}
                  >
                    {busyId === g.id ? <Loader2 className="h-4 w-4 animate-spin" /> : g.has_arrived ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    {g.has_arrived ? 'Undo' : 'Check in'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
