'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, HeartHandshake, Loader2, X } from 'lucide-react'
import api from '@/lib/api'
import NonprofitBadge, { NonprofitInfo } from '@/components/NonprofitBadge'

interface Level {
  id: string
  name: string
  description: string | null
  price: number
  fair_market_value: number
  service_fee: number
  buyer_total: number
  remaining: number | null
  tables_included: number
  seats_per_table: number
  tickets_included: number
  benefits: string[]
}

interface EventSummary {
  title: string
  event_date: string
  venue_name: string | null
  promoter_accounts?: ({ company_name: string | null; contact_name: string | null } & NonprofitInfo) | null
}

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export default function SponsorPage({ params }: { params: { id: string } }) {
  const { id } = params
  const searchParams = useSearchParams()
  const success = searchParams?.get('success') === 'true'
  const canceled = searchParams?.get('canceled') === 'true'

  const [event, setEvent] = useState<EventSummary | null>(null)
  const [levels, setLevels] = useState<Level[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Level | null>(null)
  const [form, setForm] = useState({ buyerName: '', buyerEmail: '', buyerPhone: '', companyName: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get(`/promoter-events/public/${id}`),
      api.get(`/nonprofit/public/events/${id}/sponsorship-levels`),
    ])
      .then(([ev, lv]) => {
        setEvent(ev.data)
        setLevels(lv.data || [])
      })
      .catch((e) => setError(e?.response?.data?.message || 'Sponsorships are not available for this event'))
      .finally(() => setLoading(false))
  }, [id])

  const checkout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    setFormError('')
    try {
      const res = await api.post(`/nonprofit/public/sponsorship-levels/${selected.id}/checkout`, {
        buyerName: form.buyerName,
        buyerEmail: form.buyerEmail,
        buyerPhone: form.buyerPhone || undefined,
        companyName: form.companyName || undefined,
      })
      if (res.data?.url) {
        window.location.href = res.data.url
        return
      }
      setFormError('Could not start checkout. Please try again.')
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setFormError(Array.isArray(msg) ? msg.join(', ') : msg || 'Could not start checkout. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500'

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link href={`/events/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to event
      </Link>

      {success && (
        <div role="status" className="flex gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Thank you for sponsoring!</p>
            <p className="text-sm">A receipt with your tax information is on its way to your email.</p>
          </div>
        </div>
      )}
      {canceled && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Checkout was canceled. You have not been charged.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      ) : error ? (
        <p role="alert" className="text-sm text-red-600">{error}</p>
      ) : (
        <>
          <header className="space-y-1">
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-6 w-6 text-pink-600" />
              <h1 className="text-2xl font-bold text-gray-900">Sponsor {event?.title}</h1>
            </div>
            {event?.promoter_accounts && (
              <p className="text-sm text-gray-500">
                Benefiting {event.promoter_accounts.company_name || event.promoter_accounts.contact_name}
              </p>
            )}
            <NonprofitBadge promoter={event?.promoter_accounts} />
          </header>

          {levels.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
              No sponsorship levels are available right now.
            </div>
          ) : (
            <ul className="space-y-4">
              {levels.map((l) => {
                const soldOut = l.remaining !== null && l.remaining <= 0
                return (
                  <li key={l.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-gray-900">{l.name}</h2>
                        {l.description && <p className="text-sm text-gray-600">{l.description}</p>}
                        <p className="text-xs text-gray-500">
                          {[
                            l.tables_included > 0 && `${l.tables_included} table(s) of ${l.seats_per_table}`,
                            l.tickets_included > 0 && `${l.tickets_included} ticket(s)`,
                            l.remaining !== null && !soldOut && `${l.remaining} left`,
                          ]
                            .filter(Boolean)
                            .join(' \u00b7 ')}
                        </p>
                        {l.benefits.length > 0 && (
                          <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
                            {l.benefits.map((b) => (
                              <li key={b}>{b}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-gray-900">{usd(l.price)}</p>
                        {l.fair_market_value > 0 && (
                          <p className="text-xs text-gray-500">{usd(l.price - l.fair_market_value)} tax-deductible</p>
                        )}
                        <button
                          type="button"
                          disabled={soldOut}
                          onClick={() => {
                            setSelected(l)
                            setFormError('')
                          }}
                          className="mt-3 px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {soldOut ? 'Sold out' : 'Sponsor'}
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={`Sponsor ${selected.name}`}>
          <form onSubmit={checkout} className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                <p className="text-sm text-gray-500">{usd(selected.price)} sponsorship</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close" className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label htmlFor="sp-name" className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
              <input id="sp-name" required value={form.buyerName} onChange={(e) => setForm({ ...form, buyerName: e.target.value })} className={input} />
            </div>
            <div>
              <label htmlFor="sp-company" className="block text-sm font-medium text-gray-700 mb-1">Company (optional)</label>
              <input id="sp-company" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className={input} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="sp-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input id="sp-email" type="email" required value={form.buyerEmail} onChange={(e) => setForm({ ...form, buyerEmail: e.target.value })} className={input} />
              </div>
              <div>
                <label htmlFor="sp-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input id="sp-phone" type="tel" value={form.buyerPhone} onChange={(e) => setForm({ ...form, buyerPhone: e.target.value })} className={input} />
              </div>
            </div>

            <dl className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
              <div className="flex justify-between"><dt className="text-gray-600">Sponsorship</dt><dd>{usd(selected.price)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-600">Service fee<span className="block text-xs text-gray-400">Includes EventEcos fee and card processing</span></dt><dd>{usd(selected.service_fee)}</dd></div>
              <div className="flex justify-between font-semibold border-t border-gray-200 pt-1"><dt>Total</dt><dd>{usd(selected.buyer_total)}</dd></div>
              {selected.fair_market_value > 0 && (
                <p className="text-xs text-gray-500 pt-1">
                  Tax-deductible portion: {usd(selected.price - selected.fair_market_value)} (sponsorship minus {usd(selected.fair_market_value)} value received).
                </p>
              )}
            </dl>

            {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Redirecting to payment...' : `Continue to payment \u2014 ${usd(selected.buyer_total)}`}
            </button>
          </form>
        </div>
      )}
    </main>
  )
}
