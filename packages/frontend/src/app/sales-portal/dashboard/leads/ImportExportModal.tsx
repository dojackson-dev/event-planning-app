'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Loader2, Upload, X } from 'lucide-react'
import api from '@/lib/api'
import { AgentOption, ImportSummary, errorMessage } from './types'

interface Props {
  isManager: boolean
  agents: AgentOption[]
  onClose: () => void
  onImported: (message: string) => void
}

const TEMPLATE = 'Name,Business,Phone,Email,Website,City,State,Type,Notes\r\nJane Smith,Smith Catering,(404) 555-0123,jane@smithcatering.com,smithcatering.com,Atlanta,GA,Caterer,Met at the expo\r\n'

function saveFile(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function ImportExportModal({ isManager, agents, onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [assignTo, setAssignTo] = useState('pool')
  const [preview, setPreview] = useState<ImportSummary | null>(null)
  const [busy, setBusy] = useState<'preview' | 'import' | 'export' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const send = async (dryRun: boolean) => {
    if (!file) return
    setBusy(dryRun ? 'preview' : 'import')
    setError(null)
    try {
      const data = new FormData()
      data.append('file', file)
      data.append('dry_run', String(dryRun))
      if (isManager) data.append('assign_to', assignTo)
      const res = await api.post<ImportSummary>('/affiliates/leads/import', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (dryRun) {
        setPreview(res.data)
      } else {
        onImported(`Imported ${res.data.imported} lead${res.data.imported === 1 ? '' : 's'}. ${res.data.duplicates} duplicate${res.data.duplicates === 1 ? '' : 's'} skipped.`)
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not read that file.'))
    } finally {
      setBusy(null)
    }
  }

  const exportCsv = async () => {
    setBusy('export')
    setError(null)
    try {
      const res = await api.get<string>('/affiliates/leads/export', { responseType: 'text', transformResponse: r => r })
      saveFile(res.data, `eventecos-leads-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8')
    } catch (err) {
      setError(errorMessage(err, 'Could not export your leads.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="import-title" className="my-8 w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 id="import-title" className="text-lg font-semibold text-gray-900">Import and export leads</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-5 px-5 py-4">
          <section aria-labelledby="export-h">
            <h3 id="export-h" className="text-sm font-semibold text-gray-900">Export</h3>
            <p className="mt-1 text-sm text-gray-600">{isManager ? 'Download every lead as a CSV.' : 'Download the leads you have claimed as a CSV.'}</p>
            <button type="button" onClick={exportCsv} disabled={busy !== null} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60">
              {busy === 'export' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" aria-hidden="true" />} Download CSV
            </button>
          </section>

          <section aria-labelledby="import-h" className="border-t border-gray-100 pt-4">
            <h3 id="import-h" className="text-sm font-semibold text-gray-900">Import</h3>
            <p className="mt-1 text-sm text-gray-600">
              Upload a CSV with a name (or business) and a phone number for each row. Email, website, city, state, type and notes are optional. Anyone already in the system, matched by phone, email or business name, is skipped.
            </p>
            <button type="button" onClick={() => saveFile(TEMPLATE, 'eventecos-lead-template.csv', 'text/csv;charset=utf-8')} className="mt-1 text-sm text-indigo-600 underline">Download a template</button>

            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="import-file" className="mb-1 block text-xs font-medium text-gray-600">CSV file (up to 1000 leads, 1 MB)</label>
                <input
                  ref={input}
                  id="import-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => { setFile(e.target.files?.[0] ?? null); setPreview(null); setError(null) }}
                  className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700"
                />
              </div>
              {isManager ? (
                <div>
                  <label htmlFor="import-assign" className="mb-1 block text-xs font-medium text-gray-600">Who gets these leads?</label>
                  <select id="import-assign" value={assignTo} onChange={e => { setAssignTo(e.target.value); setPreview(null) }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="pool">Leave in the pool for agents to claim</option>
                    <option value="round_robin">Spread evenly across all agents</option>
                    <option value="me">Me</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Imported leads are claimed by you.</p>
              )}

              <button type="button" disabled={!file || busy !== null} onClick={() => send(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                {busy === 'preview' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" aria-hidden="true" />} Check file
              </button>
            </div>

            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

            {preview && (
              <div className="mt-4 space-y-3 rounded-xl border border-gray-200 p-3 text-sm" aria-live="polite">
                <p className="text-gray-800">
                  <strong>{preview.imported}</strong> of {preview.total} rows are ready to import. <strong>{preview.duplicates}</strong> already exist and <strong>{preview.invalid}</strong> have a problem.
                </p>
                {preview.duplicate_details.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600">Skipped as duplicates</p>
                    <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-xs text-gray-600">
                      {preview.duplicate_details.map(d => <li key={d.row}>Row {d.row}: {d.name} matches {d.matches} ({d.reasons.map(r => (r === 'business' ? 'business name' : r)).join(', ')})</li>)}
                    </ul>
                  </div>
                )}
                {preview.errors.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600">Rows with a problem</p>
                    <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-xs text-red-600">
                      {preview.errors.map(e => <li key={e.row}>Row {e.row}: {e.reason}</li>)}
                    </ul>
                  </div>
                )}
                <button type="button" disabled={preview.imported === 0 || busy !== null} onClick={() => send(false)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                  {busy === 'import' && <Loader2 className="w-4 h-4 animate-spin" />} Import {preview.imported} lead{preview.imported === 1 ? '' : 's'}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
