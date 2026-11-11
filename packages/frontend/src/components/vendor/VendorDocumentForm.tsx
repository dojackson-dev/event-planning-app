'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Loader2, Save } from 'lucide-react'
import ClientPicker from './ClientPicker'
import LineItemsEditor, {
  type EditableLine,
  linesSubtotal,
  toPayloadItems,
  validateLines,
} from './LineItemsEditor'

export interface VendorDocumentValues {
  client_name: string
  client_email: string
  client_phone: string
  issue_date: string
  /** Invoice due date, or the date an estimate stays valid until. */
  end_date: string
  tax_rate: string
  discount_amount: string
  notes: string
  terms: string
  lines: EditableLine[]
}

export interface VendorDocumentPayload {
  client_name: string
  client_email: string
  client_phone: string | null
  issue_date: string
  end_date: string
  tax_rate: number
  discount_amount: number
  notes: string | null
  terms: string | null
  items: ReturnType<typeof toPayloadItems>
}

export interface VendorDocumentPrefill {
  /** Bump to apply the values again (for example when another booking is picked). */
  version: number
  client_name?: string
  client_email?: string
  client_phone?: string
  /** Only applied while the form still has just a blank first line. */
  lines?: EditableLine[]
}

interface Props {
  kind: 'invoice' | 'estimate'
  initial: VendorDocumentValues
  prefill?: VendorDocumentPrefill
  submitLabel: string
  savingLabel: string
  cancelHref: string
  /** Throws on failure; the message is shown to the vendor. */
  onSubmit: (payload: VendorDocumentPayload) => Promise<void>
  /** Shown above the client section (booking picker, warnings). */
  top?: ReactNode
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

const money = (n: number) => `$${n.toFixed(2)}`

/** The itemized form shared by vendor invoices and estimates (create and edit). */
export default function VendorDocumentForm({
  kind,
  initial,
  prefill,
  submitLabel,
  savingLabel,
  cancelHref,
  onSubmit,
  top,
}: Props) {
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!prefill) return
    setValues(prev => {
      const blank = prev.lines.length === 1 && !prev.lines[0].description.trim() && !prev.lines[0].unit_price.trim()
      return {
        ...prev,
        client_name: prefill.client_name ?? prev.client_name,
        client_email: prefill.client_email ?? prev.client_email,
        client_phone: prefill.client_phone ?? prev.client_phone,
        lines: prefill.lines && blank ? prefill.lines : prev.lines,
      }
    })
    // Only a new version re-applies the prefill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.version])

  const set = <K extends keyof VendorDocumentValues>(key: K, value: VendorDocumentValues[K]) =>
    setValues(prev => ({ ...prev, [key]: value }))

  const taxRate = Math.max(0, parseFloat(values.tax_rate) || 0)
  const discount = Math.max(0, parseFloat(values.discount_amount) || 0)
  const subtotal = linesSubtotal(values.lines)
  const taxAmount = subtotal * (taxRate / 100)
  const total = Math.max(0, subtotal + taxAmount - discount)
  const endLabel = kind === 'invoice' ? 'Due date' : 'Valid until'

  const fail = (message: string) => {
    setError(message)
    // The message sits above the buttons; bring it into view so a tap never looks like it did nothing.
    requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setError('')

    if (!values.client_name.trim()) return fail('Enter the client name.')
    if (!/^\S+@\S+\.\S+$/.test(values.client_email.trim())) return fail('Enter a valid client email address.')
    if (!values.issue_date) return fail('Choose the issue date.')
    if (!values.end_date) return fail(`Choose the ${endLabel.toLowerCase()}.`)
    if (values.end_date < values.issue_date) return fail(`The ${endLabel.toLowerCase()} cannot be before the issue date.`)
    const lineProblem = validateLines(values.lines)
    if (lineProblem) return fail(lineProblem)
    if (discount > subtotal + taxAmount) return fail('The discount cannot be more than the total.')

    setSaving(true)
    try {
      await onSubmit({
        client_name: values.client_name.trim(),
        client_email: values.client_email.trim(),
        client_phone: values.client_phone.trim() || null,
        issue_date: values.issue_date,
        end_date: values.end_date,
        tax_rate: taxRate,
        discount_amount: discount,
        notes: values.notes.trim() || null,
        terms: values.terms.trim() || null,
        items: toPayloadItems(values.lines),
      })
    } catch (err: any) {
      const detail = err?.response?.data?.message
      if (err?.code === 'ECONNABORTED') {
        fail('This is taking longer than expected. Check your list before trying again, in case it was already saved.')
      } else if (err?.isAxiosError) {
        fail(
          Array.isArray(detail)
            ? detail.join(' ')
            : detail || 'We could not reach the server. Check your connection and try again.',
        )
      } else {
        fail(err?.message || 'We could not save this. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {top}

      <section className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-4">Client</h2>
        <ClientPicker
          onPick={client =>
            setValues(prev => ({
              ...prev,
              client_name: client ? client.name : '',
              client_email: client ? client.email : '',
              client_phone: client ? client.phone : '',
            }))
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Client name *</label>
            <input
              className={inputClass}
              value={values.client_name}
              onChange={e => set('client_name', e.target.value)}
              placeholder="John Smith"
            />
          </div>
          <div>
            <label className={labelClass}>Client email *</label>
            <input
              className={inputClass}
              type="email"
              value={values.client_email}
              onChange={e => set('client_email', e.target.value)}
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className={labelClass}>Client phone</label>
            <input
              className={inputClass}
              type="tel"
              value={values.client_phone}
              onChange={e => set('client_phone', e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-4">Dates</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Issue date *</label>
            <input
              className={inputClass}
              type="date"
              value={values.issue_date}
              onChange={e => set('issue_date', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{endLabel} *</label>
            <input
              className={inputClass}
              type="date"
              value={values.end_date}
              onChange={e => set('end_date', e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-4">Line items</h2>
        <LineItemsEditor lines={values.lines} onChange={lines => set('lines', lines)} />
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-4">Totals</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Tax rate (%)</label>
            <input
              className={inputClass}
              type="text"
              inputMode="decimal"
              value={values.tax_rate}
              onChange={e => set('tax_rate', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Discount ($)</label>
            <input
              className={inputClass}
              type="text"
              inputMode="decimal"
              value={values.discount_amount}
              onChange={e => set('discount_amount', e.target.value)}
            />
          </div>
        </div>
        <div className="border-t border-gray-100 pt-4 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          {taxRate > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Tax ({taxRate}%)</span>
              <span>{money(taxAmount)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{money(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
          {kind === 'invoice' && total > 0 && (
            <>
              <div className="flex justify-between text-sm text-orange-600">
                <span>Platform fee (3%)</span>
                <span>-{money(total * 0.03)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-green-700">
                <span>Your payout</span>
                <span>{money(total * 0.97)}</span>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-4">Notes &amp; terms</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Notes (visible to client)</label>
            <textarea
              rows={3}
              className={`${inputClass} resize-none`}
              value={values.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Thank you for your business!"
            />
          </div>
          <div>
            <label className={labelClass}>{kind === 'invoice' ? 'Payment terms' : 'Terms'}</label>
            <textarea
              rows={2}
              className={`${inputClass} resize-none`}
              value={values.terms}
              onChange={e => set('terms', e.target.value)}
              placeholder={kind === 'invoice' ? 'Payment due within 30 days.' : 'A deposit may be required to book the date.'}
            />
          </div>
        </div>
      </section>

      {error && (
        <div
          ref={errorRef}
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm"
        >
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Link
          href={cancelHref}
          className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? savingLabel : submitLabel}
        </button>
      </div>
    </form>
  )
}
