'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import {
  Users, Plus, Trash2, Send, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Loader2, Mail, Phone, Table2, Copy, Check,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const rsvpApi = axios.create({ baseURL: `${API_URL}/rsvp` })
rsvpApi.interceptors.request.use(cfg => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('client_token')
    if (token) cfg.headers['x-client-token'] = token
  }
  return cfg
})

interface RsvpEvent {
  intake_form_id: string
  contact_name: string
  event_name: string | null
  event_date: string | null
  rsvp_summary: { total: number; attending: number; declined: number; pending: number }
}

interface RsvpGuest {
  id: string
  rsvp_token: string
  guest_name: string
  guest_phone: string | null
  guest_email: string | null
  status: 'pending' | 'attending' | 'declined'
  plus_ones: number
  meal_preference: string
  table_assignment: string | null
  responded_at: string | null
  sms_sent_at: string | null
  created_at: string
}

const MEAL_LABELS: Record<string, string> = {
  standard: 'Standard', vegetarian: 'Vegetarian', vegan: 'Vegan',
  gluten_free: 'Gluten-Free', kosher: 'Kosher',
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'attending') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3"/>Attending</span>
  if (status === 'declined') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"><XCircle className="h-3 w-3"/>Declined</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500"><Clock className="h-3 w-3"/>Pending</span>
}

