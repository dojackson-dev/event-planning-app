'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, HeartHandshake, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'

interface SponsorshipLevel {
  id: string
  name: string
  description: string | null
  price: number
  fair_market_value: number
  quantity_available: number | null
  quantity_sold: number
  tables_included: number
  seats_per_table: number
  tickets_included: number
  benefits: string[]
  is_active: boolean
}

interface FormState {
  name: string
  description: string
  price: string
  fairMarketValue: string
  quantityAvailable: string
  tablesIncluded: string
  seatsPerTable: string
  ticketsIncluded: string
  benefits: string
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  price: '',
  fairMarketValue: '0',
  quantityAvailable: '',
  tablesIncluded: '0',
  seatsPerTable: '0',
  ticketsIncluded: '0',
  benefits: '',
  isActive: true,
}

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export default function SponsorshipsPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const [verified, setVerified] = useState<boolean | null>(null)
  const [levels, setLevels] = useState<SponsorshipLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const status = await api.get<{ status: string }>('/nonprofit/status')
      const ok = status.data.status === 'verified'
      setVerified(ok)
      if (ok) {
        const res = await api.get<SponsorshipLevel[]>(
          `/nonprofit/events/${eventId}/sponsorship-levels`,
        )
        setLevels(res.data)
      }
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Failed to load sponsorship levels')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    load()
  }, [load])

  const startNew = () => {
    setForm(EMPTY_FORM)
    setFormError(null)
    setEditingId('new')
  }

  const startEdit = (l: SponsorshipLevel) => {
    setForm({
      name: l.name,
      description: l.description ?? '',
      price: String(l.price),
      fairMarketValue: String(l.fair_market_value),
      quantityAvailable: l.quantity_available === null ? '' : String(l.quantity_available),
      tablesIncluded: String(l.tables_included),
      seatsPerTable: String(l.seats_per_table),
      ticketsIncluded: String(l.tickets_included),
      benefits: l.benefits.join('\n'),
      isActive: l.is_active,
    })
    setFormError(null)
    setEditingId(l.id)
  }

  const save = async () => {
    setSaving(true)
    setFormError(null)
    const body = {
      name: form.name,
      description: form.description || null,
      price: Number(form.price),
      fairMarketValue: Number(form.fairMarketValue || 0),
      quantityAvailable: form.quantityAvailable === '' ? null : Number(form.quantityAvailable),
      tablesIncluded: Number(form.tablesIncluded || 0),
      seatsPerTable: Number(form.seatsPerTable || 0),
      ticketsIncluded: Number(form.ticketsIncluded || 0),
      benefits: form.benefits.split('\n').map((b) => b.trim()).filter(Boolean),
      isActive: form.isActive,
    }
    try {
      if (editingId === 'new') {
        await api.post(`/nonprofit/events/${eventId}/sponsorship-levels`, body)
      } else {
        await api.put(`/nonprofit/sponsorship-levels/${editingId}`, body)
      }
      setEditingId(null)
      await load()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setFormError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to save level')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (l: SponsorshipLevel) => {
    const warning =
      l.quantity_sold > 0
        ? `"${l.name}" has sales, so it will be hidden instead of deleted. Continue?`
        : `Delete "${l.name}"?`
    if (!window.confirm(warning)) return
    try {
      await api.delete(`/nonprofit/sponsorship-levels/${l.id}`)
      await load()
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Failed to remove level')
    }
  }

  const field = (key: keyof FormState, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`sl-${key}`} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={`sl-${key}`}
        value={form[key] as string}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        {...props}
      />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href={`/dashboard/promoter/events/${eventId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to event
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartHandshake className="h-6 w-6 text-pink-600" />
          <h1 className="text-xl font-bold text-gray-900">Sponsorship levels</h1>
        </div>
        {verified && editingId === null && (
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" /> Add level
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      ) : loadError ? (
        <p role="alert" className="text-sm text-red-600">{loadError}</p>
      ) : verified === false ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Sponsorships are available to IRS-verified non-profits.{' '}
          <Link href="/dashboard/promoter/profile" className="font-medium underline">
            Verify your organization
          </Link>{' '}
          in your profile first.
        </div>
      ) : (
        <>
          {editingId !== null && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h2 className="text-base font-semibold text-gray-900">
                {editingId === 'new' ? 'New level' : 'Edit level'}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {field('name', 'Name', { placeholder: 'Gold Sponsor', maxLength: 100 })}
                {field('price', 'Price ($)', { type: 'number', min: 0, step: '0.01' })}
                {field('fairMarketValue', 'Value received by sponsor ($)', { type: 'number', min: 0, step: '0.01' })}
                {field('quantityAvailable', 'Available (blank = unlimited)', { type: 'number', min: 1 })}
                {field('tablesIncluded', 'Tables included', { type: 'number', min: 0 })}
                {field('seatsPerTable', 'Seats per table', { type: 'number', min: 0 })}
                {field('ticketsIncluded', 'Individual tickets included', { type: 'number', min: 0 })}
              </div>
              <div>
                <label htmlFor="sl-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="sl-description"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label htmlFor="sl-benefits" className="block text-sm font-medium text-gray-700 mb-1">
                  Benefits (one per line)
                </label>
                <textarea
                  id="sl-benefits"
                  rows={4}
                  value={form.benefits}
                  onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                  placeholder={'Logo on event signage\nHalf-page program ad'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Visible to buyers
              </label>
              <p className="text-xs text-gray-500">
                The tax-deductible amount on receipts is the price minus the value received.
              </p>
              {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || !form.name.trim() || form.price === ''}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'Saving...' : 'Save level'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {levels.length === 0 && editingId === null ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
              No sponsorship levels yet. Add your first one to start offering sponsorships.
            </div>
          ) : (
            <ul className="space-y-3">
              {levels.map((l) => (
                <li key={l.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{l.name}</h3>
                        {!l.is_active && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Hidden</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {money(l.price)}
                        {l.fair_market_value > 0 && ` · deductible ${money(l.price - l.fair_market_value)}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {[
                          l.tables_included > 0 && `${l.tables_included} table(s) of ${l.seats_per_table}`,
                          l.tickets_included > 0 && `${l.tickets_included} ticket(s)`,
                          l.quantity_available === null
                            ? `${l.quantity_sold} sold`
                            : `${l.quantity_sold} of ${l.quantity_available} sold`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {l.benefits.length > 0 && (
                        <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
                          {l.benefits.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(l)}
                        aria-label={`Edit ${l.name}`}
                        className="p-2 text-gray-500 hover:text-purple-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(l)}
                        aria-label={`Remove ${l.name}`}
                        className="p-2 text-gray-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
