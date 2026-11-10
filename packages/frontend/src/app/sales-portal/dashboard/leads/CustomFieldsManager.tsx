'use client'

import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { CustomField, errorMessage } from './types'

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const TYPE_LABEL: Record<CustomField['field_type'], string> = { text: 'Text', number: 'Number', date: 'Date', select: 'Choice list' }

interface Props {
  fields: CustomField[]
  onChanged: () => void
}

export default function CustomFieldsManager({ fields, onChanged }: Props) {
  const [label, setLabel] = useState('')
  const [type, setType] = useState<CustomField['field_type']>('text')
  const [options, setOptions] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setNotice(null)
    try {
      await api.post('/affiliates/leads/custom-fields', {
        label,
        field_type: type,
        options: type === 'select' ? options.split(/[\n,]/).map(o => o.trim()).filter(Boolean) : undefined,
      })
      setLabel('')
      setOptions('')
      setType('text')
      setNotice('Field added. It now appears on every lead.')
      onChanged()
    } catch (err) {
      setNotice(errorMessage(err, 'Could not add the field.'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (field: CustomField) => {
    if (!confirm(`Delete "${field.label}"? Values already saved on leads are hidden but kept.`)) return
    try {
      await api.delete(`/affiliates/leads/custom-fields/${field.id}`)
      onChanged()
    } catch (err) {
      setNotice(errorMessage(err, 'Could not delete the field.'))
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Add the details that matter to your sales process, such as guest count, event date or budget. They appear when adding or editing any lead, and in CSV exports.</p>
      <p aria-live="polite" className="min-h-[1.25rem] text-sm text-indigo-700">{notice}</p>

      <form onSubmit={add} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        <div>
          <label htmlFor="cf-label" className="mb-1 block text-xs font-medium text-gray-600">Field name</label>
          <input id="cf-label" required maxLength={60} value={label} onChange={e => setLabel(e.target.value)} className={inputClass} placeholder="Guest count" />
        </div>
        <div>
          <label htmlFor="cf-type" className="mb-1 block text-xs font-medium text-gray-600">Type</label>
          <select id="cf-type" value={type} onChange={e => setType(e.target.value as CustomField['field_type'])} className={inputClass}>
            {(Object.keys(TYPE_LABEL) as Array<CustomField['field_type']>).map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={busy || !label.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Add field
          </button>
        </div>
        {type === 'select' && (
          <div className="sm:col-span-3">
            <label htmlFor="cf-options" className="mb-1 block text-xs font-medium text-gray-600">Choices (one per line or comma separated, at least 2)</label>
            <textarea id="cf-options" rows={3} value={options} onChange={e => setOptions(e.target.value)} className={`${inputClass} resize-none`} />
          </div>
        )}
      </form>

      {fields.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No custom fields yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {fields.map(field => (
            <li key={field.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{field.label}</p>
                <p className="truncate text-xs text-gray-500">{TYPE_LABEL[field.field_type]}{field.field_type === 'select' && `: ${field.options.join(', ')}`}</p>
              </div>
              <button type="button" onClick={() => remove(field)} aria-label={`Delete ${field.label}`} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