export default function ClientRsvpPage() {
  const router = useRouter()
  const [events, setEvents] = useState<RsvpEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<RsvpEvent | null>(null)
  const [guests, setGuests] = useState<RsvpGuest[]>([])
  const [loading, setLoading] = useState(true)
  const [guestsLoading, setGuestsLoading] = useState(false)

  // Add guest form
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addTable, setAddTable] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Bulk add
  const [showBulk, setShowBulk] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)

  // Edit guest
  const [editId, setEditId] = useState<string | null>(null)
  const [editTable, setEditTable] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  // Send state
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sendingAll, setSendingAll] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    rsvpApi.get('/events')
      .then(res => setEvents(res.data || []))
      .catch(err => { if (err.response?.status === 401) router.push('/client-login') })
      .finally(() => setLoading(false))
  }, [router])

  const selectEvent = async (ev: RsvpEvent) => {
    setSelectedEvent(ev)
    setGuestsLoading(true)
    try {
      const res = await rsvpApi.get(`/guests/${ev.intake_form_id}`)
      setGuests(res.data || [])
    } finally {
      setGuestsLoading(false)
    }
  }

  const refreshGuests = async () => {
    if (!selectedEvent) return
    const res = await rsvpApi.get(`/guests/${selectedEvent.intake_form_id}`)
    setGuests(res.data || [])
    // Also refresh summary
    const evRes = await rsvpApi.get('/events')
    const updated = evRes.data.find((e: RsvpEvent) => e.intake_form_id === selectedEvent.intake_form_id)
    if (updated) {
      setSelectedEvent(updated)
      setEvents(evRes.data)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEvent || !addName.trim()) return
    setAddLoading(true)
    try {
      await rsvpApi.post(`/guests/${selectedEvent.intake_form_id}`, {
        guest_name: addName.trim(),
        guest_phone: addPhone.trim() || undefined,
        guest_email: addEmail.trim() || undefined,
        table_assignment: addTable.trim() || undefined,
      })
      setAddName(''); setAddPhone(''); setAddEmail(''); setAddTable('')
      setShowAdd(false)
      await refreshGuests()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add guest')
    } finally {
      setAddLoading(false)
    }
  }

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEvent || !bulkText.trim()) return
    setBulkLoading(true)
    try {
      const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean)
      // Each line: "Name, phone, email" — only name is required
      const guests = lines.map(line => {
        const parts = line.split(',').map(p => p.trim())
        return {
          guest_name: parts[0],
          guest_phone: parts[1] || undefined,
          guest_email: parts[2] || undefined,
        }
      }).filter(g => g.guest_name)
      await rsvpApi.post(`/guests/${selectedEvent.intake_form_id}/bulk`, { guests })
      setBulkText('')
      setShowBulk(false)
      await refreshGuests()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add guests')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleDelete = async (guestId: string) => {
    if (!selectedEvent || !confirm('Remove this guest?')) return
    try {
      await rsvpApi.delete(`/guests/${selectedEvent.intake_form_id}/${guestId}`)
      await refreshGuests()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to remove guest')
    }
  }

  const handleSaveEdit = async (guestId: string) => {
    if (!selectedEvent) return
    setEditLoading(true)
    try {
      await rsvpApi.put(`/guests/${selectedEvent.intake_form_id}/${guestId}`, {
        table_assignment: editTable.trim() || undefined,
        guest_phone: editPhone.trim() || undefined,
        guest_email: editEmail.trim() || undefined,
      })
      setEditId(null)
      await refreshGuests()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update guest')
    } finally {
      setEditLoading(false)
    }
  }

  const handleSendOne = async (guestId: string) => {
    if (!selectedEvent) return
    setSendingId(guestId)
    try {
      await rsvpApi.post(`/guests/${selectedEvent.intake_form_id}/${guestId}/send`)
      await refreshGuests()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to send invite')
    } finally {
      setSendingId(null)
    }
  }

  const handleSendAll = async () => {
    if (!selectedEvent) return
    setSendingAll(true)
    try {
      const res = await rsvpApi.post(`/send-all/${selectedEvent.intake_form_id}`)
      alert(`Sent ${res.data.sent} invite${res.data.sent !== 1 ? 's' : ''}${res.data.skipped ? `, skipped ${res.data.skipped} (no contact info)` : ''}.`)
      await refreshGuests()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to send invites')
    } finally {
      setSendingAll(false)
    }
  }

  const copyRsvpLink = (guest: RsvpGuest) => {
    navigator.clipboard.writeText(`${window.location.origin}/rsvp/${guest.rsvp_token}`)
    setCopiedId(guest.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const summary = selectedEvent?.rsvp_summary ?? { total: 0, attending: 0, declined: 0, pending: 0 }
  const unsentCount = guests.filter(g => !g.sms_sent_at && (g.guest_phone || g.guest_email)).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  // ── Event picker ──────────────────────────────────────────────────────────
  if (!selectedEvent) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary-600" />
            RSVP Manager
          </h1>
          <p className="text-sm text-gray-500 mt-1">Send personalized RSVP links to your guests.</p>
        </div>

        {events.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No events found</p>
            <p className="text-sm text-gray-400 mt-1">RSVP is available once you have a booked event.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(ev => (
              <button
                key={ev.intake_form_id}
                onClick={() => selectEvent(ev)}
                className="w-full bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-left hover:border-primary-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{ev.event_name ?? 'Unnamed Event'}</p>
                    {ev.event_date && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {new Date(ev.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{ev.rsvp_summary.total} guests</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ev.rsvp_summary.attending} attending · {ev.rsvp_summary.pending} pending
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Guest list ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => setSelectedEvent(null)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1"
          >
            ← All Events
          </button>
          <h1 className="text-xl font-bold text-gray-900">{selectedEvent.event_name ?? 'RSVP'}</h1>
          {selectedEvent.event_date && (
            <p className="text-sm text-gray-500">
              {new Date(selectedEvent.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: summary.total, color: 'text-gray-900', bg: 'bg-gray-50 border-gray-200' },
          { label: 'Attending', value: summary.attending, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
          { label: 'Declined', value: summary.declined, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
          { label: 'Pending', value: summary.pending, color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-xl p-3 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => { setShowAdd(v => !v); setShowBulk(false) }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> Add Guest
        </button>
        <button
          onClick={() => { setShowBulk(v => !v); setShowAdd(false) }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" /> Bulk Add
        </button>
        {unsentCount > 0 && (
          <button
            onClick={handleSendAll}
            disabled={sendingAll}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60"
          >
            {sendingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send All ({unsentCount})
          </button>
        )}
      </div>

      {/* Add single guest form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">Add Guest</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input value={addName} onChange={e => setAddName(e.target.value)} required placeholder="Guest's full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone <span className="text-gray-400">(for verification)</span></label>
              <input value={addPhone} onChange={e => setAddPhone(e.target.value)} placeholder="e.g. 555-867-5309" type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email <span className="text-gray-400">(optional)</span></label>
              <input value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="guest@email.com" type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Table <span className="text-gray-400">(optional)</span></label>
              <input value={addTable} onChange={e => setAddTable(e.target.value)} placeholder="e.g. Table 5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <p className="text-xs text-gray-400">Providing a phone number enables identity verification when the guest RSVPs — preventing anyone else from responding on their behalf.</p>
          <div className="flex gap-2">
            <button type="submit" disabled={addLoading}
              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-60 flex items-center gap-2">
              {addLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}Add
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          </div>
        </form>
      )}

      {/* Bulk add form */}
      {showBulk && (
        <form onSubmit={handleBulkAdd} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">Bulk Add Guests</h3>
          <p className="text-xs text-gray-500">One guest per line. Format: <code className="bg-gray-100 px-1 rounded">Name, Phone, Email</code> (phone and email optional).</p>
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            rows={6}
            placeholder={"John Smith, 555-867-5309, john@email.com\nJane Doe, 555-123-4567\nBob Johnson"}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={bulkLoading}
              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-60 flex items-center gap-2">
              {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}Add Guests
            </button>
            <button type="button" onClick={() => setShowBulk(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          </div>
        </form>
      )}

      {/* Guest list */}
      {guestsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      ) : guests.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No guests yet</p>
          <p className="text-sm text-gray-400 mt-1">Add guests above and send them their personalized RSVP link.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {guests.map(g => (
            <div key={g.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              {editId === g.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Phone className="h-3 w-3"/>Phone</label>
                      <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="555-xxx-xxxx"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Mail className="h-3 w-3"/>Email</label>
                      <input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="guest@email.com"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Table2 className="h-3 w-3"/>Table</label>
                      <input value={editTable} onChange={e => setEditTable(e.target.value)} placeholder="Table 5"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(g.id)} disabled={editLoading}
                      className="px-3 py-1.5 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700 disabled:opacity-60 flex items-center gap-1">
                      {editLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}Save
                    </button>
                    <button onClick={() => setEditId(null)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{g.guest_name}</p>
                      <StatusBadge status={g.status} />
                      {g.sms_sent_at && <span className="text-xs text-gray-400">📨 Sent</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                      {g.guest_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3"/>{g.guest_phone}</span>}
                      {g.guest_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3"/>{g.guest_email}</span>}
                      {g.table_assignment && <span className="flex items-center gap-1"><Table2 className="h-3 w-3"/>{g.table_assignment}</span>}
                      {g.status === 'attending' && g.plus_ones > 0 && <span>+{g.plus_ones} guest{g.plus_ones > 1 ? 's' : ''}</span>}
                      {g.status === 'attending' && g.meal_preference !== 'standard' && <span>{MEAL_LABELS[g.meal_preference] ?? g.meal_preference}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(g.guest_phone || g.guest_email) && (
                      <button
                        onClick={() => handleSendOne(g.id)}
                        disabled={sendingId === g.id}
                        title="Send RSVP link"
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 disabled:opacity-50"
                      >
                        {sendingId === g.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </button>
                    )}
                    <button
                      onClick={() => { setEditId(g.id); setEditPhone(g.guest_phone ?? ''); setEditEmail(g.guest_email ?? ''); setEditTable(g.table_assignment ?? '') }}
                      title="Edit"
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    >
                      <Table2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      title="Remove guest"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
