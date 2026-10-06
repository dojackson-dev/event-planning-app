'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw, Plus, Check, X, Pause, Play, Trash2, Search } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type SourceType = 'rest_json' | 'rss' | 'ics' | 'xml' | 'csv'
type SourceStatus = 'discovered' | 'review_terms' | 'approved' | 'active' | 'rejected' | 'paused'

interface EventSource {
  id: string
  name: string
  city: string | null
  state: string | null
  source_type: SourceType
  endpoint_url: string
  active: boolean
  sync_frequency_hours: number
  last_sync_at: string | null
  last_sync_status: string | null
  last_sync_error: string | null
  status: SourceStatus
  attribution_required: boolean
  created_at: string
}

interface DiscoveryCandidate {
  id: string
  query: string | null
  suggested_name: string | null
  city: string | null
  state: string | null
  candidate_url: string
  suggested_source_type: SourceType | null
  status: 'new' | 'promoted' | 'dismissed'
  notes: string | null
  discovered_at: string
}

const STATUS_STYLES: Record<SourceStatus, string> = {
  discovered: 'bg-gray-100 text-gray-800',
  review_terms: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paused: 'bg-orange-100 text-orange-800',
}

const NEXT_STATUS: Partial<Record<SourceStatus, SourceStatus>> = {
  discovered: 'review_terms',
  review_terms: 'approved',
  approved: 'active',
}

const emptyForm = {
  name: '',
  city: '',
  state: '',
  source_type: 'rest_json' as SourceType,
  endpoint_url: '',
  sync_frequency_hours: 24,
  attribution_required: false,
  attribution_text: '',
  notes: '',
}

