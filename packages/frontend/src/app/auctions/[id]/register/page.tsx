'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { auctionApi, parseApiError, setBidderToken } from '@/lib/auctionApi'
import CardSetup from '@/components/auction/CardSetup'
import OtpInput from '@/components/auction/OtpInput'
import { safeNext } from '@/components/auction/safeNext'
import { useBidder } from '@/components/auction/useBidder'

type Step = 'details' | 'verify' | 'card' | 'done'

interface VerifyResponse {
  verified: { email: boolean; phone: boolean }
  token?: string
  token_expires_at?: string
}

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'details', label: 'Your details' },
  { id: 'verify', label: 'Verify' },
  { id: 'card', label: 'Card' },
]

export default function RegisterPage() {
  const { id } = useParams<{ id: string }>()
  const search = useSearchParams()
  const next = safeNext(search.get('next'), `/auctions/${id}`)
  const { me, loading, reload } = useBidder(id)

  const [step, setStep] = useState<Step>('details')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [smsConsent, setSmsConsent] = useState(false)
  const [emailCode, setEmailCode] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  const [entered, setEntered] = useState({ email: false, sms: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  // Resume where the bidder left off when they already hold a session.
  useEffect(() => {
    if (!me) return
    if (me.bidder.can_bid) setStep('done')
    else if (me.bidder.verified && !me.bidder.blocked) setStep('card')
  }, [me])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const fail = (err: unknown) => setError(parseApiError(err).message)

  const start = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const res = await auctionApi.post<{ sent: { email: boolean; sms: boolean }; resend_after_seconds: number }>(`/${id}/register/start`, {
        fullName,
        email,
        phone,
        acceptTerms: true,
        smsConsent,
      })
      setCooldown(res.data.resend_after_seconds)
      setEntered({ email: false, sms: false })
      setEmailCode('')
      setPhoneCode('')
      if (!res.data.sent.email || !res.data.sent.sms) setInfo('One of your codes was sent recently. Use the code you already received, or resend in a minute.')
      setStep('verify')
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  const verify = async (channel: 'email' | 'sms') => {
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const res = await auctionApi.post<VerifyResponse>(`/${id}/register/verify`, {
        email,
        channel,
        code: channel === 'email' ? emailCode : phoneCode,
      })
      setEntered((prev) => ({ ...prev, [channel]: true }))
      if (res.data.token) {
        setBidderToken(id, res.data.token, res.data.token_expires_at)
        await reload()
        setStep('card')
      } else if (res.data.verified.email && res.data.verified.phone) {
        setInfo('Almost there. Request a new code with Resend if one of your codes is no longer the latest one we sent.')
      }
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  const resend = async (channel: 'email' | 'sms') => {
    setError(null)
    try {
      const res = await auctionApi.post<{ message: string; resend_after_seconds: number }>(`/${id}/register/resend`, { email, channel })
      setCooldown(res.data.resend_after_seconds)
      setInfo(res.data.message)
      setEntered((prev) => ({ ...prev, [channel]: false }))
    } catch (err) {
      fail(err)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-purple-600" aria-label="Loading" /></div>
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/auctions/${id}`} className="text-sm text-gray-500 hover:text-gray-700">Back to the auction</Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">Register to bid</h1>

      {step !== 'done' && (
        <ol className="my-5 flex gap-2 text-xs" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s.id} aria-current={s.id === step ? 'step' : undefined} className={`flex-1 rounded-full px-3 py-1.5 text-center font-medium ${i <= stepIndex ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              {i + 1}. {s.label}
            </li>
          ))}
        </ol>
      )}

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        {step === 'details' && (
          <form onSubmit={start} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">Full name</label>
              <input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={80} autoComplete="name" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">Mobile phone</label>
              <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" placeholder="(555) 555-1234" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
              <p className="mt-1 text-xs text-gray-500">We text a verification code to this number.</p>
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} required className="mt-1" />
              <span>
                I authorize a card on file for this auction. If I win or buy an item, my card will be charged the final price plus any applicable tax and processing fees. Winning bids are binding.
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={smsConsent} onChange={(e) => setSmsConsent(e.target.checked)} className="mt-1" />
              <span>(Optional) Text me when I am outbid or an order needs payment. Message and data rates may apply. Reply STOP to opt out.</span>
            </label>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={busy || !acceptTerms} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-2.5 font-medium text-white hover:bg-purple-700 disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send verification codes
            </button>
            <p className="text-center text-sm text-gray-500">
              Already registered? <Link href={`/auctions/${id}/login?next=${encodeURIComponent(next)}`} className="font-medium text-purple-700 underline">Log in</Link>
            </p>
          </form>
        )}

        {step === 'verify' && (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">Enter the codes we sent to <strong>{email}</strong> and your phone. Each is valid for 10 minutes.</p>
            {(['email', 'sms'] as const).map((channel) => {
              const done = entered[channel]
              const code = channel === 'email' ? emailCode : phoneCode
              return (
                <div key={channel} className="space-y-2">
                  {done ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-green-700"><CheckCircle2 className="h-4 w-4" /> {channel === 'email' ? 'Email' : 'Phone'} verified</p>
                  ) : (
                    <>
                      <OtpInput id={`${channel}-code`} label={channel === 'email' ? 'Email code' : 'Text message code'} value={code} onChange={channel === 'email' ? setEmailCode : setPhoneCode} disabled={busy} />
                      <div className="flex items-center justify-between">
                        <button type="button" onClick={() => verify(channel)} disabled={busy || code.length !== 6} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60">Verify</button>
                        <button type="button" onClick={() => resend(channel)} disabled={cooldown > 0} className="text-sm text-purple-700 underline disabled:text-gray-400 disabled:no-underline">
                          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
            {info && <p role="status" className="text-sm text-gray-600">{info}</p>}
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="button" onClick={() => { setStep('details'); setError(null) }} className="text-sm text-gray-500 underline">Change my details</button>
          </div>
        )}

        {step === 'card' && (
          <div>
            <h2 className="mb-1 text-lg font-semibold text-gray-900">Add a card</h2>
            <p className="mb-4 text-sm text-gray-600">Your card is only charged for items you win or buy. Card details are handled securely by Stripe.</p>
            <CardSetup auctionId={id} onSaved={async () => { await reload(); setStep('done') }} />
          </div>
        )}

        {step === 'done' && (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-semibold text-gray-900">You are ready to bid</h2>
            {me?.bidder.paddle_label && <p className="mt-1 text-gray-600">You are {me.bidder.paddle_label}.</p>}
            <Link href={next} className="mt-5 inline-block rounded-lg bg-purple-600 px-6 py-2.5 font-medium text-white hover:bg-purple-700">Start bidding</Link>
          </div>
        )}
      </div>
    </div>
  )
}
