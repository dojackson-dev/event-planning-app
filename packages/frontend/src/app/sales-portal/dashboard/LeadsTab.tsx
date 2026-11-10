'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, Building2, Calendar, FileUp, Loader2, Mail, MapPin, Phone, Plus, RefreshCw, Search, Settings2, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import CallClientButton from '@/components/calls/CallClientButton'
import { salesTokenGetter } from '@/lib/calls'
import CustomFieldsManager from './leads/CustomFieldsManager'
import ImportExportModal from './leads/ImportExportModal'
import LeadDetailModal from './leads/LeadDetailModal'
import LeadFormModal from './leads/LeadFormModal'
import OutreachHistory from './leads/OutreachHistory'
import OutreachModal, { OutreachTarget } from './leads/OutreachModal'
import ScriptsPanel from './leads/ScriptsPanel'
import {
  AgentOption,
  CustomField,
  LEAD_TYPE_OPTIONS,
  Lead,
  SCORE_STYLE,
  SOURCE_OPTIONS,
  STATUS_LABEL,
  STATUS_STYLE,
  Script,
  errorMessage,
  fmtDay,
  fmtWhen,
  isOverdue,
  placeLabel,
} from './leads/types'

type View = 'available' | 'mine' | 'all'
type Page = 'leads' | 'scripts' | 'emails' | 'fields'
type Sort = 'newest' | 'score' | 'follow_up' | 'name'

const selectClass = 'border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white'

