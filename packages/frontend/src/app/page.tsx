'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Users, Store, Calendar, Zap, BarChart3, Shield, ArrowRight, MapPin, Ticket, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import EnterpriseContactModal from '@/components/EnterpriseContactModal'

export default function Home() {
  const { isAuthenticated, loading, user } = useAuth()
  const router = useRouter()
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false)

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
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white md:bg-primary-600 border-b border-gray-200 md:border-primary-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">

            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0">
              <img src="/lib/EventEcos-Logo.jpg" alt="EventEcos" className="h-10 w-auto object-contain rounded" />
            </Link>

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
              <Link
                href="/demo"
                className="flex items-center gap-1.5 text-sm font-bold bg-white/20 hover:bg-white/30 text-white border border-white/50 hover:border-white/80 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Live Demo
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

      {/* Browse Bar - mobile only */}
      <div className="md:hidden bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-1 py-2 overflow-x-auto scrollbar-hide">
            <span className="text-gray-500 font-medium text-sm mr-2 shrink-0">Browse:</span>
            <Link
              href="/vendors"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-accent-600 hover:bg-accent-50 px-4 py-2 rounded-full border border-gray-200 hover:border-accent-300 transition-colors shrink-0"
            >
              <Store className="h-4 w-4" />
              Vendors
            </Link>
            <Link
              href="/venues"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-accent-600 hover:bg-accent-50 px-4 py-2 rounded-full border border-gray-200 hover:border-accent-300 transition-colors shrink-0"
            >
              <MapPin className="h-4 w-4" />
              Venues
            </Link>
            <Link
              href="/events"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-accent-600 hover:bg-accent-50 px-4 py-2 rounded-full border border-gray-200 hover:border-accent-300 transition-colors shrink-0"
            >
              <Ticket className="h-4 w-4" />
              Events
            </Link>
          </div>
        </div>
      </div>

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

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Simple, Transparent <span className="text-accent-500">Pricing</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start free. Upgrade as you grow. No hidden fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {/* Free */}
            <div className="rounded-2xl border border-gray-200 p-7 flex flex-col">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Free</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-500 mb-1">/mo</span>
              </div>
              <p className="text-gray-500 text-sm mb-6">Get started at no cost</p>
              <ul className="space-y-2.5 text-sm text-gray-600 mb-8 flex-1">
                {['1 venue', 'No team members', '3% platform fee on direct payments', 'Ticket sales (customer pays 3% + Stripe)', 'Basic listing', 'Invoices, estimates & contracts (Stripe required)'].map(f => (
                  <li key={f} className="flex items-start gap-2"><span className="text-accent-500 mt-0.5">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/signup" className="block text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2.5 rounded-lg transition-colors text-sm">
                Get Started
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border-2 border-accent-500 p-7 flex flex-col relative shadow-lg">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-500 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
              <p className="text-sm font-semibold text-accent-600 uppercase tracking-wide mb-2">Pro</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold text-gray-900">$149</span>
                <span className="text-gray-500 mb-1">/mo</span>
              </div>
              <p className="text-gray-500 text-sm mb-6">For growing event businesses</p>
              <ul className="space-y-2.5 text-sm text-gray-600 mb-8 flex-1">
                {['3 venues', '3 team members', '1.5% platform fee on direct payments', 'Ticket sales (customer pays 3% + Stripe)', 'Invoices, estimates & contracts + payment tools', 'Vendor management, door list & SMS', 'Priority support'].map(f => (
                  <li key={f} className="flex items-start gap-2"><span className="text-accent-500 mt-0.5">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/signup" className="block text-center bg-accent-500 hover:bg-accent-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
                Start Pro
              </Link>
            </div>

            {/* Premium */}
            <div className="rounded-2xl border border-gray-200 p-7 flex flex-col">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Premium</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold text-gray-900">$299</span>
                <span className="text-gray-500 mb-1">/mo</span>
              </div>
              <p className="text-gray-500 text-sm mb-6">For high-volume operators</p>
              <ul className="space-y-2.5 text-sm text-gray-600 mb-8 flex-1">
                {['5 venues', '5 team members', '1% platform fee on direct payments', 'Ticket sales (customer pays 3% + Stripe)', 'All Pro features', 'Multi-venue management', 'Custom branding', 'Dedicated account manager'].map(f => (
                  <li key={f} className="flex items-start gap-2"><span className="text-accent-500 mt-0.5">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/signup" className="block text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2.5 rounded-lg transition-colors text-sm">
                Start Premium
              </Link>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-7 flex flex-col">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Enterprise</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold text-gray-900">Custom</span>
              </div>
              <p className="text-gray-500 text-sm mb-6">Tailored for large operations</p>
              <ul className="space-y-2.5 text-sm text-gray-600 mb-8 flex-1">
                {['Unlimited venues & team members', 'Custom platform fee rates', 'Advanced reporting & analytics', 'Dedicated onboarding & support', 'Custom integrations', 'SLA guarantee'].map(f => (
                  <li key={f} className="flex items-start gap-2"><span className="text-accent-500 mt-0.5">✓</span>{f}</li>
                ))}
              </ul>
              <button onClick={() => setShowEnterpriseModal(true)} className="block w-full text-center border border-gray-300 hover:border-gray-400 hover:bg-gray-100 text-gray-800 font-semibold py-2.5 rounded-lg transition-colors text-sm">
                Contact Sales
              </button>
            </div>
          </div>

          <p className="text-center text-gray-500 text-sm mt-8">
            All plans include a 30-day free trial. No credit card required to start.
          </p>
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

      <EnterpriseContactModal isOpen={showEnterpriseModal} onClose={() => setShowEnterpriseModal(false)} />
    </div>
  )
}
