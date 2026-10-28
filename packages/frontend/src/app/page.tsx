'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Users, Store, Calendar, Zap, BarChart3, Shield, ArrowRight, MapPin, Ticket, Sparkles, Lock, Heart, Menu, X, ChevronRight, ChevronDown, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import EnterpriseContactModal from '@/components/EnterpriseContactModal'
import BookDemoModal from '@/components/BookDemoModal'
import HomePhoto from '@/components/HomePhoto'
import FollowUs from '@/components/SocialLinks'

export default function Home() {
  const { isAuthenticated, loading, user } = useAuth()
  const router = useRouter()
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false)
  const [showDemoModal, setShowDemoModal] = useState(false)
  // Phone layout: the hamburger menu, and the "Get started for your business" panel.
  const [menuOpen, setMenuOpen] = useState(false)
  const [businessOpen, setBusinessOpen] = useState(false)

  const [businessMenu, setBusinessMenu] = useState(false)

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      // A "Back to main site" link inside a role portal (e.g. sales portal)
      // adds `?portal=exit` so a still-authenticated user (even via a
      // silently-refreshed session they don't realize is active) can
      // actually reach the homepage instead of being bounced straight back
      // into their portal by this same redirect.
      if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('portal') === 'exit') {
        return
      }
      const role = user.role as string
      if (role === 'vendor')    { router.push('/vendors/dashboard'); return }
      if (role === 'admin')     { router.push('/admin'); return }
      if (role === 'promoter')  { router.push('/dashboard/promoter'); return }
      if (role === 'artist')    { router.push('/artist/dashboard'); return }
      if (role === 'affiliate') { router.push('/sales-portal/dashboard'); return }
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
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl 2xl:max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-28 md:h-[7.5rem] gap-2">

            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0">
              <img src="/lib/EventEcos-Logo.jpg" alt="EventEcos" className="h-24 md:h-[70px] lg:h-[105px] w-auto object-contain rounded" />
            </Link>

            {/* Center links - desktop */}
            <div className="hidden md:flex items-center gap-1 lg:gap-3 text-[15px] font-medium text-gray-800">
              <Link href="/events" className="rounded-lg px-3 py-2 hover:bg-gray-100">Events</Link>
              <Link href="/venues" className="rounded-lg px-3 py-2 hover:bg-gray-100">Venues</Link>
              <Link href="/vendors" className="rounded-lg px-3 py-2 hover:bg-gray-100">Vendors</Link>
              <div
                className="relative"
                onMouseEnter={() => setBusinessMenu(true)}
                onMouseLeave={() => setBusinessMenu(false)}
                onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setBusinessMenu(false) }}
              >
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={businessMenu}
                  onClick={() => setBusinessMenu(open => !open)}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 hover:bg-gray-100"
                >
                  For Business <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>
                {businessMenu && (
                  <div role="menu" className="absolute left-0 top-full z-50 w-64 pt-1">
                    <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                      <a role="menuitem" href="#features" onClick={() => setBusinessMenu(false)} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-gray-50">Everything you need to succeed</a>
                      <Link role="menuitem" href="/demo" className="block rounded-lg px-3 py-2.5 text-sm hover:bg-gray-50">Live demo</Link>
                      <button role="menuitem" type="button" onClick={() => { setBusinessMenu(false); setShowDemoModal(true) }} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-gray-50">Book a demo</button>
                      <Link role="menuitem" href="https://eventecos.com/signup" className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-accent-700 hover:bg-accent-50">Start your free trial</Link>
                    </div>
                  </div>
                )}
              </div>
              <Link href="#pricing" className="rounded-lg px-3 py-2 hover:bg-gray-100">Pricing</Link>
            </div>

            {/* Right actions - desktop; phones use the Client Portal / Log in row and the menu */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3">
              <Link
                href="/client-login"
                className="rounded-lg border border-primary-500 px-4 py-2 text-sm font-semibold text-primary-600 transition-colors hover:bg-primary-50"
              >
                Client Portal
              </Link>
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50">
                Log in
              </Link>
              <Link
                href="https://eventecos.com/signup"
                className="rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-600 whitespace-nowrap"
              >
                Get Started
              </Link>
            </div>

            {/* Phone menu button */}
            <button
              type="button"
              onClick={() => setMenuOpen(open => !open)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="md:hidden rounded-lg p-2 text-gray-800 hover:bg-gray-100"
            >
              {menuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div id="mobile-menu" className="md:hidden border-t border-gray-200 bg-white px-4 pb-4 pt-2 shadow-lg">
            <ul className="divide-y divide-gray-100 text-base font-medium text-gray-800">
              {[
                { href: '/events', label: 'Events' },
                { href: '/venues', label: 'Venues' },
                { href: '/vendors', label: 'Vendors' },
                { href: '#features', label: 'Everything you need to succeed' },
                { href: '#pricing', label: 'Pricing' },
                { href: '/demo', label: 'Live demo' },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href} onClick={() => setMenuOpen(false)} className="flex items-center justify-between py-3.5">
                    {item.label}
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* Phone home: sign-in row, headline, browse cards and the business panel */}
      <section className="md:hidden bg-white px-4 pb-8 pt-4">
        <div className="mx-auto max-w-md">
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/client-login"
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-accent-700 text-base font-semibold text-white transition-colors hover:bg-accent-800"
            >
              <User className="h-5 w-5" />
              Client Portal
            </Link>
            <Link
              href="/login"
              className="flex h-12 items-center justify-center rounded-xl border border-accent-600 bg-white text-base font-semibold text-accent-700 transition-colors hover:bg-accent-50"
            >
              Log in
            </Link>
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-accent-700">Go out. Get together.</p>
          <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-gray-900">Great experiences start here.</h1>
          <p className="mt-3 text-lg text-gray-600">Discover events, find your perfect space, and bring your plans to life—all in one connected event ecosystem.</p>

          <ul className="mt-6 space-y-3">
            {[
              { href: '/events', title: 'Events', sub: 'Find your next outing', Icon: Ticket },
              { href: '/venues', title: 'Venues', sub: 'Find your perfect setting', Icon: MapPin },
              { href: '/vendors', title: 'Vendors', sub: 'Find your event dream team', Icon: Store },
            ].map(({ href, title, sub, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-accent-300 hover:bg-accent-50/40"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent-100">
                    <Icon className="h-7 w-7 text-accent-700" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-bold text-gray-900">{title}</span>
                    <span className="block text-gray-500">{sub}</span>
                  </span>
                  <ChevronRight className="h-6 w-6 shrink-0 text-gray-700" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-3xl bg-accent-50 p-5">
            <h2 className="text-2xl font-bold leading-tight text-gray-900">
              Your business.<br />More possibilities.
            </h2>
            <p className="mt-2 text-gray-600">Manage bookings, clients, and payments with EventEcos.</p>

            <button
              type="button"
              onClick={() => setBusinessOpen(open => !open)}
              aria-expanded={businessOpen}
              aria-controls="business-panel"
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-700 text-base font-semibold text-white transition-colors hover:bg-accent-800"
            >
              Get started for your business
              {businessOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>

            {businessOpen && (
              <div id="business-panel" className="mt-3 space-y-3">
                <Link
                  href="https://eventecos.com/signup"
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-accent-500 text-base font-bold text-white transition-colors hover:bg-accent-600"
                >
                  Sign up
                </Link>
                <button
                  type="button"
                  onClick={() => setShowDemoModal(true)}
                  className="flex h-12 w-full items-center justify-center rounded-xl border border-accent-600 bg-white text-base font-semibold text-accent-700 transition-colors hover:bg-accent-50"
                >
                  Schedule a demo
                </button>
                <p className="text-center text-sm text-gray-500">30-day free trial. No credit card required.</p>
                <div className="grid grid-cols-1 gap-2 border-t border-accent-100 pt-3">
                  <a href="#features" className="flex items-center justify-between rounded-lg px-1 py-2 text-base font-medium text-gray-800">
                    Everything you need to succeed
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </a>
                </div>
              </div>
            )}

            <div className="mt-3 text-center">
              <a href="#pricing" className="text-base font-medium text-accent-700 underline underline-offset-4">View pricing</a>
            </div>
          </div>
        </div>
      </section>

      {/* Desktop home: hero with photos, browse cards, business strip */}
      <div className="hidden md:block">
        <section className="bg-accent-50/70">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-14 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:py-16">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary-600">Go out. Get together.</p>
              <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight text-gray-900 lg:text-6xl xl:text-7xl">
                Great experiences <span className="text-accent-500">start here.</span>
              </h1>
              <p className="mt-6 max-w-xl text-xl leading-relaxed text-gray-600">
                Discover events, find your perfect space, and bring your plans to life—all in one connected event ecosystem.
              </p>
            </div>

            {/* Photo collage */}
            <div className="relative mx-auto h-[380px] w-full max-w-[640px] lg:h-[400px]">
              <HomePhoto
                file="hero-main.jpg"
                alt="Friends laughing together at an evening event"
                Icon={Ticket}
                className="absolute left-0 top-2 h-[92%] w-[62%] -rotate-3 rounded-[2rem] shadow-2xl"
              />
              <HomePhoto
                file="hero-venue.jpg"
                alt="A decorated event venue with string lights"
                Icon={MapPin}
                className="absolute right-0 top-0 h-[52%] w-[40%] rotate-2 rounded-3xl shadow-xl ring-4 ring-white"
              />
              <HomePhoto
                file="hero-chef.jpg"
                alt="A chef plating food at an event"
                Icon={Store}
                className="absolute bottom-0 right-2 h-[44%] w-[40%] rounded-3xl shadow-xl ring-4 ring-white"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
          <ul className="grid grid-cols-3 gap-6">
            {[
              { href: '/events', title: 'Events', sub: 'Find your next outing', Icon: Ticket, file: 'card-events.jpg', tint: 'bg-primary-100 text-primary-600' },
              { href: '/venues', title: 'Venues', sub: 'Find your perfect setting', Icon: MapPin, file: 'card-venues.jpg', tint: 'bg-accent-100 text-accent-700' },
              { href: '/vendors', title: 'Vendors', sub: 'Find your event dream team', Icon: Users, file: 'card-vendors.jpg', tint: 'bg-purple-100 text-purple-600' },
            ].map(({ href, title, sub, Icon, file, tint }) => (
              <li key={href}>
                <Link href={href} className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md transition-shadow hover:shadow-xl">
                  <HomePhoto file={file} alt="" Icon={Icon} className="h-36 lg:h-44" imgClassName="transition-transform duration-500 group-hover:scale-105" />
                  <div className="flex items-center gap-4 p-4 lg:p-5">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tint}`}>
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-bold text-gray-900">{title}</span>
                      <span className="block text-sm text-gray-500">{sub}</span>
                    </span>
                    <ArrowRight className="h-5 w-5 shrink-0 text-gray-700 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-12 lg:px-8">
          <div className="flex flex-col items-center gap-6 rounded-3xl bg-accent-50 px-8 py-7 lg:flex-row lg:justify-between">
            <div className="flex items-center gap-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-100">
                <BarChart3 className="h-7 w-7 text-accent-600" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">For event professionals</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900 lg:text-3xl">Book more. Manage less. Grow together.</h2>
                <p className="mt-1 text-gray-600">Bookings, clients, contracts, and payments—all in one place.</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-center gap-3">
              <Link
                href="https://eventecos.com/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-6 py-3.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-accent-700"
              >
                Get Started for Your Business <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="https://demo.eventecos.com/demo"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border-2 border-accent-600 bg-white px-6 py-3 text-base font-bold text-accent-700 transition-colors hover:bg-accent-50"
              >
                See Live Demo
              </a>
              <button
                type="button"
                onClick={() => setShowDemoModal(true)}
                className="px-3 py-3 text-base font-semibold text-primary-600 underline underline-offset-4 hover:text-primary-700"
              >
                Book a Demo
              </button>
            </div>
          </div>
          <p className="mt-3 text-center text-sm text-gray-500">30-day free trial. No credit card required.</p>
        </section>
      </div>

      {/* Trust Signals */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <div className="h-10 w-10 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                <Lock className="h-5 w-5 text-accent-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">Payments secured by Stripe</p>
            </div>
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <div className="h-10 w-10 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-accent-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">Your contracts & documents stay private</p>
            </div>
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <div className="h-10 w-10 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                <Heart className="h-5 w-5 text-accent-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">No long-term contract, cancel anytime</p>
            </div>
          </div>

          {/* Founder credibility */}
          <Link
            href="/about"
            className="group flex flex-col sm:flex-row items-center gap-6 bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 hover:border-accent-300 hover:shadow-lg transition-all"
          >
            <img
              src="/lib/nixon-family.jpg"
              alt="Larry and Dee Nixon, founders of EventEcos"
              className="h-20 w-20 rounded-full object-cover border-2 border-accent-200 flex-shrink-0"
            />
            <div className="text-center sm:text-left">
              <p className="text-gray-900 font-semibold mb-1">Built by people who've actually run events</p>
              <p className="text-gray-600 text-sm">
                Larry &amp; Dee Nixon have spent 30+ years planning, hosting, and coordinating events — EventEcos is built from that firsthand experience, not a spreadsheet of feature requests.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-accent-500 flex-shrink-0 ml-auto hidden sm:block group-hover:translate-x-1 transition-transform" />
          </Link>
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
              <h3 className="text-xl font-bold text-gray-900 mb-2">Capture the inquiry, send the proposal, take the deposit</h3>
              <p className="text-gray-600">Create and manage all your events in one centralized calendar. Set availability, block dates, and manage your capacity.</p>
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
              <h3 className="text-xl font-bold text-gray-900 mb-2">Collect the deposit, get paid on time</h3>
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

      {/* Demo CTA Banner */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-600 to-secondary-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            See EventEcos in Action
          </h2>
          <p className="text-lg text-primary-100 mb-8">
            Explore a fully loaded demo environment — real bookings, invoices, ticket sales, and more.
          </p>
          <a
            href="https://demo.eventecos.com/demo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white hover:bg-accent-50 text-accent-600 font-bold px-10 py-4 rounded-lg transition-colors text-lg shadow-lg"
          >
            Launch Live Demo <ArrowRight className="h-5 w-5" />
          </a>
          <button
            type="button"
            onClick={() => setShowDemoModal(true)}
            className="ml-0 sm:ml-4 mt-4 sm:mt-0 inline-flex items-center gap-2 border-2 border-white text-white hover:bg-white/10 font-bold px-10 py-4 rounded-lg transition-colors text-lg"
          >
            Book a Demo
          </button>
        </div>
      </section>

      {/* CTA after How It Works */}
      <div className="bg-white py-8 px-4 text-center border-b border-gray-100">
        <Link
          href="https://eventecos.com/signup"
          className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-bold px-10 py-4 rounded-lg transition-colors text-lg shadow-lg"
        >
          Get Started <ArrowRight className="h-5 w-5" />
        </Link>
      </div>

      {/* Testimonials Section — TODO(D3.2): populate TESTIMONIALS below with real,
          named customer quotes (first name, last name, business name, role, photo,
          specific outcome) before this section can go live. Do not fabricate
          quotes — ask the first 5-10 paying customers. Section renders nothing
          until TESTIMONIALS has entries. */}
      {(() => {
        const TESTIMONIALS: Array<{ quote: string; name: string; business: string; role: string }> = []
        if (TESTIMONIALS.length === 0) return null
        return (
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {TESTIMONIALS.map((t) => (
                  <div key={t.name} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <p className="text-gray-700 mb-4">&ldquo;{t.quote}&rdquo;</p>
                    <p className="font-bold text-gray-900">{t.name}</p>
                    <p className="text-gray-500 text-sm">{t.role}, {t.business}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      })()}

      {/* Directory & Events CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3">Explore the Ecosystem</h2>
            <p className="text-gray-400 text-lg">Discover venues, vendors, and events all in one place.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                {['1 venue', 'No team members', '3% platform fee on direct payments', 'Ticket sales (customer pays 3% + card processing)', 'Basic listing', 'Invoices, estimates & contracts (Stripe required)'].map(f => (
                  <li key={f} className="flex items-start gap-2"><span className="text-accent-500 mt-0.5">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="https://eventecos.com/signup" className="block text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2.5 rounded-lg transition-colors text-sm">
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
              <p className="text-gray-500 text-xs mb-1">$149/mo — less than one booked event&apos;s worth of admin time.</p>
              <p className="text-gray-500 text-sm mb-6">For growing event businesses</p>
              <ul className="space-y-2.5 text-sm text-gray-600 mb-8 flex-1">
                {['3 venues', '3 team members', '1.5% platform fee on direct payments', 'Ticket sales (customer pays 3% + card processing)', 'Invoices, estimates & contracts + payment tools', 'Vendor management, door list & SMS', 'Priority support'].map(f => (
                  <li key={f} className="flex items-start gap-2"><span className="text-accent-500 mt-0.5">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="https://eventecos.com/signup" className="block text-center bg-accent-500 hover:bg-accent-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
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
                {['5 venues', '5 team members', '1% platform fee on direct payments', 'Ticket sales (customer pays 3% + card processing)', 'All Pro features', 'Multi-venue management', 'Custom branding', 'Dedicated account manager'].map(f => (
                  <li key={f} className="flex items-start gap-2"><span className="text-accent-500 mt-0.5">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="https://eventecos.com/signup" className="block text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2.5 rounded-lg transition-colors text-sm">
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

          <p className="text-center text-gray-500 text-sm mt-8 max-w-3xl mx-auto">
            Card processing is 3.1% + $0.30, paid by the payer. Verified non-profits pay a 1.5% platform fee instead of 3% on ticket and VIP sales.
          </p>
          <p className="text-center text-gray-500 text-sm mt-3">
            All plans include a 30-day free trial. No credit card required to start.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600">Straight answers on fees, data, and support.</p>
          </div>
          <div className="space-y-8">
            {[
              {
                q: 'What does it actually cost to sell a ticket?',
                a: 'On the Free plan, you pay a 3% platform fee on direct payments (1.5% on Pro, 1% on Premium). For ticket sales, the customer separately pays a 3% ticket fee (1.5% for verified non-profits) plus payment processing of 3.1% + $0.30 for cards (6% + $0.30 if they choose pay later with Afterpay, Klarna or Affirm, where you offer it). Example on Free: a $100 ticket costs the buyer about $106.80 by card ($100 + $3.20 ticket fee + $3.60 processing, rounded), and you receive the full $100.',
              },
              {
                q: 'Where are my contracts and documents stored, and who can access them?',
                a: 'Contracts, liability insurance, and other documents you upload are stored in your EventEcos account and are only visible to you and the specific clients you share them with \u2014 they are not public or searchable.',
              },
              {
                q: 'Can I export my data if I leave?',
                a: 'Yes. There is no self-serve export button today \u2014 contact support and we will get you a full export of your bookings, clients, and documents.',
              },
              {
                q: 'What happens after my 30-day free trial?',
                a: 'You choose a paid plan (Pro, Premium, or Enterprise) or continue on the Free plan. Nothing is charged automatically without you selecting a plan.',
              },
              {
                q: 'Do I need a Stripe account?',
                a: 'Yes, Stripe is required to accept online payments, deposits, and ticket sales directly through EventEcos.',
              },
              {
                q: 'What support do I get?',
                a: 'All plans include standard support. Pro adds priority support, and Premium and Enterprise include a dedicated account manager.',
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Yes. There is no long-term contract \u2014 you can change or cancel your plan at any time.',
              },
              {
                q: 'What if I manage more than one venue?',
                a: 'Pro supports up to 3 venues and Premium up to 5, each with multi-venue management tools. Need more? Enterprise offers unlimited venues with custom pricing.',
              },
            ].map((item) => (
              <div key={item.q}>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.q}</h3>
                <p className="text-gray-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                { q: 'What does it actually cost to sell a ticket?', a: 'On the Free plan, you pay a 3% platform fee on direct payments (1.5% on Pro, 1% on Premium). For ticket sales, the customer separately pays a 3% ticket fee (1.5% for verified non-profits) plus payment processing (3.1% + $0.30 for cards).' },
                { q: 'Where are my contracts and documents stored, and who can access them?', a: 'Contracts and documents are stored in your EventEcos account and are only visible to you and the clients you share them with.' },
                { q: 'Can I export my data if I leave?', a: 'Yes \u2014 contact support for a full export of your bookings, clients, and documents.' },
                { q: 'What happens after my 30-day free trial?', a: 'You choose a paid plan or continue on the Free plan. Nothing is charged automatically.' },
                { q: 'Do I need a Stripe account?', a: 'Yes, Stripe is required to accept online payments, deposits, and ticket sales.' },
                { q: 'What support do I get?', a: 'All plans include standard support; Pro adds priority support; Premium and Enterprise include a dedicated account manager.' },
                { q: 'Can I cancel anytime?', a: 'Yes, there is no long-term contract.' },
                { q: 'What if I manage more than one venue?', a: 'Pro supports up to 3 venues, Premium up to 5, and Enterprise offers unlimited venues.' },
              ].map((i) => ({
                '@type': 'Question',
                name: i.q,
                acceptedAnswer: { '@type': 'Answer', text: i.a },
              })),
            }),
          }}
        />
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-600 to-secondary-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl lg:text-6xl font-bold text-white mb-6">
            Ready to Transform Your Event Business?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            The all-in-one platform for venue owners, event planners, and promoters.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="https://eventecos.com/signup"
              className="bg-white hover:bg-accent-50 text-accent-600 font-bold px-8 py-4 rounded-lg transition-colors text-lg shadow-lg"
            >
              Get Started
            </Link>
            <a
              href="https://demo.eventecos.com/demo"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-white text-white hover:bg-white/10 font-bold px-8 py-4 rounded-lg transition-colors text-lg"
            >
              See Live Demo
            </a>
            <button
              type="button"
              onClick={() => setShowDemoModal(true)}
              className="bg-white/20 hover:bg-white/30 text-white font-bold px-8 py-4 rounded-lg transition-colors text-lg"
            >
              Book a Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/">
                <div className="inline-block bg-white rounded-xl p-2">
                  <img src="/lib/EventEcos-Logo.jpg" alt="EventEcos" style={{ height: '90px', width: 'auto' }} />
                </div>
              </Link>
              <p className="text-gray-400 text-sm mt-4">The complete event management platform.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
                <li><Link href="/login" className="hover:text-white">Venue Owners Login</Link></li>
                <li><Link href="/client-login" className="hover:text-white">Client Portal</Link></li>
                <li><Link href="/vendors/login" className="hover:text-white">Vendor Portal</Link></li>
                <li><Link href="/sales-portal/login" className="hover:text-white">Sales Portal</Link></li>
              </ul>
            </div>
            <FollowUs />
            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/privacy-policy" className="hover:text-white">Privacy</Link></li>
                <li><Link href="/terms-of-service" className="hover:text-white">Terms</Link></li>
                <li><Link href="/vs/tripleseat" className="hover:text-white">EventEcos vs Tripleseat</Link></li>
                <li><Link href="/vs/perfect-venue" className="hover:text-white">EventEcos vs Perfect Venue</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <p className="text-center text-gray-400 text-sm">
              &copy; 2026 EventEcos, a DoVenue Suites product. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <EnterpriseContactModal isOpen={showEnterpriseModal} onClose={() => setShowEnterpriseModal(false)} />
      <BookDemoModal isOpen={showDemoModal} onClose={() => setShowDemoModal(false)} />
    </div>
  )
}
