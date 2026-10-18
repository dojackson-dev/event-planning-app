'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { auctionApi, parseApiError, setBidderToken } from '@/lib/auctionApi'
import OtpInput from '@/components/auction/OtpInput'
import { safeNext } from '@/components/auction/safeNext'

export default function LoginPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const search = useSearchParams()
  const next = safeNext(search.get('next'), `/auctions/${id}`)

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await auctionApi.post<{ message: string; resend_after_seconds: number }>(`/${id}/login/start`, { email })
      setInfo(res.data.message)
      setCooldown(res.data.resend_after_seconds)
      setCodeSent(true)
    } catch (err) {
      setError(parseApiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await auctionApi.post<{ token: string; token_expires_at: string }>(`/${id}/login/verify`, { email, code })
      setBidderToken(id, res.data.token, res.data.token_expires_at)
      router.push(next)
    } catch (err) {
      setError(parseApiError(err).message)
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Link href={`/auctions/${id}`} className="text-sm text-gray-500 hover:text-gray-700">Back to the auction</Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">Log in to bid</h1>
      <p className="mt-1 text-sm text-gray-600">We email you a one-time code. No password needed.</p>

      <div className="mt-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        {!codeSent ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">Email you registered with</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-2.5 font-medium text-white hover:bg-purple-700 disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Email me a code
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            {info && <p role="status" className="text-sm text-gray-600">{info}</p>}
            <OtpInput id="code" label="6-digit code" value={code} onChange={setCode} disabled={busy} />
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={busy || code.length !== 6} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-2.5 font-medium text-white hover:bg-purple-700 disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Log in
            </button>
            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => sendCode()} disabled={cooldown > 0 || busy} className="text-purple-700 underline disabled:text-gray-400 disabled:no-underline">
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
              <button type="button" onClick={() => { setCodeSent(false); setCode(''); setError(null) }} className="text-gray-500 underline">Use a different email</button>
            </div>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-gray-500">
          New here? <Link href={`/auctions/${id}/register?next=${encodeURIComponent(next)}`} className="font-medium text-purple-700 underline">Register to bid</Link>
        </p>
      </div>
    </div>
  )
}
