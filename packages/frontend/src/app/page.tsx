'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Users, Store } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Home() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const [showFeatures, setShowFeatures] = useState(false)
  const [showVendors, setShowVendors] = useState(false)

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Beta Banner */}
      <div className="bg-amber-400 text-amber-900 text-center text-sm font-medium py-2 px-4">
        🚧 DoVenue Suite is currently in <strong>beta</strong> — features may change and bugs may occur. Thanks for being an early tester!
      </div>

      {/* Navigation Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Logo row — centered */}
          <div className="flex justify-center items-center py-4 border-b border-gray-100">
            <img src="/lib/LogoDVS.png" alt="EventSuite Logo" style={{ height: '72px', width: 'auto' }} />
          </div>
          {/* Log In row */}
          <div className="flex justify-center items-center py-3">
            <Link
              href="/login"
              className="bg-primary-600 text-white hover:bg-primary-700 px-6 py-2 rounded-md text-sm font-medium w-full max-w-xs text-center"
            >
              Owner/Vendor Login
            </Link>
          </div>
          {/* Secondary links row */}
          <div className="flex justify-center items-center gap-4 py-3">
              <Link
                href="/client-login"
                className="text-primary-600 hover:bg-primary-50 px-3 py-2 rounded-md text-sm font-medium border border-primary-600 flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Client Portal
              </Link>
              <Link
                href="/vendors"
                className="text-primary-600 hover:bg-primary-50 px-3 py-2 rounded-md text-sm font-medium border border-primary-600 flex items-center gap-2"
              >
                <Store className="h-4 w-4" />
                Find Vendors
              </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Beta
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            Streamline Your Event Venue Management
          </h2>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            The all-in-one platform for event venue owners to manage bookings, clients, and events with ease.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8 gap-4">
            <Link
              href="/signup"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 md:py-4 md:text-lg md:px-10"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="mt-3 sm:mt-0 w-full flex items-center justify-center px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
            >
              Sign In
            </Link>
          </div>
          <div className="mt-4 text-center">
            <Link
              href="/client-login"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 underline underline-offset-2"
            >
              Are you a booked client? Access your Client Portal →
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-primary-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to manage your venue
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              From client intake to event day, manage every aspect of your event venue business.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowFeatures(prev => !prev)}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-full border-2 border-primary-600 text-primary-600 font-semibold text-sm hover:bg-primary-600 hover:text-white transition-all duration-200"
              >
                {showFeatures ? 'Hide Features ▲' : 'Explore Features ▼'}
              </button>
            </div>
          </div>

          {showFeatures && <div className="mt-10">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-10">
              {/* Feature 1 */}
              <div className="flex flex-col items-center px-6 py-8 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-200">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-50 border border-primary-100 text-primary-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">Event Management</h3>
                <p className="mt-2 text-sm text-gray-500 text-center leading-relaxed">
                  Track all your events, bookings, and client details in one centralized location.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col items-center px-6 py-8 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-200">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-50 border border-primary-100 text-primary-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">Client Portal</h3>
                <p className="mt-2 text-sm text-gray-500 text-center leading-relaxed">
                  Give your clients access to view their bookings, contracts, and event details.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col items-center px-6 py-8 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-200">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-50 border border-primary-100 text-primary-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">Document Management</h3>
                <p className="mt-2 text-sm text-gray-500 text-center leading-relaxed">
                  Store and manage contracts, insurance certificates, and important documents.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="flex flex-col items-center px-6 py-8 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-200">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-50 border border-primary-100 text-primary-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">Payment Tracking</h3>
                <p className="mt-2 text-sm text-gray-500 text-center leading-relaxed">
                  Monitor deposits, payments, and outstanding balances for all your bookings.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="flex flex-col items-center px-6 py-8 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-200">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-50 border border-primary-100 text-primary-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">Automated Reminders</h3>
                <p className="mt-2 text-sm text-gray-500 text-center leading-relaxed">
                  Send automated email and SMS reminders to clients about upcoming events and deadlines.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="flex flex-col items-center px-6 py-8 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-200">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-50 border border-primary-100 text-primary-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">Analytics & Reports</h3>
                <p className="mt-2 text-sm text-gray-500 text-center leading-relaxed">
                  Get insights into your business with comprehensive analytics and reporting.
                </p>
              </div>
            </div>
          </div>}
        </div>
      </div>

      {/* Vendor Directory Banner */}
      <div className="py-16 bg-gradient-to-br from-white to-primary-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 border-2 border-primary-200">
              <svg className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Find Local Vendors & Venues
          </h2>
          <p className="mt-3 text-lg text-gray-600 max-w-xl mx-auto">
            Browse DJs, photographers, decorators, planners, musicians, and more — all searchable by location within your chosen radius. Venues listed too.
          </p>
          <div className="mt-6 flex justify-center">
            <img
              src="/lib/vendor.png"
              alt="Find Local Vendors & Venues"
              className="w-full max-w-lg rounded-2xl shadow-md object-cover"
              style={{ maxHeight: '300px' }}
            />
          </div>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setShowVendors(prev => !prev)}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-full border-2 border-white text-white font-semibold text-sm hover:bg-white hover:text-primary-700 transition-all duration-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {showVendors ? 'Hide Options ▲' : 'Connect To Venues & Vendors ▼'}
            </button>
          </div>
          {showVendors && (
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/vendors"
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-primary-600 hover:bg-primary-700"
              >
                Browse Directory
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-8 py-3 border-2 border-primary-600 text-base font-medium rounded-xl text-primary-600 hover:bg-primary-50"
              >
                List Your Business
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-700">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">Ready to get started?</span>
            <span className="block">Start managing your venue today.</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-primary-200">
            Join hundreds of event venue owners who trust EventSuite to manage their business.
          </p>
          <div className="mt-6 flex justify-center">
            <img
              src="/lib/signup.png"
              alt="Event venue management"
              className="w-full max-w-sm rounded-2xl shadow-lg object-cover"
            />
          </div>
          <Link
            href="/signup"
            className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 sm:w-auto"
          >
            Sign up for free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center space-x-6 mb-4">
            <Link href="/privacy-policy" className="text-gray-400 hover:text-gray-300 text-sm">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="text-gray-400 hover:text-gray-300 text-sm">
              Terms of Service
            </Link>
          </div>
          <p className="text-center text-base text-gray-400">
            &copy; 2026 DoVenue Suite. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