function endOfToday(): number {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

export default function LeadsTab({ isManager }: { isManager: boolean }) {
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>(isManager ? 'all' : 'available')
  const [page, setPage] = useState<Page>('leads')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [scripts, setScripts] = useState<Script[]>([])
  const [formLead, setFormLead] = useState<{ lead: Lead | null } | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [emailTargets, setEmailTargets] = useState<OutreachTarget[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAgent, setBulkAgent] = useState('')
  const [filters, setFilters] = useState({ q: '', status: '', type: '', source: '', score: '', assignee: '', due: false })
  const [sort, setSort] = useState<Sort>('newest')

  const load = useCallback(async () => {
    try {
      setError(null)
      const res = await api.get<{ leads: Lead[]; truncated?: boolean }>('/affiliates/leads')
      setLeads(res.data.leads)
      setTruncated(!!res.data.truncated)
    } catch (err) {
      setError(errorMessage(err, 'Could not load leads.'))
    }
  }, [])

  // Extras for the forms. A failure here must not block the leads list.
  const loadFields = useCallback(async () => {
    try {
      const res = await api.get<{ fields: CustomField[] }>('/affiliates/leads/custom-fields')
      setCustomFields(res.data.fields)
    } catch {
      setCustomFields([])
    }
  }, [])

  const loadScripts = useCallback(async () => {
    try {
      const res = await api.get<{ scripts: Script[] }>('/affiliates/scripts')
      setScripts(res.data.scripts.filter(s => s.is_active))
    } catch {
      setScripts([])
    }
  }, [])

  useEffect(() => {
    load()
    loadFields()
    loadScripts()
    if (isManager) {
      api.get<{ agents: AgentOption[] }>('/affiliates/leads/agents').then(res => setAgents(res.data.agents)).catch(() => setAgents([]))
    }
  }, [load, loadFields, loadScripts, isManager])

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
    const q = filters.q.trim().toLowerCase()
    const qDigits = q.replace(/\D/g, '')
    const dueBy = endOfToday()
    const rows = all.filter(lead => {
      if (view === 'available' && lead.claimed) return false
      if (view === 'mine' && !lead.claimed_by_me) return false
      if (filters.status && lead.status !== filters.status) return false
      if (filters.type && lead.lead_type !== filters.type) return false
      if (filters.source && lead.source !== filters.source) return false
      if (filters.score && lead.score_label !== filters.score) return false
      if (filters.assignee === 'none' && lead.claimed) return false
      if (filters.assignee && filters.assignee !== 'none' && lead.claimed_by_id !== filters.assignee) return false
      if (filters.due) {
        const open = lead.status !== 'won' && lead.status !== 'lost'
        if (!open || !lead.next_follow_up_at || Date.parse(lead.next_follow_up_at) > dueBy) return false
      }
      if (q) {
        const text = [lead.name, lead.business_name, lead.email, lead.city, lead.state, lead.lead_type_label, lead.claimed_by_name, lead.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        const phoneMatch = qDigits.length >= 3 && lead.phone.replace(/\D/g, '').includes(qDigits)
        if (!text.includes(q) && !phoneMatch) return false
      }
      return true
    })
    const byName = (a: Lead, b: Lead) => (a.business_name || a.name).localeCompare(b.business_name || b.name)
    if (sort === 'score') rows.sort((a, b) => b.score - a.score)
    else if (sort === 'name') rows.sort(byName)
    else if (sort === 'follow_up') {
      rows.sort((a, b) => (a.next_follow_up_at ? Date.parse(a.next_follow_up_at) : Infinity) - (b.next_follow_up_at ? Date.parse(b.next_follow_up_at) : Infinity))
    }
    return rows
  }, [leads, view, filters, sort])

  const counts = useMemo(() => {
    const all = leads ?? []
    return { available: all.filter(l => !l.claimed).length, mine: all.filter(l => l.claimed_by_me).length, all: all.length }
  }, [leads])

  const filtersActive = Object.values(filters).some(Boolean)
  const clearFilters = () => setFilters({ q: '', status: '', type: '', source: '', score: '', assignee: '', due: false })
  const detail = leads?.find(l => l.id === detailId) ?? null

  const views: Array<{ id: View; label: string }> = [
    { id: 'available', label: 'Available' },
    { id: 'mine', label: 'My leads' },
    ...(isManager ? [{ id: 'all' as View, label: 'All leads' }] : []),
  ]

  const toggleSelected = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const emailLeads = (ids: string[]) => {
    const chosen = (leads ?? []).filter(l => ids.includes(l.id) && l.contact_visible)
    setEmailTargets(chosen.map(l => ({ type: 'lead', id: l.id, name: l.name, business: l.business_name, email: l.email })))
  }

  const bulkAssign = async (distribute: boolean) => {
    setNotice(null)
    setBusyId('bulk')
    try {
      const res = await api.post<{ assigned: number; skipped: number }>('/affiliates/leads/assign-bulk', {
        ids: [...selected],
        ...(distribute ? { distribute: true } : { affiliate_id: bulkAgent }),
      })
      setNotice(`Assigned ${res.data.assigned} lead${res.data.assigned === 1 ? '' : 's'}${res.data.skipped ? `. ${res.data.skipped} closed or missing lead${res.data.skipped === 1 ? ' was' : 's were'} skipped.` : '.'}`)
      setSelected(new Set())
    } catch (err) {
      setNotice(errorMessage(err, 'Could not assign those leads.'))
    } finally {
      setBusyId(null)
      await load()
    }
  }

  const pages: Array<{ id: Page; label: string; icon: typeof BookOpen }> = [
    { id: 'leads', label: 'Leads', icon: Building2 },
    { id: 'scripts', label: 'Call scripts', icon: BookOpen },
    { id: 'emails', label: 'Sent emails', icon: Mail },
    ...(isManager ? [{ id: 'fields' as Page, label: 'Custom fields', icon: Settings2 }] : []),
  ]

  const pageNav = (
    <div className="flex flex-wrap items-center gap-2">
      {pages.map(p => (
        <button
          key={p.id}
          onClick={() => setPage(p.id)}
          aria-current={page === p.id ? 'page' : undefined}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${page === p.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
        >
          <p.icon className="w-4 h-4" aria-hidden="true" /> {p.label}
        </button>
      ))}
    </div>
  )

  if (page === 'scripts' || page === 'fields' || page === 'emails') {
    return (
      <div className="space-y-4">
        {pageNav}
        {page === 'scripts' ? (
          <ScriptsPanel isManager={isManager} onChanged={loadScripts} />
        ) : page === 'emails' ? (
          <OutreachHistory isManager={isManager} />
        ) : (
          <CustomFieldsManager fields={customFields} onChanged={loadFields} />
        )}
      </div>
    )
  }

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
      {pageNav}

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
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button onClick={() => setFormLead({ lead: null })} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">
            <Plus className="w-4 h-4" aria-hidden="true" /> Add lead
          </button>
          <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            <FileUp className="w-4 h-4" aria-hidden="true" /> Import / export
          </button>
          <button onClick={load} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <label htmlFor="lead-search" className="sr-only">Search leads</label>
          <input
            id="lead-search"
            type="search"
            value={filters.q}
            onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
            placeholder="Search by name, business, phone, email or city"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="f-status">Status</label>
          <select id="f-status" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className={selectClass}>
            <option value="">Any status</option>
            {(Object.keys(STATUS_LABEL) as Array<keyof typeof STATUS_LABEL>).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <label className="sr-only" htmlFor="f-type">Type</label>
          <select id="f-type" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} className={selectClass}>
            <option value="">Any type</option>
            {LEAD_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="f-source">Source</label>
          <select id="f-source" value={filters.source} onChange={e => setFilters(f => ({ ...f, source: e.target.value }))} className={selectClass}>
            <option value="">Any source</option>
            <option value="demo_request">Demo request</option>
            <option value="csv_import">CSV import</option>
            {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="f-score">Priority</label>
          <select id="f-score" value={filters.score} onChange={e => setFilters(f => ({ ...f, score: e.target.value }))} className={selectClass}>
            <option value="">Any priority</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
          {isManager && (
            <>
              <label className="sr-only" htmlFor="f-assignee">Assigned to</label>
              <select id="f-assignee" value={filters.assignee} onChange={e => setFilters(f => ({ ...f, assignee: e.target.value }))} className={selectClass}>
                <option value="">Anyone</option>
                <option value="none">Unassigned</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </>
          )}
          <label className="inline-flex items-center gap-1.5 text-sm text-gray-700">
            <input type="checkbox" checked={filters.due} onChange={e => setFilters(f => ({ ...f, due: e.target.checked }))} /> Follow-ups due
          </label>
          <span className="ml-auto flex items-center gap-2">
            <label className="text-xs text-gray-500" htmlFor="f-sort">Sort</label>
            <select id="f-sort" value={sort} onChange={e => setSort(e.target.value as Sort)} className={selectClass}>
              <option value="newest">Newest</option>
              <option value="score">Highest priority</option>
              <option value="follow_up">Next follow-up</option>
              <option value="name">Name</option>
            </select>
          </span>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm">
          <span className="font-medium text-indigo-900">{selected.size} selected</span>
          <button onClick={() => emailLeads([...selected])} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700">
            <Mail className="w-4 h-4" aria-hidden="true" /> Email selected
          </button>
          {isManager && (
            <>
              <label className="sr-only" htmlFor="bulk-agent">Assign to</label>
              <select id="bulk-agent" value={bulkAgent} onChange={e => setBulkAgent(e.target.value)} className={selectClass}>
                <option value="">Choose an agent</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button disabled={!bulkAgent || busyId === 'bulk'} onClick={() => bulkAssign(false)} className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60">Assign</button>
              <button disabled={busyId === 'bulk'} onClick={() => bulkAssign(true)} className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-indigo-700 hover:bg-indigo-100 disabled:opacity-60">Spread evenly across agents</button>
            </>
          )}
          <button onClick={() => setSelected(new Set())} className="ml-auto text-gray-600 underline">Clear</button>
        </div>
      )}

      <p aria-live="polite" className="text-sm text-indigo-700 min-h-[1.25rem]">{notice}</p>
      {truncated && <p className="text-xs text-gray-500">Showing the 1,000 newest leads. Use the filters or export to work with the rest.</p>}

      {visible.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          {filtersActive ? (
            <>
              <p>No leads match your search or filters.</p>
              <button onClick={clearFilters} className="mt-2 font-medium text-indigo-600 underline">Clear filters</button>
            </>
          ) : (
            <p>{view === 'available' ? 'No unclaimed leads right now. New "Book a Demo" requests appear here, or add your own.' : view === 'mine' ? 'You have not claimed any leads yet. Add a lead or claim one from Available.' : 'No leads yet.'}</p>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map(lead => {
            const busy = busyId === lead.id
            const canManage = lead.claimed_by_me || (isManager && lead.claimed)
            const open = lead.status === 'claimed' || lead.status === 'contacted'
            const closed = lead.status === 'won' || lead.status === 'lost'
            const place = placeLabel(lead)
            return (
              <li key={lead.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {lead.contact_visible && (
                      <input type="checkbox" aria-label={`Select ${lead.name}`} checked={selected.has(lead.id)} onChange={() => toggleSelected(lead.id)} className="mt-1.5" />
                    )}
                    <div className="min-w-0">
                      <button onClick={() => setDetailId(lead.id)} className="text-left font-semibold text-gray-900 hover:text-indigo-700 hover:underline">
                        {lead.business_name || lead.name}
                      </button>
                      {lead.business_name && <p className="text-sm text-gray-600">{lead.name}</p>}
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                          {lead.claimed_by_me || isManager ? (
                            <>
                              <a href={`tel:${lead.phone}`} className="text-indigo-600 hover:underline">{lead.phone}</a>
                              <CallClientButton source="lead" id={lead.id} name={lead.name} getToken={salesTokenGetter} />
                            </>
                          ) : (
                            <span title="Claim this lead to see the full number">{lead.phone}</span>
                          )}
                        </span>
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline break-all">
                            <Mail className="w-3.5 h-3.5" aria-hidden="true" /> {lead.email}
                          </a>
                        )}
                        {place && <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" aria-hidden="true" /> {place}</span>}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {lead.lead_type_label && <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">{lead.lead_type_label}</span>}
                        {lead.roles.filter(r => r !== lead.lead_type_label).map(r => (
                          <span key={r} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{r}</span>
                        ))}
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{lead.source_label}</span>
                        {lead.next_follow_up_at && !closed && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${isOverdue(lead.next_follow_up_at) ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            <Calendar className="w-3 h-3" aria-hidden="true" /> Follow up {fmtDay(lead.next_follow_up_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span title={`Priority score ${lead.score} of 100`} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${SCORE_STYLE[lead.score_label]}`}>{lead.score_label} · {lead.score}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLE[lead.status]}`}>{STATUS_LABEL[lead.status]}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{lead.source === 'demo_request' ? 'Requested' : 'Added'} {fmtWhen(lead.created_at)}</p>
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
                  <button onClick={() => setDetailId(lead.id)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Details</button>
                  {lead.contact_visible && lead.email && (
                    <button onClick={() => emailLeads([lead.id])} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                      <Mail className="w-3.5 h-3.5" aria-hidden="true" /> Email
                    </button>
                  )}
                  {(canManage || isManager) && (
                    <button onClick={() => setFormLead({ lead })} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Edit</button>
                  )}
                  {isManager && !closed && agents.length > 0 && (
                    <>
                      <label className="sr-only" htmlFor={`assign-${lead.id}`}>Assign lead</label>
                      <select
                        id={`assign-${lead.id}`}
                        value=""
                        disabled={busy}
                        onChange={e => {
                          const value = e.target.value
                          if (!value) return
                          act(lead.id, () => api.post(`/affiliates/leads/${lead.id}/assign`, { affiliate_id: value === 'pool' ? null : value }), value === 'pool' ? 'Lead returned to the pool.' : 'Lead assigned.')
                        }}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                      >
                        <option value="">Assign to...</option>
                        {lead.claimed && <option value="pool">Return to pool</option>}
                        {agents.filter(a => a.id !== lead.claimed_by_id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </>
                  )}
                  {isManager && (
                    <button
                      disabled={busy}
                      aria-label={`Delete ${lead.name}`}
                      onClick={() => confirm(`Delete ${lead.business_name || lead.name}? This also removes its activity and files.`) && act(lead.id, () => api.delete(`/affiliates/leads/${lead.id}`), 'Lead deleted.')}
                      className="ml-auto rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-60"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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

      {formLead && (
        <LeadFormModal
          lead={formLead.lead}
          isManager={isManager}
          agents={agents}
          customFields={customFields}
          onClose={() => setFormLead(null)}
          onSaved={message => {
            setFormLead(null)
            setNotice(message)
            load()
          }}
        />
      )}
      {detail && (
        <LeadDetailModal
          lead={detail}
          scripts={scripts}
          customFields={customFields}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            setDetailId(null)
            setFormLead({ lead: detail })
          }}
          onChanged={load}
        />
      )}
      {emailTargets && (
        <OutreachModal
          targets={emailTargets}
          onClose={() => setEmailTargets(null)}
          onDone={message => {
            setEmailTargets(null)
            setSelected(new Set())
            setNotice(message)
            load()
          }}
        />
      )}
      {importOpen && (
        <ImportExportModal
          isManager={isManager}
          agents={agents}
          onClose={() => setImportOpen(false)}
          onImported={message => {
            setImportOpen(false)
            setNotice(message)
            load()
          }}
        />
      )}
    </div>
  )
}
