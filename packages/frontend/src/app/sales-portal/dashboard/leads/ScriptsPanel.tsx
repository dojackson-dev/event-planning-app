'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { LEAD_TYPE_OPTIONS, Script, errorMessage } from './types'

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function audienceLabel(audience: string): string {
  return LEAD_TYPE_OPTIONS.find(o => o.value === audience)?.label ?? 'Everyone'
}

interface Props {
  isManager: boolean
  /** Lets the parent refresh the scripts it passes to the lead detail view. */
  onChanged: () => void
}

export default function ScriptsPanel({ isManager, onChanged }: Props) {
  const [scripts, setScripts] = useState<Script[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState<Partial<Script> | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const res = await api.get<{ scripts: Script[] }>('/affiliates/scripts')
      setScripts(res.data.scripts)
    } catch (err) {
      setError(errorMessage(err, 'Could not load call scripts.'))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    setNotice(null)
    try {
      const body = { title: editing.title, audience: editing.audience ?? 'any', body: editing.body, is_active: editing.is_active ?? true }
      if (editing.id) await api.patch(`/affiliates/scripts/${editing.id}`, body)
      else await api.post('/affiliates/scripts', body)
      setEditing(null)
      setNotice('Script saved.')
      await load()
      onChanged()
    } catch (err) {
      setNotice(errorMessage(err, 'Could not save the script.'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (script: Script) => {
    if (!confirm(`Delete "${script.title}"?`)) return
    try {
      await api.delete(`/affiliates/scripts/${script.id}`)
      await load()
      onChanged()
    } catch (err) {
      setNotice(errorMessage(err, 'Could not delete the script.'))
    }
  }

  const copy = async (script: Script) => {
    try {
      await navigator.clipboard.writeText(script.body)
      setNotice('Script copied. {{name}} and {{business}} fill in automatically on a lead.')
    } catch {
      setNotice('Could not copy. Select the text and copy it instead.')
    }
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p role="alert" className="mb-3 text-sm text-gray-600">{error}</p>
        <button onClick={load} className="text-sm font-medium text-indigo-600 underline">Try again</button>
      </div>
    )
  }
  if (!scripts) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" aria-label="Loading scripts" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">Talking points for calls and follow-up emails. Open a lead and choose Call script to see one filled in with their name and business.</p>
        {isManager && (
          <button type="button" onClick={() => setEditing({ audience: 'any', is_active: true, title: '', body: '' })} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" aria-hidden="true" /> New script
          </button>
        )}
      </div>
      <p aria-live="polite" className="min-h-[1.25rem] text-sm text-indigo-700">{notice}</p>

      {editing && (
        <form onSubmit={save} className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="sc-title" className="mb-1 block text-xs font-medium text-gray-600">Title</label>
              <input id="sc-title" required maxLength={120} value={editing.title ?? ''} onChange={e => setEditing(s => ({ ...s, title: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label htmlFor="sc-audience" className="mb-1 block text-xs font-medium text-gray-600">For</label>
              <select id="sc-audience" value={editing.audience ?? 'any'} onChange={e => setEditing(s => ({ ...s, audience: e.target.value }))} className={inputClass}>
                <option value="any">Everyone</option>
                {LEAD_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="sc-body" className="mb-1 block text-xs font-medium text-gray-600">Script (use {'{{name}}'} and {'{{business}}'} to fill in the lead)</label>
            <textarea id="sc-body" required rows={12} maxLength={8000} value={editing.body ?? ''} onChange={e => setEditing(s => ({ ...s, body: e.target.value }))} className={`${inputClass} font-sans`} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={editing.is_active ?? true} onChange={e => setEditing(s => ({ ...s, is_active: e.target.checked }))} /> Show to agents
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-white">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save script
            </button>
          </div>
        </form>
      )}

      {scripts.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-500">{isManager ? 'No scripts yet. Add one for event owners, caterers or vendors.' : 'No call scripts have been added yet.'}</p>
      ) : (
        <ul className="space-y-3">
          {scripts.map(script => (
            <li key={script.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{script.title}</h3>
                  <p className="text-xs text-gray-500">For {audienceLabel(script.audience)}{!script.is_active && ' · Hidden from agents'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => copy(script)} aria-label={`Copy ${script.title}`} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><Copy className="h-4 w-4" /></button>
                  {isManager && (
                    <>
                      <button type="button" onClick={() => setEditing(script)} aria-label={`Edit ${script.title}`} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => remove(script)} aria-label={`Delete ${script.title}`} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </div>
              <pre className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap font-sans text-sm text-gray-700">{script.body}</pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
