'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowRight, Calendar, CheckCircle2, ChevronDown, Sparkles } from 'lucide-react'
import api from '@/lib/api'
import AssistantAsk from './assistant/AssistantAsk'
import AssistantDraftModal from './assistant/AssistantDraftModal'
import {
  errorMessage,
  type AssistantPriority,
  type AssistantSummary,
  type Draft,
  type DraftTarget,
  type PriorityReason,
  type Severity,
  type AssistantRole,
} from './assistant/assistantTypes'

const SEVERITY_DOT: Record<Severity, string> = {
  urgent: 'bg-red-500',
  attention: 'bg-amber-500',
  info: 'bg-blue-400',
}

const ACTOR_LABEL: Record<PriorityReason['actor'], { text: string; classes: string }> = {
  you: { text: 'Your action', classes: 'bg-indigo-50 text-indigo-700' },
  client: { text: 'Awaiting client', classes: 'bg-gray-100 text-gray-600' },
  vendor: { text: 'Awaiting vendor', classes: 'bg-amber-50 text-amber-700' },
}

const SNOOZE_OPTIONS = [
  { label: 'Tomorrow', days: 1 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
]

const INITIAL_PRIORITIES = 5

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const snoozeUntil = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)

export default function DashboardAssistant({ role = 'owner' }: { role?: AssistantRole }) {
  const [summary, setSummary] = useState<AssistantSummary | null>(null)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [menu, setMenu] = useState<{ key: string; mode: 'snooze' | 'draft' } | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [digest, setDigest] = useState<boolean | null>(null)
  const [digestError, setDigestError] = useState('')

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError(false)
    try {
      const res = await api.get<AssistantSummary>('/assistant/summary', { params: { role } })
      setSummary(res.data)
      if (!quiet) {
        // The AI note is optional and slower, so it fills in after the summary is already on screen.
        api.get<{ text: string | null }>('/assistant/narrative', { timeout: 15000, params: { role } })
          .then(r => setNarrative(r.data?.text ?? null))
          .catch(() => setNarrative(null))
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => {
    load()
    // The email briefing is built for owners only.
    if (role !== 'owner') return
    api.get<{ digestEnabled: boolean }>('/assistant/preferences')
      .then(r => setDigest(!!r.data?.digestEnabled))
      .catch(() => setDigest(null))
  }, [load, role])

  const run = async (action: () => Promise<unknown>, failure: string) => {
    setBusy(true)
    setActionError('')
    try {
      await action()
      setMenu(null)
      await load(true)
    } catch (e) {
      setActionError(errorMessage(e, failure))
    } finally {
      setBusy(false)
    }
  }

  const snooze = (p: AssistantPriority, days: number) =>
    run(() => api.post('/assistant/dismiss', { role, key: p.key, kind: 'snooze', until: snoozeUntil(days) }), 'Could not snooze this item.')

  const markHandled = (p: AssistantPriority) =>
    run(() => api.post('/assistant/dismiss', { role, key: p.key, kind: 'handled' }), 'Could not hide this item.')

  const restore = (key: string) =>
    run(() => api.delete(`/assistant/dismiss/${encodeURIComponent(key)}`, { params: { role } }), 'Could not restore this item.')

  const openDraft = async (target: DraftTarget) => {
    setBusy(true)
    setActionError('')
    try {
      const res = await api.post<Draft>('/assistant/draft', { type: target.type, id: target.id })
      setDraft(res.data)
      setMenu(null)
    } catch (e) {
      setActionError(errorMessage(e, 'Could not prepare a draft.'))
    } finally {
      setBusy(false)
    }
  }

  const toggleDigest = async (enabled: boolean) => {
    setDigestError('')
    try {
      const res = await api.put<{ digestEnabled: boolean }>('/assistant/preferences', { digestEnabled: enabled })
      setDigest(res.data.digestEnabled)
    } catch (e) {
      setDigestError(errorMessage(e, 'Could not update your email preference.'))
    }
  }

  const priorities = summary?.priorities ?? []
  const visiblePriorities = showAll ? priorities : priorities.slice(0, INITIAL_PRIORITIES)
  const hiddenCount = priorities.length - INITIAL_PRIORITIES
  const canExpand = hiddenCount > 0 || (summary?.tasks.length ?? 0) > 0

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 sm:mb-8 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            Ecco <span className="text-sm font-medium text-gray-500">· your EventEcos assistant</span>
          </h2>
        </div>
        {summary && (
          <button type="button" onClick={() => load(true)} className="text-xs text-gray-400 hover:text-gray-600" title="Refresh">
            Updated {new Date(summary.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-4 sm:p-6 space-y-3 animate-pulse" aria-busy="true">
          <div className="h-4 bg-gray-100 rounded w-2/3" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-3/4" />
        </div>
      ) : error || !summary ? (
        <div className="p-4 sm:p-6 text-sm text-gray-600 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-gray-400" /> Ecco couldn&apos;t load your summary right now.</span>
          <button type="button" onClick={() => load()} className="text-indigo-600 hover:underline font-medium">Try again</button>
        </div>
      ) : (
        <div className="p-4 sm:p-6 space-y-5">
          <div>
            <p className="text-base font-semibold text-gray-900">{summary.headline}</p>
            {narrative && (
              <p className="mt-1.5 text-sm text-gray-600">
                {narrative} <span className="text-xs text-gray-400 whitespace-nowrap">AI-generated</span>
              </p>
            )}
          </div>

          {summary.allClear && (
            <p className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" /> Nothing is waiting on you.
            </p>
          )}

          {actionError && <p className="text-sm text-red-600" role="alert">{actionError}</p>}

          {priorities.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Needs attention</h3>
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                {visiblePriorities.map(p => (
                  <li key={p.key} className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${SEVERITY_DOT[p.severity]}`} aria-hidden />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{p.title}</p>
                          <ul className="mt-1 space-y-1">
                            {p.reasons.map(r => (
                              <li key={r.text} className="text-xs text-gray-600 flex items-start gap-2">
                                <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${ACTOR_LABEL[r.actor].classes}`}>
                                  {ACTOR_LABEL[r.actor].text}
                                </span>
                                <span>{r.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <Link href={p.href} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center flex-shrink-0 whitespace-nowrap">
                        {p.actionLabel} <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>

                    <div className="mt-2 ml-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      {p.targets.length > 0 && (
                        <button type="button" disabled={busy} onClick={() => p.targets.length === 1 ? openDraft(p.targets[0]) : setMenu(menu?.key === p.key && menu.mode === 'draft' ? null : { key: p.key, mode: 'draft' })} className="text-indigo-600 hover:underline disabled:opacity-50">
                          Draft follow-up
                        </button>
                      )}
                      {summary.canDismiss && (
                        <>
                          <button type="button" disabled={busy} onClick={() => setMenu(menu?.key === p.key && menu.mode === 'snooze' ? null : { key: p.key, mode: 'snooze' })} className="text-gray-500 hover:text-gray-800 hover:underline disabled:opacity-50">
                            Snooze
                          </button>
                          <button type="button" disabled={busy} onClick={() => markHandled(p)} title="Hides this line until something on it changes. Your records are not changed." className="text-gray-500 hover:text-gray-800 hover:underline disabled:opacity-50">
                            Mark handled
                          </button>
                        </>
                      )}
                    </div>

                    {menu?.key === p.key && menu.mode === 'snooze' && (
                      <div className="mt-2 ml-4 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-gray-500">Remind me in:</span>
                        {SNOOZE_OPTIONS.map(o => (
                          <button key={o.days} type="button" disabled={busy} onClick={() => snooze(p, o.days)} className="rounded-full border border-gray-200 px-2.5 py-1 text-gray-700 hover:border-indigo-300 disabled:opacity-50">
                            {o.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {menu?.key === p.key && menu.mode === 'draft' && (
                      <div className="mt-2 ml-4 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-gray-500">Follow up about:</span>
                        {p.targets.map(t => (
                          <button key={t.id} type="button" disabled={busy} onClick={() => openDraft(t)} className="rounded-full border border-gray-200 px-2.5 py-1 text-gray-700 hover:border-indigo-300 disabled:opacity-50">
                            {t.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {canExpand && (
                <button type="button" onClick={() => setShowAll(v => !v)} className="mt-2 text-sm text-indigo-600 hover:underline flex items-center gap-1">
                  {showAll ? 'Show fewer' : hiddenCount > 0 ? `Show all tasks (${hiddenCount} more)` : 'Show all tasks'}
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          )}

          {summary.hidden.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowHidden(v => !v)} className="text-xs text-gray-500 hover:text-gray-800 hover:underline">
                {showHidden ? 'Hide' : 'Show'} {summary.hidden.length} snoozed or handled {summary.hidden.length === 1 ? 'item' : 'items'}
              </button>
              {showHidden && (
                <ul className="mt-2 space-y-1">
                  {summary.hidden.map(h => (
                    <li key={h.key} className="flex items-center justify-between gap-3 text-xs text-gray-600">
                      <span className="min-w-0 truncate">
                        {h.title} <span className="text-gray-400">· {h.kind === 'snooze' && h.until ? `snoozed until ${formatDate(h.until)}` : 'handled'}</span>
                      </span>
                      <button type="button" disabled={busy} onClick={() => restore(h.key)} className="flex-shrink-0 text-indigo-600 hover:underline disabled:opacity-50">Restore</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {showAll && summary.tasks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Everything outstanding</h3>
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                {summary.tasks.map(task => (
                  <li key={task.key} className="p-3 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 min-w-0 text-sm text-gray-900">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${SEVERITY_DOT[task.severity]}`} aria-hidden />
                      <span className="truncate">{task.label}</span>
                      <span className="text-xs font-semibold text-gray-700 bg-gray-100 rounded-full px-2 py-0.5">{task.count}</span>
                      {task.amount ? <span className="text-xs text-gray-500 whitespace-nowrap">${task.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : null}
                    </span>
                    <Link href={task.href} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center flex-shrink-0">
                      Review <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.upcomingEvents.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Coming up</h3>
              <ul className="space-y-2">
                {summary.upcomingEvents.map(event => (
                  <li key={event.id}>
                    <Link href={event.href} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors">
                      <Calendar className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900 truncate">{event.name}</span>
                        <span className="block text-xs text-gray-500">
                          {formatDate(event.date)}{event.startTime ? ` · ${event.startTime}` : ''}
                          {event.notes.length > 0 && <span className="text-amber-600"> · {event.notes.join(', ')}</span>}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.recentActivity.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Recent activity</h3>
              <ul className="space-y-1.5">
                {summary.recentActivity.map(a => (
                  <li key={`${a.href}-${a.at}`} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="min-w-0">
                      <Link href={a.href} className="hover:text-indigo-600 hover:underline">{a.text}</Link>
                      <span className="text-xs text-gray-400"> · {formatDay(a.at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <AssistantAsk role={role} suggestions={summary.suggestedQuestions} />

          {digest !== null && (
            <div className="border-t border-gray-100 pt-3">
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={digest} onChange={e => toggleDigest(e.target.checked)} />
                Email me Ecco&apos;s briefing every morning
              </label>
              {digestError && <p className="mt-1 text-xs text-red-600" role="alert">{digestError}</p>}
            </div>
          )}
        </div>
      )}

      {draft && <AssistantDraftModal draft={draft} onClose={() => setDraft(null)} />}
    </section>
  )
}
