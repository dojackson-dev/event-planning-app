'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowRight, Calendar, CheckCircle2, ChevronDown, Sparkles } from 'lucide-react'
import api from '@/lib/api'

type Severity = 'urgent' | 'attention' | 'info'

interface AssistantItem { label: string; detail: string; href: string }
interface AssistantTask {
  key: string
  label: string
  count: number
  amount?: number
  severity: Severity
  href: string
  items: AssistantItem[]
}
interface AssistantEvent { id: string; name: string; date: string; startTime: string | null; href: string; notes: string[] }
interface PriorityReason { text: string; actor: 'you' | 'client' }
interface AssistantPriority {
  key: string
  severity: Severity
  title: string
  reasons: PriorityReason[]
  href: string
  actionLabel: string
}
interface AssistantActivity { text: string; at: string; href: string }
interface AssistantSummary {
  generatedAt: string
  headline: string
  allClear: boolean
  upcomingEvents: AssistantEvent[]
  priorities: AssistantPriority[]
  recentActivity: AssistantActivity[]
  tasks: AssistantTask[]
}

const SEVERITY_DOT: Record<Severity, string> = {
  urgent: 'bg-red-500',
  attention: 'bg-amber-500',
  info: 'bg-blue-400',
}

const ACTOR_LABEL: Record<PriorityReason['actor'], { text: string; classes: string }> = {
  you: { text: 'Your action', classes: 'bg-indigo-50 text-indigo-700' },
  client: { text: 'Awaiting client', classes: 'bg-gray-100 text-gray-600' },
}

const INITIAL_PRIORITIES = 5

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function DashboardAssistant() {
  const [summary, setSummary] = useState<AssistantSummary | null>(null)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await api.get<AssistantSummary>('/assistant/summary')
      setSummary(res.data)
      // The AI note is optional and slower, so it fills in after the summary is already on screen.
      api.get<{ text: string | null }>('/assistant/narrative', { timeout: 15000 })
        .then(r => setNarrative(r.data?.text ?? null))
        .catch(() => setNarrative(null))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const priorities = summary?.priorities ?? []
  const visiblePriorities = showAll ? priorities : priorities.slice(0, INITIAL_PRIORITIES)
  const hiddenCount = priorities.length - INITIAL_PRIORITIES
  const canExpand = hiddenCount > 0 || (summary?.tasks.length ?? 0) > 0

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 sm:mb-8 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Your EventEcos Assistant</h2>
        </div>
        {summary && (
          <button type="button" onClick={load} className="text-xs text-gray-400 hover:text-gray-600" title="Refresh">
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
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-gray-400" /> Couldn&apos;t load your summary right now.</span>
          <button type="button" onClick={load} className="text-indigo-600 hover:underline font-medium">Try again</button>
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
                      {task.amount ? <span className="text-xs text-gray-500 whitespace-nowrap">${task.amount.toFixed(2)}</span> : null}
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
        </div>
      )}
    </section>
  )
}
