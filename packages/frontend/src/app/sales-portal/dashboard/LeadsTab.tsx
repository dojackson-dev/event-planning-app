'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Phone, RefreshCw } from 'lucide-react'
import api from '@/lib/api'

interface Lead {
  id: string
  name: string
  phone: string
  roles: string[]
  description: string | null
  status: 'new' | 'claimed' | 'contacted' | 'won' | 'lost'
  claimed: boolean
  claimed_by_me: boolean
  claimed_by_name: string | null
  claimed_at: string | null
  notes: string | null
  created_at: string
}

type View = 'available' | 'mine' | 'all'

const STATUS_STYLE: Record<Lead['status'], string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  claimed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  contacted: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  won: 'bg-green-50 text-green-700 border-green-200',
  lost: 'bg-gray-50 text-gray-500 border-gray-200',
}

const STATUS_LABEL: Record<Lead['status'], string> = {
  new: 'New',
  claimed: 'Claimed',
  contacted: 'Contacted',
  won: 'Won',
  lost: 'Lost',
}

function errorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.message
  return Array.isArray(message) ? message.join(' ') : message || fallback
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function LeadsTab({ isManager }: { isManager: boolean }) {
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>(isManager ? 'all' : 'available')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      setError(null)
      const res = await api.get<{ leads: Lead[] }>('/affiliates/leads')
      setLeads(res.data.leads)
    } catch (err) {
      setError(errorMessage(err, 'Could not load leads.'))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const act = async (id: string, request: () => Promise<unknown>, success: string) => {
    setBusyId(id)
    setNotice(null)
    try {
      await request()
      setNotice(success)
    } catch (err) {
      setNotice(errorMessage(err, 'That did not work. Please try again.'))
    } finally {
      setBusyId(null)
      await load()
    }
  }

  const visible = useMemo(() => {
    const all = leads ?? []
    if (view === 'available') return all.filter(l => !l.claimed)
    if (view === 'mine') return all.filter(l => l.claimed_by_me)
    return all
  }, [leads, view])

  const counts = useMemo(() => {
    const all = leads ?? []
    return { available: all.filter(l => !l.claimed).length, mine: all.filter(l => l.claimed_by_me).length, all: all.length }
  }, [leads])

  const views: Array<{ id: View; label: string }> = [
    { id: 'available', label: 'Available' },
    { id: 'mine', label: 'My leads' },
    ...(isManager ? [{ id: 'all' as View, label: 'All leads' }] : []),
  ]

  if (error) {
    return (
      <div className="text-center py-12">
        <p role="alert" className="text-sm text-gray-600 mb-3">{error}</p>
        <button onClick={load} className="text-sm font-medium text-indigo-600 underline">Try again</button>
      </div>
    )
  }
  if (!leads) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" aria-label="Loading leads" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {views.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${view === v.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
          >
            {v.label} ({counts[v.id]})
          </button>
        ))}
        <button onClick={load} className="ml-auto inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <p aria-live="polite" className="text-sm text-indigo-700 min-h-[1.25rem]">{notice}</p>

      {visible.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-12">
          {view === 'available' ? 'No unclaimed leads right now. New "Book a Demo" requests appear here.' : view === 'mine' ? 'You have not claimed any leads yet.' : 'No leads yet.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map(lead => {
            const busy = busyId === lead.id
            const canManage = lead.claimed_by_me || (isManager && lead.claimed)
            const open = lead.status === 'claimed' || lead.status === 'contacted'
            return (
              <li key={lead.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{lead.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-600">
                      <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                      {lead.claimed_by_me || isManager ? (
                        <a href={`tel:${lead.phone}`} className="text-indigo-600 hover:underline">{lead.phone}</a>
                      ) : (
                        <span title="Claim this lead to see the full number">{lead.phone}</span>
                      )}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {lead.roles.map(r => (
                        <span key={r} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{r}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLE[lead.status]}`}>{STATUS_LABEL[lead.status]}</span>
                    <p className="mt-1 text-xs text-gray-400">Requested {fmtWhen(lead.created_at)}</p>
                    {lead.claimed && (
                      <p className="text-xs text-gray-500">
                        {lead.claimed_by_me ? 'Claimed by you' : `Claimed by ${lead.claimed_by_name ?? 'an agent'}`}
                      </p>
                    )}
                  </div>
                </div>

                {lead.description && <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{lead.description}</p>}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {!lead.claimed && (
                    <button
                      disabled={busy}
                      onClick={() => act(lead.id, () => api.post(`/affiliates/leads/${lead.id}/claim`), `You claimed ${lead.name}. Call them from the number shown.`)}
                      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-1.5 rounded-lg"
                    >
                      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Claim lead
                    </button>
                  )}
                  {canManage && (
                    <>
                      <label className="sr-only" htmlFor={`status-${lead.id}`}>Lead status</label>
                      <select
                        id={`status-${lead.id}`}
                        value={lead.status}
                        disabled={busy}
                        onChange={e => act(lead.id, () => api.patch(`/affiliates/leads/${lead.id}`, { status: e.target.value }), 'Status updated.')}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                      >
                        {(['claimed', 'contacted', 'won', 'lost'] as const).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                      {open && (
                        <button
                          disabled={busy}
                          onClick={() => confirm('Put this lead back in the pool for other agents?') && act(lead.id, () => api.post(`/affiliates/leads/${lead.id}/release`), 'Lead released.')}
                          className="text-sm text-gray-500 hover:text-gray-800 underline disabled:opacity-60"
                        >
                          Release
                        </button>
                      )}
                    </>
                  )}
                </div>

                {canManage && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1" htmlFor={`notes-${lead.id}`}>Notes</label>
                    <div className="flex gap-2">
                      <textarea
                        id={`notes-${lead.id}`}
                        rows={2}
                        maxLength={2000}
                        value={noteDrafts[lead.id] ?? lead.notes ?? ''}
                        onChange={e => setNoteDrafts(d => ({ ...d, [lead.id]: e.target.value }))}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                        placeholder="Call outcome, next step..."
                      />
                      <button
                        disabled={busy || (noteDrafts[lead.id] ?? lead.notes ?? '') === (lead.notes ?? '')}
                        onClick={() => act(lead.id, async () => {
                          await api.patch(`/affiliates/leads/${lead.id}`, { notes: noteDrafts[lead.id] ?? '' })
                          setNoteDrafts(d => { const { [lead.id]: _drop, ...rest } = d; return rest })
                        }, 'Notes saved.')}
                        className="self-end border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-sm px-3 py-1.5 rounded-lg"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
