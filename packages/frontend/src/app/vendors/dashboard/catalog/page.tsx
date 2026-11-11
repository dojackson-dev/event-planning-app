'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import ImageUpload from '@/components/ImageUpload'
import { Package, Plus, Pencil, Trash2, Eye, EyeOff, Loader2, X, Boxes } from 'lucide-react'
import {
  UNIT_OPTIONS,
  formatMoney,
  unitSuffix,
  type CatalogItem,
  type CatalogKind,
  type CatalogUnit,
} from '@/lib/vendorCatalog'

interface FormState {
  id?: string
  kind: CatalogKind
  name: string
  description: string
  section: string
  unit: CatalogUnit
  price: string
  hide_price: boolean
  visible_to_clients: boolean
  image_url: string
  is_active: boolean
  includes: Record<string, string>
}

const emptyForm = (kind: CatalogKind): FormState => ({
  kind,
  name: '',
  description: '',
  section: '',
  unit: kind === 'package' ? 'flat' : 'each',
  price: '',
  hide_price: false,
  visible_to_clients: true,
  image_url: '',
  is_active: true,
  includes: {},
})

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

export default function VendorCatalogPage() {
  const router = useRouter()
  const [items, setItems] = useState<CatalogItem[]>([])
  const [showToClients, setShowToClients] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [bookingSlug, setBookingSlug] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await api.get('/vendor-catalog/mine')
      setItems(res.data.items ?? [])
      setShowToClients(!!res.data.show_to_clients)
      setLoadError('')
    } catch (err: any) {
      if (err.response?.status === 401) router.replace('/vendors/login')
      else setLoadError('We could not load your items. Please refresh to try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!localStorage.getItem('access_token')) { router.replace('/vendors/login'); return }
    load()
    api.get('/vendors/booking-links/mine').then(r => setBookingSlug(r.data?.slug ?? null)).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sections = useMemo(() => {
    const groups = new Map<string, CatalogItem[]>()
    for (const item of items) {
      const key = item.section || 'Other'
      groups.set(key, [...(groups.get(key) ?? []), item])
    }
    return [...groups.entries()]
  }, [items])

  const existingSections = useMemo(
    () => [...new Set(items.map(i => i.section).filter((s): s is string => !!s))],
    [items],
  )
  const plainItems = items.filter(i => i.kind === 'item')
  const activeCount = items.filter(i => i.is_active && i.visible_to_clients !== false).length

  const errorText = (err: any, fallback: string) => {
    const detail = err?.response?.data?.message
    return Array.isArray(detail) ? detail.join(' ') : detail || fallback
  }

  const toggleVisibility = async (next: boolean) => {
    setNotice(null)
    const previous = showToClients
    setShowToClients(next)
    try {
      await api.put('/vendor-catalog/settings', { show_to_clients: next })
    } catch (err) {
      setShowToClients(previous)
      setNotice({ kind: 'error', text: errorText(err, 'We could not change that setting.') })
    }
  }

  const openEdit = (item: CatalogItem) => {
    setFormError('')
    setForm({
      id: item.id,
      kind: item.kind,
      name: item.name,
      description: item.description ?? '',
      section: item.section ?? '',
      unit: item.unit,
      price: String(item.price),
      hide_price: item.hide_price,
      visible_to_clients: item.visible_to_clients !== false,
      image_url: item.image_url ?? '',
      is_active: item.is_active,
      includes: Object.fromEntries((item.includes ?? []).map(i => [i.item_id as string, String(i.quantity)])),
    })
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || saving) return
    setFormError('')
    if (!form.name.trim()) return setFormError('Enter a name.')
    const price = parseFloat(form.price)
    if (!form.hide_price && !(price >= 0)) return setFormError('Enter a price, or choose to hide it and quote clients individually.')

    const includes = Object.entries(form.includes)
      .map(([item_id, qty]) => ({ item_id, quantity: parseFloat(qty) }))
      .filter(i => i.item_id)
    if (form.kind === 'package' && includes.some(i => !(i.quantity > 0))) {
      return setFormError('Each included item needs a quantity above zero.')
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      section: form.section.trim() || null,
      unit: form.unit,
      price: Number.isFinite(price) ? price : 0,
      hide_price: form.hide_price,
      visible_to_clients: form.visible_to_clients,
      image_url: form.image_url || null,
      is_active: form.is_active,
    }
    if (!form.id) payload.kind = form.kind
    if (form.kind === 'package') payload.includes = includes

    setSaving(true)
    try {
      if (form.id) await api.put(`/vendor-catalog/${form.id}`, payload, { timeout: 30000 })
      else await api.post('/vendor-catalog', payload, { timeout: 30000 })
      setForm(null)
      setNotice({ kind: 'ok', text: 'Saved.' })
      await load()
    } catch (err) {
      setFormError(errorText(err, 'We could not save this. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (item: CatalogItem) => {
    setNotice(null)
    try {
      await api.put(`/vendor-catalog/${item.id}`, { is_active: !item.is_active })
      await load()
    } catch (err) {
      setNotice({ kind: 'error', text: errorText(err, 'We could not update that item.') })
    }
  }

  const remove = async (item: CatalogItem) => {
    if (!confirm(`Delete "${item.name}"? Estimates and invoices you already made keep their lines.`)) return
    setNotice(null)
    try {
      await api.delete(`/vendor-catalog/${item.id}`)
      await load()
    } catch (err) {
      setNotice({ kind: 'error', text: errorText(err, 'We could not delete that item.') })
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/vendors/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          ← Back to Dashboard
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Boxes className="w-6 h-6 text-primary-600" /> Items &amp; Packages
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              List what you offer with prices. Add them to estimates and invoices in one click, and optionally let
              clients pick from them.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setFormError(''); setForm(emptyForm('item')) }}
              className="inline-flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
            <button
              onClick={() => { setFormError(''); setForm(emptyForm('package')) }}
              className="inline-flex items-center gap-1.5 border border-primary-200 bg-white text-primary-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-50"
            >
              <Package className="w-4 h-4" /> Add Package
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showToClients}
              onChange={e => toggleVisibility(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm">
              <span className="font-medium text-gray-900">Show my items to clients</span>
              <span className="block text-gray-500">
                Clients can pick items and quantities on your public profile{bookingSlug ? ' and your booking link' : ''} when they
                request a booking. Their picks arrive with the request, and you turn them into an estimate with one click.
                Turn this off to keep your list private for your own estimates and invoices.
              </span>
              {showToClients && activeCount === 0 && (
                <span className="block mt-1 text-amber-700">You have no active items yet, so clients will not see a menu.</span>
              )}
            </span>
          </label>
        </div>

        {notice && (
          <div
            role="alert"
            className={`rounded-xl p-3 mb-4 text-sm border ${notice.kind === 'ok' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}
          >
            {notice.text}
          </div>
        )}
        {loadError && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">{loadError}</div>}

        {items.length === 0 && !loadError ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            <Boxes className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No items yet</p>
            <p className="text-sm text-gray-400 mt-1">Add what you sell, like menu items, rentals or services, and bundle them into packages.</p>
          </div>
        ) : (
          sections.map(([section, rows]) => (
            <section key={section} className="mb-8">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">{section}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rows.map(item => (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl border shadow-sm overflow-hidden flex ${item.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}
                  >
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt="" className="w-28 object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-28 bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {item.kind === 'package' ? <Package className="w-8 h-8 text-gray-300" /> : <Boxes className="w-8 h-8 text-gray-300" />}
                      </div>
                    )}
                    <div className="p-3 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-gray-900 text-sm">
                          {item.name}
                          {item.kind === 'package' && (
                            <span className="ml-2 align-middle text-[10px] font-medium bg-purple-100 text-purple-700 rounded-full px-2 py-0.5">Package</span>
                          )}
                          {item.visible_to_clients === false && (
                            <span className="ml-2 align-middle text-[10px] font-medium bg-gray-200 text-gray-700 rounded-full px-2 py-0.5">Private</span>
                          )}
                        </p>
                        <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
                          {item.hide_price ? 'Quote' : formatMoney(Number(item.price))}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {unitSuffix(item.unit) || 'each'}
                        {item.hide_price && ` · price hidden from clients (${formatMoney(Number(item.price))} on your estimates)`}
                      </p>
                      {item.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.description}</p>}
                      {item.kind === 'package' && item.includes.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Includes: {item.includes.map(i => (i.quantity === 1 ? i.name : `${i.name} ×${i.quantity}`)).join(', ')}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          onClick={() => toggleActive(item)}
                          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100"
                          title={item.is_active ? 'Hide this item' : 'Show this item'}
                        >
                          {item.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          {item.is_active ? 'Active' : 'Hidden'}
                        </button>
                        <button onClick={() => openEdit(item)} className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button onClick={() => remove(item)} aria-label={`Delete ${item.name}`} className="inline-flex items-center text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
          <form
            onSubmit={save}
            noValidate
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-semibold text-gray-900">
                {form.id ? 'Edit' : 'Add'} {form.kind === 'package' ? 'package' : 'item'}
              </h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Close" className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input className={inputClass} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={form.kind === 'package' ? 'e.g. Wedding Dessert Package' : 'e.g. Smoked brisket plate'} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
                <input className={inputClass} list="catalog-sections" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} placeholder="e.g. Entrees, Sides, Desserts" />
                <datalist id="catalog-sections">
                  {existingSections.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea rows={3} className={`${inputClass} resize-none`} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What the client gets" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Priced</label>
                  <select className={inputClass} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value as CatalogUnit })}>
                    {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price ($)</label>
                  <input className={inputClass} inputMode="decimal" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" className="mt-1 rounded border-gray-300" checked={form.visible_to_clients} onChange={e => setForm({ ...form, visible_to_clients: e.target.checked })} />
                <span>
                  Show on the client menu
                  <span className="block text-xs text-gray-500">
                    Turn this off to keep the item private. You can still add it to your own estimates and invoices.
                    {!showToClients && ' Clients only see a menu while "Show my items to clients" is on.'}
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" className="mt-1 rounded border-gray-300" checked={form.hide_price} onChange={e => setForm({ ...form, hide_price: e.target.checked })} />
                <span>
                  Hide the price from clients
                  <span className="block text-xs text-gray-500">Clients see &ldquo;Request a quote&rdquo;. The price above is still used when you build the estimate.</span>
                </span>
              </label>

              {form.kind === 'package' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">What is included</label>
                  {plainItems.length === 0 ? (
                    <p className="text-xs text-gray-500">Add some individual items first, then bundle them here.</p>
                  ) : (
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      {plainItems.map(item => {
                        const checked = item.id in form.includes
                        return (
                          <div key={item.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => {
                                const next = { ...form.includes }
                                if (e.target.checked) next[item.id] = '1'
                                else delete next[item.id]
                                setForm({ ...form, includes: next })
                              }}
                              aria-label={`Include ${item.name}`}
                              className="rounded border-gray-300"
                            />
                            <span className="flex-1 min-w-0 truncate">{item.name}</span>
                            {checked && (
                              <input
                                inputMode="decimal"
                                aria-label={`Quantity of ${item.name}`}
                                value={form.includes[item.id]}
                                onChange={e => setForm({ ...form, includes: { ...form.includes, [item.id]: e.target.value } })}
                                className="w-16 border border-gray-200 rounded-md px-2 py-1 text-right text-sm"
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">The package has its own price above; this list is what the client sees inside it.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Photo</label>
                <ImageUpload currentUrl={form.image_url} uploadType="service-item" shape="landscape" onUpload={url => setForm({ ...form, image_url: url })} />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" className="rounded border-gray-300" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                Active (available to add to estimates{showToClients ? ' and visible to clients' : ''})
              </label>

              {formError && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{formError}</div>}
            </div>

            <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
