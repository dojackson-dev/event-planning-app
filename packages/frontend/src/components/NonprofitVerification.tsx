'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { HeartHandshake, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react'
import api from '@/lib/api'

interface NonprofitStatus {
  isNonprofit: boolean
  status: 'unverified' | 'verified' | 'rejected'
  ein: string | null
  legalName: string | null
  verifiedAt: string | null
  reason: string | null
}

function formatEin(ein: string) {
  return ein.length === 9 ? `${ein.slice(0, 2)}-${ein.slice(2)}` : ein
}

export default function NonprofitVerification() {
  const [status, setStatus] = useState<NonprofitStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [ein, setEin] = useState('')
  const [legalName, setLegalName] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get<NonprofitStatus>('/nonprofit/status')
      setStatus(res.data)
      if (res.data.ein) setEin(formatEin(res.data.ein))
      if (res.data.legalName) setLegalName(res.data.legalName)
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Failed to load non-profit status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const verify = async () => {
    setVerifying(true)
    setError(null)
    try {
      const res = await api.post<NonprofitStatus>('/nonprofit/verify', {
        ein,
        legalName: legalName || undefined,
      })
      setStatus(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Verification failed. Try again.')
    } finally {
      setVerifying(false)
    }
  }

  const verified = status?.status === 'verified'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <HeartHandshake className="h-5 w-5 text-purple-600" />
        <h2 className="text-base font-semibold text-gray-900">Non-profit organization</h2>
        {verified && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified 501(c)(3)
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
        </div>
      ) : loadError ? (
        <p role="alert" className="text-sm text-red-600">{loadError}</p>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Registered non-profits can offer sponsorship levels and table sales.
            We check your EIN against IRS exempt-organization records. Verify
            before connecting your bank so your Stripe account is set up as a
            non-profit.
          </p>

          {verified ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <p className="font-medium">{status?.legalName}</p>
              <p>EIN {status?.ein ? formatEin(status.ein) : ''}</p>
              <p className="mt-2">
                Open any of your{' '}
                <Link href="/dashboard/promoter/events" className="font-medium underline">
                  events
                </Link>{' '}
                and choose Sponsorships to add levels.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {status?.status === 'rejected' && (
                <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{status.reason || 'This EIN could not be verified as a 501(c)(3).'}</span>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="np-ein" className="block text-sm font-medium text-gray-700 mb-1">
                    EIN
                  </label>
                  <input
                    id="np-ein"
                    inputMode="numeric"
                    value={ein}
                    onChange={(e) => setEin(e.target.value)}
                    placeholder="12-3456789"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label htmlFor="np-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Legal name (optional)
                  </label>
                  <input
                    id="np-name"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="As it appears with the IRS"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <button
                type="button"
                onClick={verify}
                disabled={verifying || ein.replace(/\D/g, '').length !== 9}
                className="inline-flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
                {verifying ? 'Checking IRS records...' : 'Verify with IRS'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
