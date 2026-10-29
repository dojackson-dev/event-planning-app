'use client'

import { useCallback, useEffect, useState } from 'react'
import { Ban, Banknote, Loader2, Plus } from 'lucide-react'
import api from '@/lib/api'

type Kind = 'owner' | 'vendor' | 'artist' | 'promoter'

interface Payment {
  id: string
  amount: number | string
  method: string
  paid_on: string
  reference: string | null
  notes: string | null
  voided_at: string | null
  void_reason: string | null
}

const METHODS: Array<{ value: string; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card_in_person', label: 'Card (in person)' },
  { value: 'other', label: 'Other' },
]
const methodLabel = (value: string) => METHODS.find(m => m.value === value)?.label ?? value

const todayLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const money = (n: number | string) => `$${Number(n).toFixed(2)}`
const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

/** Payments recorded by hand (cash, check, Zelle, ...) for an invoice, with a form to add one and a way to void a mistake. */
export default function InvoiceManualPayments({
  kind,
  invoiceId,
  status,
  amountDue,
  onChanged,
}: {
  kind: Kind
  invoiceId: string
  status: string
  amountDue: number
  onChanged: () => void
}) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('check')
  const [paidOn, setPaidOn] = useState(todayLocal())
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [sendReceipt, setSendReceipt] = useState(false)
  const [voidingId, setVoidingId] = useState<string | null>(null)
  const [voidReason, setVoidReason] = useState('')

  const load = useCallback(async () => {
    setLoadFailed(false)
    try {
      const res = await api.get(`/invoice-payments/${kind}/${invoiceId}`)
      setPayments(res.data)
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [kind, invoiceId])

  useEffect(() => { load() }, [load])

  const canRecord = amountDue > 0 && status !== 'cancelled' && status !== 'processing'

  const openForm = () => {
    setAmount(amountDue.toFixed(2))
    setMethod('check')
    setPaidOn(todayLocal())
    setReference('')
    setNotes('')
    setSendReceipt(false)
    setError('')
    setNotice('')
    setShowForm(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post(`/invoice-payments/${kind}/${invoiceId}`, { amount, method, paidOn, reference, notes, sendReceipt })
      setShowForm(false)
      await load()
      onChanged()
    } catch (err: any) {
      const message = err.response?.data?.message
      setError(Array.isArray(message) ? message.join(' ') : message || 'Could not record the payment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const submitVoid = async (paymentId: string) => {
    setSaving(true)
    setError('')
    try {
      const res = await api.post(`/invoice-payments/payments/${paymentId}/void`, { reason: voidReason })
      setVoidingId(null)
      setVoidReason('')
      setNotice(
        res.data?.reviewLinkedStatus
          ? 'Payment voided and the invoice balance restored. The linked event or booking keeps the status the payment gave it, so review it if it should change.'
          : 'Payment voided and the invoice balance restored.',
      )
      await load()
      onChanged()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not void the payment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm print:hidden sm:p-6" aria-labelledby="manual-payments">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="manual-payments" className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <Banknote className="h-5 w-5 text-gray-500" /> Recorded payments
        </h2>
        {canRecord && !showForm && (
          <button
            type="button"
            onClick={openForm}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" /> Record payment
          </button>
        )}
      </div>

      {notice && <p role="status" className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p>}
      {error && !showForm && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={submit} className="mt-4 space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Amount</span>
              <input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                inputMode="decimal"
                required
                className={inputClass}
                placeholder="0.00"
              />
              <span className="mt-1 block text-xs text-gray-500">{money(amountDue)} still due</span>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Paid by</span>
              <select value={method} onChange={e => setMethod(e.target.value)} className={inputClass}>
                {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Date received</span>
              <input type="date" value={paidOn} max={todayLocal()} onChange={e => setPaidOn(e.target.value)} required className={inputClass} />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Reference <span className="font-normal text-gray-400">(optional, such as a check number)</span></span>
            <input value={reference} onChange={e => setReference(e.target.value)} maxLength={120} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Notes <span className="font-normal text-gray-400">(optional)</span></span>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={500} rows={2} className={inputClass} />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={sendReceipt} onChange={e => setSendReceipt(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            Send a receipt to the client
          </label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save payment
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading payments…</div>
        ) : loadFailed ? (
          <p className="text-sm text-gray-600">
            Could not load the payment history.{' '}
            <button type="button" onClick={load} className="font-medium text-primary-600 hover:text-primary-700">Try again</button>
          </p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-gray-500">
            No payments recorded by hand yet. Use Record payment for cash, checks, Zelle and other payments made outside EventEcos.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {payments.map(p => {
              const voided = !!p.voided_at
              return (
                <li key={p.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className={voided ? 'text-gray-400' : 'text-gray-800'}>
                      <p className={`font-medium ${voided ? 'line-through' : ''}`}>
                        {money(p.amount)} · {methodLabel(p.method)}
                        {voided && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium no-underline text-gray-500">Voided</span>}
                      </p>
                      <p className="text-xs text-gray-500">
                        Received {formatDate(p.paid_on)}
                        {p.reference ? ` · ${p.reference}` : ''}
                      </p>
                      {p.notes && <p className="mt-0.5 text-xs text-gray-500">{p.notes}</p>}
                      {voided && p.void_reason && <p className="mt-0.5 text-xs text-gray-500">Reason: {p.void_reason}</p>}
                    </div>
                    {!voided && voidingId !== p.id && (
                      <button
                        type="button"
                        onClick={() => { setVoidingId(p.id); setVoidReason(''); setError(''); setNotice('') }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        <Ban className="h-3.5 w-3.5" /> Void
                      </button>
                    )}
                  </div>
                  {voidingId === p.id && (
                    <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-3">
                      <label className="block text-xs font-medium text-red-800">
                        Why is this payment being voided?
                        <input
                          value={voidReason}
                          onChange={e => setVoidReason(e.target.value)}
                          maxLength={200}
                          className={`${inputClass} mt-1`}
                          placeholder="For example, the check bounced"
                        />
                      </label>
                      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          disabled={saving || !voidReason.trim()}
                          onClick={() => submitVoid(p.id)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Void payment
                        </button>
                        <button
                          type="button"
                          onClick={() => { setVoidingId(null); setError('') }}
                          className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
                        >
                          Keep payment
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
