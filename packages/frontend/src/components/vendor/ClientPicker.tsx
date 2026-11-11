'use client'

import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'

export interface PickableClient {
  key: string
  name: string
  email: string
  phone: string
}

interface Props {
  onPick: (client: PickableClient | null) => void
}

const FILTER_THRESHOLD = 10

const optionLabel = (c: PickableClient) => (c.email && c.email !== c.name ? `${c.name} — ${c.email}` : c.name)

/** Dropdown of the vendor's existing clients; choosing one fills in the contact details. */
export default function ClientPicker({ onPick }: Props) {
  const [clients, setClients] = useState<PickableClient[] | null>(null)
  const [selected, setSelected] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    let cancelled = false
    api.get('/vendor-invoices/clients')
      .then(res => { if (!cancelled) setClients(Array.isArray(res.data) ? res.data : []) })
      .catch(() => { if (!cancelled) setClients([]) })
    return () => { cancelled = true }
  }, [])

  const visible = useMemo(() => {
    if (!clients) return []
    const term = filter.trim().toLowerCase()
    const list = term
      ? clients.filter(c => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(term))
      : clients
    // Keep the chosen client in the list even while a filter hides it.
    const chosen = clients.find(c => c.key === selected)
    return chosen && !list.includes(chosen) ? [chosen, ...list] : list
  }, [clients, filter, selected])

  if (clients === null) return null

  if (clients.length === 0) {
    return (
      <p className="mb-4 text-xs text-gray-500">
        Clients from your bookings, invoices and estimates will show up here so you can pick one instead of retyping.
      </p>
    )
  }

  return (
    <div className="mb-4 rounded-lg border border-primary-100 bg-primary-50/40 p-3">
      <label htmlFor="client-picker" className="block text-xs font-medium text-gray-700 mb-1">
        Choose an existing client
      </label>
      {clients.length > FILTER_THRESHOLD && (
        <input
          type="search"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search by name, email or phone…"
          aria-label="Search clients"
          className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      )}
      <select
        id="client-picker"
        value={selected}
        onChange={e => {
          const key = e.target.value
          setSelected(key)
          onPick(clients.find(c => c.key === key) ?? null)
        }}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">New client (type the details below)</option>
        {visible.map(c => (
          <option key={c.key} value={c.key}>{optionLabel(c)}</option>
        ))}
      </select>
      {visible.length === 0 && filter && <p className="mt-2 text-xs text-gray-500">No client matches &ldquo;{filter}&rdquo;.</p>}
    </div>
  )
}
