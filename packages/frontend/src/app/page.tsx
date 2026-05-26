'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Users, Store, Calendar, Zap, BarChart3, Shield, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Home() {
  const { isAuthenticated, loading, user } = useAuth()
  const router = useRouter()

  const taglines = [
    '"Events, vendors, venues — all in one ecosystem."',
    '"Where venues, vendors, and vibes connect."',
    '"Build the vibe. Power the ecosystem."',
    '"EventEcos: Where Every Event Comes Alive."',
    '"Let your event take root."',
    '"Rooted in planning. Flourishing in celebration."',
    '"EventEcos: From Seed to Soirée."',
  ]
  const [taglineIndex, setTaglineIndex] = useState(0)
  const [taglineFade, setTaglineFade] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineFade(false)
      setTimeout(() => {
        setTaglineIndex(i => (i + 1) % taglines.length)
        setTaglineFade(true)
      }, 400)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const role = user.role as string
      if (role === 'vendor')   { router.push('/vendors/dashboard'); return }
      if (role === 'admin')    { router.push('/admin'); return }
      if (role === 'promoter') { router.push('/dashboard/promoter'); return }
      if (role === 'artist')   { router.push('/artist/dashboard'); return }
      router.push('/dashboard')
    }
  }, [isAuthenticated, loading, router, user])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-50 to-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent-200 border-t-accent-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top Banner */}
      <div className="w-full">
        <img src="/lib/EventEcos-Web-Banner.jpg" alt="EventEcos Banner" className="w-full object-cover" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white md:bg-primary-600 border-b border-gray-200 md:border-primary-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center md:justify-between h-16 gap-2">

            {/* Center Nav Links - desktop only */}
            <div className="hidden md:flex items-center gap-2">
              <Link href="/vendors" className="text-white hover:text-primary-100 font-medium text-sm border border-white/40 hover:border-white/70 px-3 py-1.5 rounded-lg transition-colors">
                Find Vendors
              </Link>
              <Link href="/venues" className="text-white hover:text-primary-100 font-medium text-sm border border-white/40 hover:border-white/70 px-3 py-1.5 rounded-lg transition-colors">
                Find Venues
              </Link>
              <Link href="/events" className="text-white hover:text-primary-100 font-medium text-sm border border-white/40 hover:border-white/70 px-3 py-1.5 rounded-lg transition-colors">
                Discover Events
              </Link>
              <Link href="#features" className="text-white hover:text-primary-100 font-medium text-sm border border-white/40 hover:border-white/70 px-3 py-1.5 rounded-lg transition-colors">
                Features
              </Link>
            </div>

            {/* Right CTA */}
            <div className="flex items-center gap-2">
              <Link
                href="/client-login"
                className="text-gray-700 md:text-white font-medium text-sm border border-gray-300 md:border-white/40 hover:border-gray-400 md:hover:border-white/70 px-3 py-1.5 rounded-lg transition-colors"
              >
                Client Portal
              </Link>
              <Link
                href="/login"
                className="text-gray-700 md:text-white font-medium text-sm border border-gray-300 md:border-white/40 hover:border-gray-400 md:hover:border-white/70 px-3 py-1.5 rounded-lg transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="bg-accent-500 hover:bg-accent-600 text-white font-semibold px-5 py-1.5 rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Tagline row */}
      <div className="bg-accent-50 border-b border-accent-100 py-3 text-center">
        <div
          className="inline-flex items-center gap-2 text-accent-700 font-semibold text-sm transition-opacity duration-400"
          style={{ opacity: taglineFade ? 1 : 0 }}
        >
          {taglines[taglineIndex]}
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-accent-50 via-white to-primary-50 pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="flex flex-col justify-center">
              
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Manage Your Event Business <span className="text-accent-500">Effortlessly</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 max-w-lg">
                EventEcos is the all-in-one platform built for venue owners, event planners, and promoters. Streamline bookings, manage clients, and grow your business — all in one place.
              </p>
            </div>

            {/* Right - Logo + Visual */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-sm">
                
                {/* Feature Pills */}
                <div className="space-y-3">
                  <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-accent-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Smart Scheduling</p>
                      <p className="text-gray-600 text-xs">Never double-book again</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 flex items-start gap-3">
                    <Users className="h-5 w-5 text-accent-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Client Management</p>
                      <p className="text-gray-600 text-xs">Keep everyone in sync</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 flex items-start gap-3">
                    <Zap className="h-5 w-5 text-accent-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Promoter / Ticket Sales</p>
                      <p className="text-gray-600 text-xs">Sell tickets & manage events</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 flex items-start gap-3">
                    <BarChart3 className="h-5 w-5 text-accent-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Real-time Analytics</p>
                      <p className="text-gray-600 text-xs">Track revenue & bookings</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA centered below both columns */}
          <div className="flex justify-center mt-12">
            <Link
              href="/signup"
              className="bg-accent-500 hover:bg-accent-600 text-white font-bold px-10 py-4 rounded-lg transition-colors flex items-center gap-2 text-lg shadow-lg hover:shadow-xl"
            >
              Get Started <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need to <span className="text-accent-500">Succeed</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From lead to payment, manage every aspect of your event business with powerful tools designed for you.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl border border-gray-200 hover:border-accent-300 hover:shadow-xl transition-all duration-300 bg-white hover:bg-accent-50">
              <div className="h-12 w-12 bg-accent-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent-200 transition-colors">
                <Calendar className="h-6 w-6 text-accent-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Event Management</h3>
              <p className="text-gray-600">Create and manage all your events in one centralized calendar. Set availability, block dates, and manage your capacity effortlessly.</p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl border border-gray-200 hover:border-accent-300 hover:shadow-xl transition-all duration-300 bg-white hover:bg-accent-50">
              <div className="h-12 w-12 bg-accent-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent-200 transition-colors">
                <Users className="h-6 w-6 text-accent-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Client Portal</h3>
              <p className="text-gray-600">Give clients a dedicated space to view bookings, access documents, communicate with you, and make payments securely online.</p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl border border-gray-200 hover:border-accent-300 hover:shadow-xl transition-all duration-300 bg-white hover:bg-accent-50">
              <div className="h-12 w-12 bg-accent-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent-200 transition-colors">
                <Shield className="h-6 w-6 text-accent-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Document Management</h3>
              <p className="text-gray-600">Store contracts, liability insurance, and important documents securely. Share them with clients and track approvals.</p>
            </div>

            {/* Feature 4 */}
            <div className="group p-8 rounded-2xl border border-gray-200 hover:border-accent-300 hover:shadow-xl transition-all duration-300 bg-white hover:bg-accent-50">
              <div className="h-12 w-12 bg-accent-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent-200 transition-colors">
                <svg className="h-6 w-6 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Processing</h3>
              <p className="text-gray-600">Accept deposits and payments online. Track payment status, send invoices, and automate your billing workflow.</p>
            </div>

            {/* Feature 5 */}
            <div className="group p-8 rounded-2xl border border-gray-200 hover:border-accent-300 hover:shadow-xl transition-all duration-300 bg-white hover:bg-accent-50">
              <div className="h-12 w-12 bg-accent-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent-200 transition-colors">
                <svg className="h-6 w-6 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Automated Reminders</h3>
              <p className="text-gray-600">Keep clients engaged with automated email and SMS reminders about upcoming events, deposits, and deadlines.</p>
            </div>

            {/* Feature 6 */}
            <div className="group p-8 rounded-2xl border border-gray-200 hover:border-accent-300 hover:shadow-xl transition-all duration-300 bg-white hover:bg-accent-50">
              <div className="h-12 w-12 bg-accent-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent-200 transition-colors">
                <BarChart3 className="h-6 w-6 text-accent-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Analytics & Reports</h3>
              <p className="text-gray-600">Get insights into your business with comprehensive dashboards. Track revenue, bookings, and growth trends at a glance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-accent-50 to-primary-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">Get started in minutes, manage like a pro</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { number: '1', title: 'Sign Up', desc: 'Create your free account in seconds' },
              { number: '2', title: 'Set Up Your Role', desc: 'Choose your role — venue owner, promoter, vendor, or artist — and customize your profile' },
              { number: '3', title: 'Share Portal', desc: 'Invite clients to your portal' },
              { number: '4', title: 'Grow Business', desc: 'Accept bookings and payments' },
            ].map((step, idx) => (
              <div key={idx} className="relative">
                <div className="text-center">
                  <div className="h-16 w-16 bg-accent-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.desc}</p>
                </div>
                {idx < 3 && (
                  <div className="hidden md:block absolute top-8 left-full w-8 h-0.5 bg-accent-200 -ml-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA after How It Works */}
      <div className="bg-white py-8 px-4 text-center border-b border-gray-100">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-bold px-10 py-4 rounded-lg transition-colors text-lg shadow-lg"
        >
          Get Started <ArrowRight className="h-5 w-5" />
        </Link>
      </div>

      {/* Directory & Events CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3">Explore the Ecosystem</h2>
            <p className="text-gray-400 text-lg">Discover venues, vendors, and events all in one place.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Venues */}
            <div className="bg-gray-800 rounded-2xl p-8 flex flex-col items-start hover:bg-gray-700 transition-colors">
              <div className="h-12 w-12 bg-accent-500/20 rounded-xl flex items-center justify-center mb-5">
                <Store className="h-6 w-6 text-accent-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Browse Venues</h3>
              <p className="text-gray-400 mb-6 flex-1">
                Find the perfect space for your next event — ballrooms, rooftops, outdoor grounds, and more.
              </p>
              <Link
                href="/venues"
                className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-bold px-5 py-2.5 rounded-lg transition-colors"
              >
                Browse Venues <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Vendors */}
            <div className="bg-gray-800 rounded-2xl p-8 flex flex-col items-start hover:bg-gray-700 transition-colors">
              <div className="h-12 w-12 bg-accent-500/20 rounded-xl flex items-center justify-center mb-5">
                <Users className="h-6 w-6 text-accent-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Discover Vendors</h3>
              <p className="text-gray-400 mb-6 flex-1">
                Connect with DJs, photographers, decorators, caterers, and more — all searchable by location.
              </p>
              <Link
                href="/vendors"
                className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-bold px-5 py-2.5 rounded-lg transition-colors"
              >
                Discover Vendors <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Events */}
            <div className="bg-gray-800 rounded-2xl p-8 flex flex-col items-start hover:bg-gray-700 transition-colors">
              <div className="h-12 w-12 bg-accent-500/20 rounded-xl flex items-center justify-center mb-5">
                <Calendar className="h-6 w-6 text-accent-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Explore Events</h3>
              <p className="text-gray-400 mb-6 flex-1">
                Discover concerts, festivals, workshops, and experiences happening near you.
              </p>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-bold px-5 py-2.5 rounded-lg transition-colors"
              >
                Explore Events <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-600 to-secondary-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl lg:text-6xl font-bold text-white mb-6">
            Ready to Transform Your Event Business?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of event professionals managing their businesses with EventEcos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-white hover:bg-accent-50 text-accent-600 font-bold px-8 py-4 rounded-lg transition-colors text-lg shadow-lg"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="border-2 border-white text-white hover:bg-white/10 font-bold px-8 py-4 rounded-lg transition-colors text-lg"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <Link href="/">
                <div className="inline-block bg-white rounded-xl p-2">
                  <img src="/lib/EventEcos-Logo.jpg" alt="EventEcos" style={{ height: '90px', width: 'auto' }} />
                </div>
              </Link>
              <p className="text-gray-400 text-sm">The complete event management platform.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
                <li><Link href="/client-login" className="hover:text-white">Client Portal</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="/privacy-policy" className="hover:text-white">Privacy</Link></li>
                <li><Link href="/terms-of-service" className="hover:text-white">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <p className="text-center text-gray-400 text-sm">
              &copy; 2026 EventEcos. All rights reserved. Powering the Event Ecosystem.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
