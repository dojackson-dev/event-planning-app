'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useClientAuth } from '@/contexts/ClientAuthContext'
import { Phone, ShieldCheck, ArrowLeft, MessageSquare } from 'lucide-react'

type Step = 'phone' | 'otp'

export default function ClientLoginPage() {
  const { requestOtp, verifyOtp } = useClientAuth()

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [agreedToSms, setAgreedToSms] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [devOtp, setDevOtp] = useState<string | null>(null)

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!agreedToSms || !agreedToTerms) {
      setError('Please agree to both SMS communications and the Terms of Service / Privacy Policy to continue.')
      return
    }

    setLoading(true)
    try {
      const result = await requestOtp(phone, agreedToSms, agreedToTerms)
      if (result.devOtp) setDevOtp(result.devOtp)
      setStep('otp')
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to send verification code.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await verifyOtp(phone, otp)
      // redirect handled by context
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Invalid or expired code.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/lib/LogoDVS.png" alt="DoVenue Suites" width={240} height={64} className="h-16 w-auto" />
          </Link>
          <Link href="/" className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Card Header */}
            <div className="bg-primary-600 px-8 py-6 text-white text-center">
              <div className="flex justify-center mb-3">
                <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                  <ShieldCheck className="h-7 w-7 text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-bold">Client Portal</h1>
              <p className="mt-1 text-primary-100 text-sm">
                {step === 'phone'
                  ? 'Sign in with your phone number'
                  : 'Enter the code we sent you'}
              </p>
            </div>

            <div className="px-8 py-8">
              {step === 'phone' ? (
                <form onSubmit={handleRequestOtp} className="space-y-5">
                  {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Phone Input */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        required
                        placeholder="(555) 555-5555"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 placeholder-gray-400"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500">
                      Use the phone number on file with DoVenue Suites.
                    </p>
                  </div>

                  {/* SMS Consent */}
                  <div className="space-y-3 rounded-lg bg-gray-50 border border-gray-200 p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedToSms}
                        onChange={(e) => setAgreedToSms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">SMS Communications</span> – I agree to receive
                        one-time passcodes and event notifications via SMS from DoVenue Suites.
                        Message & data rates may apply.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">Terms & Privacy</span> – I have read and agree to
                        the{' '}
                        <Link href="/terms-of-service" target="_blank" className="text-primary-600 hover:underline">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy-policy" target="_blank" className="text-primary-600 hover:underline">
                          Privacy Policy
                        </Link>
                        .
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Sending Code...' : 'Send Verification Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <div className="text-center text-sm text-gray-600 bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <MessageSquare className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                    A 6-digit code was sent to{' '}
                    <span className="font-semibold text-gray-900">{phone}</span>
                  </div>

                  {/* Dev OTP hint */}
                  {devOtp && (
                    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-center">
                      <p className="text-xs text-yellow-700 font-medium">Dev Mode — Your OTP:</p>
                      <p className="text-2xl font-bold text-yellow-800 tracking-widest mt-1">{devOtp}</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                      Verification Code
                    </label>
                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      required
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-center text-2xl font-bold tracking-widest placeholder-gray-300"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full py-3 px-4 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Verifying...' : 'Sign In'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStep('phone'); setOtp(''); setError(''); setDevOtp(null) }}
                    className="w-full py-2 text-sm text-gray-600 hover:text-primary-600"
                  >
                    ← Use a different number
                  </button>
                </form>
              )}
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-gray-500">
            Are you an event organizer?{' '}
            <Link href="/login" className="text-primary-600 hover:underline font-medium">
              Owner / Vendor Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