export default function EventSourcesPage() {
  const [tab, setTab] = useState<'sources' | 'discovery'>('sources')
  const [sources, setSources] = useState<EventSource[]>([])
  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [queriesInput, setQueriesInput] = useState('')
  const [discoveryConfigured, setDiscoveryConfigured] = useState<boolean | null>(null)
  const [runningDiscovery, setRunningDiscovery] = useState(false)

  const getToken = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  const authFetch = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getToken()
    if (!token) throw new Error('Not authenticated')
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message || `HTTP ${res.status}`)
    }
    return res.json()
  }, [])

  const fetchSources = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await authFetch('/external-events/admin/sources')
      setSources(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load sources')
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  const fetchCandidates = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await authFetch('/external-events/admin/discovery-candidates?status=new')
      setCandidates(data || [])
      const status = await authFetch('/external-events/admin/discovery/status')
      setDiscoveryConfigured(status.searchProviderConfigured)
    } catch (err: any) {
      setError(err.message || 'Failed to load discovery candidates')
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    if (tab === 'sources') fetchSources()
    else fetchCandidates()
  }, [tab, fetchSources, fetchCandidates])

  const createSource = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await authFetch('/external-events/admin/sources', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setShowForm(false)
      setForm(emptyForm)
      fetchSources()
    } catch (err: any) {
      alert('Failed to create source: ' + err.message)
    }
  }

  const advanceStatus = async (source: EventSource) => {
    const next = NEXT_STATUS[source.status]
    if (!next) return
    try {
      await authFetch(`/external-events/admin/sources/${source.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      })
      fetchSources()
    } catch (err: any) {
      alert('Failed to update status: ' + err.message)
    }
  }

  const setPaused = async (source: EventSource) => {
    const next = source.status === 'paused' ? 'active' : 'paused'
    try {
      await authFetch(`/external-events/admin/sources/${source.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      })
      fetchSources()
    } catch (err: any) {
      alert('Failed to update status: ' + err.message)
    }
  }

  const rejectSource = async (source: EventSource) => {
    if (!confirm(`Reject source "${source.name}"?`)) return
    try {
      await authFetch(`/external-events/admin/sources/${source.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected' }),
      })
      fetchSources()
    } catch (err: any) {
      alert('Failed to reject source: ' + err.message)
    }
  }

  const deleteSource = async (source: EventSource) => {
    if (!confirm(`Permanently delete source "${source.name}"? This cannot be undone.`)) return
    try {
      await authFetch(`/external-events/admin/sources/${source.id}`, { method: 'DELETE' })
      setSources(sources.filter((s) => s.id !== source.id))
    } catch (err: any) {
      alert('Failed to delete source: ' + err.message)
    }
  }

  const syncNow = async (source: EventSource) => {
    setSyncingId(source.id)
    try {
      const result = await authFetch(`/external-events/admin/sources/${source.id}/sync`, { method: 'POST' })
      alert(
        `Synced "${source.name}": fetched ${result.fetched}, upserted ${result.upserted}` +
          (result.errors?.length ? `, ${result.errors.length} error(s)` : ''),
      )
      fetchSources()
    } catch (err: any) {
      alert('Sync failed: ' + err.message)
    } finally {
      setSyncingId(null)
    }
  }

  const dismissCandidate = async (candidate: DiscoveryCandidate) => {
    try {
      await authFetch(`/external-events/admin/discovery-candidates/${candidate.id}/dismiss`, { method: 'PATCH' })
      setCandidates(candidates.filter((c) => c.id !== candidate.id))
    } catch (err: any) {
      alert('Failed to dismiss candidate: ' + err.message)
    }
  }

  const promoteCandidate = async (candidate: DiscoveryCandidate) => {
    try {
      await authFetch(`/external-events/admin/discovery-candidates/${candidate.id}/promote`, {
        method: 'POST',
        body: JSON.stringify({
          name: candidate.suggested_name || candidate.candidate_url,
          city: candidate.city,
          state: candidate.state,
          source_type: candidate.suggested_source_type || 'rest_json',
          endpoint_url: candidate.candidate_url,
        }),
      })
      setCandidates(candidates.filter((c) => c.id !== candidate.id))
      alert('Promoted to source registry as "discovered" — configure connector details, then move it through review.')
    } catch (err: any) {
      alert('Failed to promote candidate: ' + err.message)
    }
  }

  const runDiscovery = async () => {
    const queries = queriesInput
      .split('\n')
      .map((q) => q.trim())
      .filter(Boolean)
    if (!queries.length) return
    setRunningDiscovery(true)
    try {
      const result = await authFetch('/external-events/admin/discovery/run', {
        method: 'POST',
        body: JSON.stringify({ queries }),
      })
      if (!result.ran) {
        alert(result.reason || 'Discovery did not run.')
      } else {
        alert(`Discovery found ${result.candidatesCreated} new candidate(s).`)
        fetchCandidates()
      }
    } catch (err: any) {
      alert('Discovery run failed: ' + err.message)
    } finally {
      setRunningDiscovery(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Event Sources</h1>
          <p className="text-gray-600 mt-1">Manage aggregated event feeds and review discovered sources</p>
        </div>
        {tab === 'sources' && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Source
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab('sources')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'sources' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
          }`}
        >
          Source Registry
        </button>
        <button
          onClick={() => setTab('discovery')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'discovery' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
          }`}
        >
          Discovery Candidates
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6 text-sm">{error}</div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Add Event Source</h2>
            <form onSubmit={createSource} className="space-y-3">
              <input
                required
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <div className="flex gap-3">
                <input
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  placeholder="State"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <select
                value={form.source_type}
                onChange={(e) => setForm({ ...form, source_type: e.target.value as SourceType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="rest_json">REST / JSON API</option>
                <option value="rss">RSS</option>
                <option value="ics">ICS / iCalendar</option>
                <option value="xml">XML</option>
                <option value="csv">Partner CSV</option>
              </select>
              <input
                required
                placeholder="Endpoint URL"
                value={form.endpoint_url}
                onChange={(e) => setForm({ ...form, endpoint_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">Sync every</label>
                <input
                  type="number"
                  min={1}
                  value={form.sync_frequency_hours}
                  onChange={(e) => setForm({ ...form, sync_frequency_hours: Number(e.target.value) })}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-sm text-gray-600">hours</span>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={form.attribution_required}
                  onChange={(e) => setForm({ ...form, attribution_required: e.target.checked })}
                />
                Attribution required
              </label>
              {form.attribution_required && (
                <input
                  placeholder="Attribution text"
                  value={form.attribution_text}
                  onChange={(e) => setForm({ ...form, attribution_text: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              )}
              <textarea
                placeholder="Notes (terms of use, contact, etc.)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                rows={2}
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'sources' ? (
        loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sync</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sources.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No event sources yet</td>
                  </tr>
                ) : (
                  sources.map((source) => (
                    <tr key={source.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{source.name}</p>
                        <p className="text-sm text-gray-500">
                          {[source.city, source.state].filter(Boolean).join(', ') || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 uppercase">{source.source_type}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[source.status]}`}>
                          {source.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {source.last_sync_at ? (
                          <>
                            <p>{new Date(source.last_sync_at).toLocaleString()}</p>
                            {source.last_sync_status && (
                              <p className={source.last_sync_status === 'failed' ? 'text-red-600' : 'text-gray-400'}>
                                {source.last_sync_status}
                              </p>
                            )}
                          </>
                        ) : (
                          'Never'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {NEXT_STATUS[source.status] && (
                            <button
                              title={`Move to ${NEXT_STATUS[source.status]}`}
                              onClick={() => advanceStatus(source)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          {(source.status === 'active' || source.status === 'paused') && (
                            <button
                              title={source.status === 'paused' ? 'Resume' : 'Pause'}
                              onClick={() => setPaused(source)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                            >
                              {source.status === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                            </button>
                          )}
                          {source.status === 'active' && (
                            <button
                              title="Sync now"
                              disabled={syncingId === source.id}
                              onClick={() => syncNow(source)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                            >
                              <RefreshCw className={`h-4 w-4 ${syncingId === source.id ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                          {source.status !== 'rejected' && (
                            <button
                              title="Reject"
                              onClick={() => rejectSource(source)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            title="Delete"
                            onClick={() => deleteSource(source)}
                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <p className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Search className="h-4 w-4" /> Run automated discovery
            </p>
            {discoveryConfigured === false && (
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-2">
                No search API key configured (BRAVE_SEARCH_API_KEY). Discovery runs will no-op until it&apos;s set — add
                candidates manually below in the meantime.
              </p>
            )}
            <textarea
              placeholder={'One search query per line, e.g.\nAtlanta events API\nAtlanta events RSS'}
              value={queriesInput}
              onChange={(e) => setQueriesInput(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
            />
            <button
              onClick={runDiscovery}
              disabled={runningDiscovery}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {runningDiscovery ? 'Running...' : 'Run Discovery'}
            </button>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Query</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suggested Type</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {candidates.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">No candidates awaiting review</td>
                    </tr>
                  ) : (
                    candidates.map((candidate) => (
                      <tr key={candidate.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{candidate.suggested_name || 'Untitled'}</p>
                          <a
                            href={candidate.candidate_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline break-all"
                          >
                            {candidate.candidate_url}
                          </a>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{candidate.query || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 uppercase">
                          {candidate.suggested_source_type || 'unknown'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              title="Promote to source"
                              onClick={() => promoteCandidate(candidate)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              title="Dismiss"
                              onClick={() => dismissCandidate(candidate)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
