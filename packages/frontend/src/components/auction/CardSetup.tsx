'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js'
import { auctionApi, bidderHeaders, parseApiError } from '@/lib/auctionApi'

interface Props {
  auctionId: string
  onSaved: () => void
}

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

/** Saves a card for off-session charges. Card details go straight from Stripe's iframe to Stripe; our API only sees the SetupIntent id. */
export default function CardSetup({ auctionId, onSaved }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const stripeRef = useRef<Stripe | null>(null)
  const elementsRef = useRef<StripeElements | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let element: StripePaymentElement | null = null

    async function init() {
      setLoading(true)
      setError(null)
      if (!PUBLISHABLE_KEY) {
        setError('Card entry is not available right now. Please try again later.')
        setLoading(false)
        return
      }
      try {
        const [stripe, intent] = await Promise.all([
          loadStripe(PUBLISHABLE_KEY),
          auctionApi.post<{ clientSecret: string }>('/bidder/card/setup-intent', {}, { headers: bidderHeaders(auctionId) }),
        ])
        if (cancelled) return
        if (!stripe) throw new Error('stripe')
        stripeRef.current = stripe
        const elements = stripe.elements({ clientSecret: intent.data.clientSecret })
        elementsRef.current = elements
        element = elements.create('payment', { layout: 'tabs', wallets: { applePay: 'never', googlePay: 'never' } })
        if (mountRef.current) element.mount(mountRef.current)
        element.on('ready', () => !cancelled && setLoading(false))
      } catch (err) {
        if (cancelled) return
        setError(parseApiError(err, 'Could not load the card form. Please try again.').message)
        setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
      element?.destroy()
    }
  }, [auctionId, attempt])

  const save = async () => {
    const stripe = stripeRef.current
    const elements = elementsRef.current
    if (!stripe || !elements) return
    setSaving(true)
    setError(null)
    try {
      const { error: stripeError, setupIntent } = await stripe.confirmSetup({ elements, redirect: 'if_required' })
      if (stripeError || !setupIntent) {
        setError(stripeError?.message ?? 'Your card could not be saved. Please check the details and try again.')
        return
      }
      await auctionApi.post('/bidder/card/confirm', { setupIntentId: setupIntent.id }, { headers: bidderHeaders(auctionId) })
      onSaved()
    } catch (err) {
      setError(parseApiError(err, 'Your card could not be saved. Please try again.').message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {loading && <div className="flex items-center gap-2 py-6 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading secure card form...</div>}
      <div ref={mountRef} className={loading ? 'hidden' : ''} />
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}{' '}
          {!loading && !stripeRef.current && <button type="button" onClick={() => setAttempt((a) => a + 1)} className="font-medium underline">Try again</button>}
        </p>
      )}
      {!loading && stripeRef.current && (
        <button type="button" onClick={save} disabled={saving} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-2.5 font-medium text-white hover:bg-purple-700 disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save card
        </button>
      )}
    </div>
  )
}
