'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex flex-col">
      {/* Nav */}
      <nav className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/lib/LogoDVS.png" alt="DoVenueSuite" width={160} height={40} className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-gray-500 hover:text-gray-800">Venue owner login</Link>
            <Link href="/vendors/login" className="text-gray-500 hover:text-gray-800">Vendor login</Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
            Create your free account
          </h1>
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            Are you listing a <strong>venue</strong> or offering services as a <strong>vendor</strong>?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Venue Owner Card */}
          <Link
            href="/register"
            className="group bg-white rounded-2xl border-2 border-gray-200 hover:border-primary-500 hover:shadow-lg transition-all p-8 flex flex-col items-center text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center text-5xl mb-5 transition-colors">
              🏛️
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Venue Owner</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              You own or manage an event venue — ballrooms, halls, rooftops, and more. Manage events, bookings, invoices, and vendors all in one place.
            </p>
            <ul className="text-left text-sm text-gray-600 space-y-1.5 w-full mb-6">
              <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Event & booking management</li>
              <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Invoices, contracts & door lists</li>
              <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Hire vendors from the directory</li>
              <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Client messaging & guest lists</li>
            </ul>
            <span className="w-full text-center bg-primary-600 group-hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors">
              Sign up as Venue Owner →
            </span>
          </Link>

          {/* Vendor Card */}
          <Link
            href="/vendors/register"
            className="group bg-white rounded-2xl border-2 border-gray-200 hover:border-indigo-500 hover:shadow-lg transition-all p-8 flex flex-col items-center text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-5xl mb-5 transition-colors">
              🎪
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Vendor / Service Provider</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              You provide services at events — DJs, photographers, decorators, planners, musicians, and more. Get discovered and booked by event owners.
            </p>
            <ul className="text-left text-sm text-gray-600 space-y-1.5 w-full mb-6">
              <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Public profile in the directory</li>
              <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Receive & manage booking requests</li>
              <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Track earnings & payouts</li>
              <li className="flex items-center gap-2"><span className="text-green-500 font-bold">✓</span> Collect client reviews</li>
            </ul>
            <span className="w-full text-center bg-indigo-600 group-hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors">
              Sign up as Vendor →
            </span>
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 font-medium hover:text-primary-700">Log in as venue owner</Link>
          {' '}or{' '}
          <Link href="/vendors/login" className="text-indigo-600 font-medium hover:text-indigo-700">log in as vendor</Link>
        </p>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 py-6">
        © 2026 DoVenueSuite ·{' '}
        <Link href="/terms-of-service" className="hover:underline">Terms</Link>
        {' · '}
        <Link href="/privacy-policy" className="hover:underline">Privacy</Link>
      </footer>
    </div>
  )
}
