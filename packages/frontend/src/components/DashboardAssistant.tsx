'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowRight, Calendar, CheckCircle2, ChevronDown, Sparkles } from 'lucide-react'
import api from '@/lib/api'

interface AssistantItem { label: string; detail: string; href: string }
interface AssistantTask {
  key: string
  label: string
  count: number
  amount?: number
  severity: 'urgent' | 'attention' | 'info'
  href: string
  items: AssistantItem[]
}
interface AssistantEvent { id: string; name: string; date: string; startTime: string | null; href: string; notes: string[] }
interface AssistantSummary {
  headline: string
  allClear: boolean
  upcomingEvents: AssistantEvent[]
  tasks: AssistantTask[]
}

const SEVERITY_DOT: Record<AssistantTask['severity'], string> = {
  urgent: 'bg-red-500',
  attention: 'bg-amber-500',
  info: 'bg-blue-400',
}

const INITIAL_TASKS = 5

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

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

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 sm:mb-8 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Your assistant</h2>
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

          {summary.tasks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Needs your attention</h3>
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                {(showAll ? summary.tasks : summary.tasks.slice(0, INITIAL_TASKS)).map(task => (
                  <li key={task.key} className="p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${SEVERITY_DOT[task.severity]}`} aria-hidden />
                        <span className="text-sm font-medium text-gray-900 truncate">{task.label}</span>
                        <span className="text-xs font-semibold text-gray-700 bg-gray-100 rounded-full px-2 py-0.5">{task.count}</span>
                        {task.amount ? <span className="text-xs text-gray-500 whitespace-nowrap">${task.amount.toFixed(2)}</span> : null}
                      </div>
                      <Link href={task.href} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center flex-shrink-0">
                        Review <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>
                    {task.items.length > 0 && (
                      <ul className="mt-2 ml-4 space-y-0.5">
                        {task.items.map(item => (
                          <li key={item.href} className="text-xs text-gray-500 truncate">
                            <Link href={item.href} className="text-gray-700 hover:text-indigo-600 hover:underline">{item.label}</Link>
                            <span> — {item.detail}</span>
                          </li>
                        ))}
                        {task.count > task.items.length && (
                          <li className="text-xs text-gray-400">+ {task.count - task.items.length} more</li>
                        )}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              {summary.tasks.length > INITIAL_TASKS && (
                <button type="button" onClick={() => setShowAll(v => !v)} className="mt-2 text-sm text-indigo-600 hover:underline flex items-center gap-1">
                  {showAll ? 'Show fewer' : `Show ${summary.tasks.length - INITIAL_TASKS} more`}
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                </button>
              )}
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
        </div>
      )}
    </section>
  )
}
