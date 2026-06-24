'use client'

/**
 * /demo — EventEcos Feature Map & Live Demo Showcase
 *
 * A fully public page (no auth required) that walks visitors through
 * every feature of the platform. Designed to be a polished proof-of-concept
 * before someone signs up — easy enough for anyone to understand, detailed
 * enough for a decision-maker to evaluate.
 */

import Link from 'next/link'
import {
  ArrowRight,
  LayoutDashboard,
  ClipboardList,
  CalendarCheck2,
  FileText,
  Receipt,
  MessageSquare,
  Store,
  Users,
  ListChecks,
  Shield,
  DollarSign,
  CreditCard,
  Music,
  Megaphone,
  Building2,
  CheckCircle2,
  ChevronRight,
  Play,
  Sparkles,
  Package,
  ExternalLink,
} from 'lucide-react'
import DemoTour from '@/components/DemoTour'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeatureCard {
  icon: React.ReactNode
  color: string
  title: string
  description: string
  bullets: string[]
  href?: string
  hrefLabel?: string
  badge?: string
}

// ─── Feature Definitions ─────────────────────────────────────────────────────

const OWNER_FEATURES: FeatureCard[] = [
  {
    icon: <LayoutDashboard className="h-6 w-6" />,
    color: 'text-blue-600 bg-blue-50',
    title: 'Dashboard',
    description: 'Your business at a glance — updated in real time, every time.',
    bullets: [
      'Unpaid invoices count & total amount owed',
      'Revenue collected vs. pending',
      'Upcoming events in the next 7 days',
      'Recent client submissions',
      'Quick links to every section',
    ],
    href: '/dashboard',
    hrefLabel: 'Open Dashboard',
  },
  {
    icon: <ClipboardList className="h-6 w-6" />,
    color: 'text-purple-600 bg-purple-50',
    title: 'Client Intake Form',
    description: 'One link. Client fills it out. Event is created. They get an SMS. That\'s it.',
    bullets: [
      'Unique link per account — share it anywhere',
      'Collects name, date, guest count, and event details',
      'Auto-creates an event the moment it\'s submitted',
      'Client instantly receives an SMS with their portal link',
      'No manual data entry for you',
    ],
    href: '/dashboard/intake',
    hrefLabel: 'View Intake Form',
    badge: 'Step 1',
  },
  {
    icon: <CalendarCheck2 className="h-6 w-6" />,
    color: 'text-emerald-600 bg-emerald-50',
    title: 'Events',
    description: 'Every client becomes an event. Every event follows the same 5-step flow.',
    bullets: [
      '5-step pipeline: Intake → Estimate → Contract → Invoice → Booked',
      'Visual progress bar on every event card',
      'All documents for an event live in one place',
      'Filter by status, venue, or date range',
      'Click any event to take the next action',
    ],
    href: '/dashboard/events',
    hrefLabel: 'View Events',
    badge: 'Step 2',
  },
  {
    icon: <FileText className="h-6 w-6" />,
    color: 'text-amber-600 bg-amber-50',
    title: 'Estimates',
    description: 'Get client buy-in before sending an invoice. Approval converts automatically.',
    bullets: [
      'Build an itemized estimate from your service catalog',
      'Client receives a link to review and approve',
      'One-tap approval from their phone — no login needed',
      'Approved estimates auto-populate the invoice',
      'Declined estimates can be revised and resent',
    ],
    href: '/dashboard/estimates',
    hrefLabel: 'View Estimates',
    badge: 'Step 3',
  },
  {
    icon: <FileText className="h-6 w-6" />,
    color: 'text-rose-600 bg-rose-50',
    title: 'Contracts',
    description: 'Upload, assign, send. Client e-signs from their phone. Done.',
    bullets: [
      'Upload any PDF contract',
      'Assign to an event and send with one click',
      'Client e-signs directly — no printer, no download',
      'You\'re notified instantly when signed',
      'Signed documents are archived with the event',
    ],
    href: '/dashboard/contracts',
    hrefLabel: 'View Contracts',
    badge: 'Step 4',
  },
  {
    icon: <Receipt className="h-6 w-6" />,
    color: 'text-green-600 bg-green-50',
    title: 'Invoices',
    description: 'Create, send, get paid. Stripe handles everything — funds go straight to you.',
    bullets: [
      'Build invoices from your service item catalog',
      'Client pays via a secure Stripe-powered link',
      'Supports deposits, partial payments, and balances',
      'Funds deposit directly into your connected bank account',
      'Payment status tracked automatically',
    ],
    href: '/dashboard/invoices',
    hrefLabel: 'View Invoices',
    badge: 'Step 5',
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    color: 'text-teal-600 bg-teal-50',
    title: 'Messages',
    description: 'In-app messaging with clients — one thread per event, no email chains.',
    bullets: [
      'Each event has its own private message thread',
      'Clients message you from their portal',
      'Unread count badge on the sidebar',
      'Full message history archived with the event',
      'No app download required for clients',
    ],
    href: '/dashboard/messages',
    hrefLabel: 'Open Messages',
  },
  {
    icon: <CalendarCheck2 className="h-6 w-6" />,
    color: 'text-indigo-600 bg-indigo-50',
    title: 'Calendar',
    description: 'See every event on a visual timeline. Spot conflicts at a glance.',
    bullets: [
      'Month, week, and day views',
      'Color-coded by event status',
      'Click any event to open it directly',
      'Block out unavailable dates',
      'Works across multiple venues simultaneously',
    ],
    href: '/dashboard/calendar',
    hrefLabel: 'Open Calendar',
  },
  {
    icon: <Store className="h-6 w-6" />,
    color: 'text-orange-600 bg-orange-50',
    title: 'Vendors',
    description: 'Your entire vendor supply chain — bookings, invoices, and payments in one hub.',
    bullets: [
      'Add vendor contacts and service categories',
      'Send booking requests to vendors for specific events',
      'Collect vendor invoices through the platform',
      'Track vendor payment status',
      'Link vendors to events to keep everything organized',
    ],
    href: '/dashboard/vendors',
    hrefLabel: 'View Vendors',
  },
  {
    icon: <Package className="h-6 w-6" />,
    color: 'text-sky-600 bg-sky-50',
    title: 'Items & Packages',
    description: 'Build your service catalog once. Add items to invoices in one click.',
    bullets: [
      'Create reusable line items with prices',
      'Bundle items into packages',
      'Add any item to an invoice or estimate instantly',
      'Edit pricing at any time',
      'Prevents manual re-entry on every invoice',
    ],
    href: '/dashboard/items',
    hrefLabel: 'View Items',
  },
  {
    icon: <ListChecks className="h-6 w-6" />,
    color: 'text-cyan-600 bg-cyan-50',
    title: 'Door Lists',
    description: 'Build guest lists, check people in at the door, track capacity.',
    bullets: [
      'Create a named guest list per event',
      'Add guests individually or in bulk',
      'Assign ticket type or VIP status',
      'Security staff check guests in via tablet or phone',
      'Real-time capacity counter prevents over-entry',
    ],
    href: '/dashboard/door-lists',
    hrefLabel: 'View Door Lists',
  },
  {
    icon: <Shield className="h-6 w-6" />,
    color: 'text-slate-600 bg-slate-50',
    title: 'Security Management',
    description: 'Assign staff to events and entry points — scoped access only.',
    bullets: [
      'Assign security personnel to specific events',
      'Control which entry points they manage',
      'Security staff see only their assigned events',
      'Dedicated check-in interface — no dashboard access needed',
      'Audit trail of check-in activity',
    ],
    href: '/dashboard/security',
    hrefLabel: 'View Security',
  },
  {
    icon: <DollarSign className="h-6 w-6" />,
    color: 'text-emerald-600 bg-emerald-50',
    title: 'Payments',
    description: 'Full revenue history — every payment, deposit, and outstanding balance.',
    bullets: [
      'All collected payments in one view',
      'Filter by date range or event',
      'Drill into any payment for details',
      'Outstanding balances highlighted',
      'Export-ready for accounting',
    ],
    href: '/dashboard/payments',
    hrefLabel: 'View Payments',
  },
  {
    icon: <Users className="h-6 w-6" />,
    color: 'text-violet-600 bg-violet-50',
    title: 'Team Management',
    description: 'Invite associates to help run your business — role-based access.',
    bullets: [
      'Invite team members via email',
      'Associates see all events but not billing/settings',
      'Perfect for coordinators and assistants',
      'Remove or update access at any time',
      'Each associate has their own login',
    ],
    href: '/dashboard/team',
    hrefLabel: 'Manage Team',
  },
]

const ROLE_FEATURES: FeatureCard[] = [
  {
    icon: <Megaphone className="h-6 w-6" />,
    color: 'text-blue-600 bg-blue-50',
    title: 'Promoter Mode',
    description: 'Create public ticketed events. Sell tickets. Manage artists. Track sales.',
    bullets: [
      'Enable from Settings — no separate account needed',
      'Create public events with descriptions, dates, and media',
      'Set multiple ticket tiers (General, VIP, etc.)',
      'Ticket buyers get a QR code via email',
      'Scan QR codes at the door for entry',
      'Real-time sales and revenue dashboard',
    ],
    href: '/dashboard/settings',
    hrefLabel: 'Enable Promoter Mode',
    badge: 'Add-On Role',
  },
  {
    icon: <Music className="h-6 w-6" />,
    color: 'text-pink-600 bg-pink-50',
    title: 'Artist Portal',
    description: 'For performers — manage your profile, rider, and incoming bookings.',
    bullets: [
      'Public artist profile on the EventEcos directory',
      'Upload performance rider (sent to promoters digitally)',
      'Receive and respond to booking requests',
      'Track booking status and payment details',
      'Promoters can discover and book you from the platform',
    ],
    href: '/artist/dashboard',
    hrefLabel: 'View Artist Dashboard',
    badge: 'Add-On Role',
  },
  {
    icon: <Building2 className="h-6 w-6" />,
    color: 'text-orange-600 bg-orange-50',
    title: 'Vendor Portal',
    description: 'For service providers — list your business, receive requests, get paid.',
    bullets: [
      'Public vendor profile in the EventEcos directory',
      'Clients and owners can discover and contact you',
      'Receive booking requests from event owners',
      'Submit invoices directly through the platform',
      'Track payment status on your vendor dashboard',
    ],
    href: '/vendors/dashboard',
    hrefLabel: 'View Vendor Dashboard',
    badge: 'Add-On Role',
  },
  {
    icon: <Users className="h-6 w-6" />,
    color: 'text-teal-600 bg-teal-50',
    title: 'Client Portal',
    description: 'What your clients see — no app, no login, just their unique SMS link.',
    bullets: [
      'Event status and progress at a glance',
      'Review and approve estimates',
      'E-sign contracts from any device',
      'Pay invoices securely online',
      'Message the event owner directly',
      'Accessible 24/7 from the link in their SMS',
    ],
    badge: 'Client-Facing',
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeatureCardItem({ feature }: { feature: FeatureCard }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl ${feature.color} shrink-0`}>
          {feature.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 text-base">{feature.title}</h3>
            {feature.badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wide">
                {feature.badge}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5 leading-snug">{feature.description}</p>
        </div>
      </div>

      {/* Bullets */}
      <ul className="space-y-1.5 flex-1">
        {feature.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            {b}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {feature.href && (
        <Link
          href={feature.href}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors mt-auto pt-1"
        >
          {feature.hrefLabel || 'Try it'} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-white">
      <DemoTour />

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img src="/lib/EventEcos-Logo.jpg" alt="EventEcos" className="h-9 w-auto object-contain rounded" />
          </Link>

          <div className="flex items-center gap-1.5">
            <div className="hidden sm:flex items-center gap-1.5 bg-violet-100 text-violet-700 text-xs font-bold px-2.5 py-1 rounded-full">
              <Sparkles className="h-3 w-3" />
              Demo Mode
            </div>
            <button
              onClick={() => (window as any).__openDemoTour?.()}
              className="flex items-center gap-1.5 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
              Start Tour
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              Dashboard <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            Live Feature Map
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-5 leading-tight">
            Everything EventEcos can do —{' '}
            <span className="text-indigo-600">before you commit to a thing</span>
          </h1>

          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            EventEcos is an all-in-one platform for venue owners, promoters, vendors, and artists.
            This page walks through every feature so you know exactly what you're getting.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => (window as any).__openDemoTour?.()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-lg hover:shadow-xl text-sm"
            >
              <Play className="h-4 w-4" />
              Guided Tour (17 steps)
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 font-bold px-6 py-3 rounded-xl border border-gray-300 hover:border-gray-400 transition-colors shadow-sm text-sm"
            >
              Enter Demo Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Event Lifecycle ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              How an Event Goes From Inquiry to Paid
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Every client follows the same 5-step pipeline. You always know exactly where each event stands.
            </p>
          </div>

          {/* Flow */}
          <div className="relative">
            {/* Connector line — desktop only */}
            <div className="hidden md:block absolute top-8 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-purple-200 via-indigo-300 to-green-200 z-0" />

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10">
              {[
                { step: '1', label: 'Intake Form', sub: 'Client fills out your form', color: 'bg-purple-600', light: 'bg-purple-50 border-purple-200 text-purple-700' },
                { step: '2', label: 'Estimate', sub: 'Client approves pricing', color: 'bg-amber-500', light: 'bg-amber-50 border-amber-200 text-amber-700' },
                { step: '3', label: 'Contract', sub: 'Client e-signs', color: 'bg-rose-500', light: 'bg-rose-50 border-rose-200 text-rose-700' },
                { step: '4', label: 'Invoice', sub: 'Client pays online', color: 'bg-green-600', light: 'bg-green-50 border-green-200 text-green-700' },
                { step: '5', label: 'Booked ✓', sub: 'Event confirmed', color: 'bg-indigo-600', light: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
              ].map((s) => (
                <div key={s.step} className="flex flex-col items-center text-center gap-2">
                  <div className={`w-16 h-16 rounded-full ${s.color} text-white flex items-center justify-center font-bold text-xl shadow-md`}>
                    {s.step}
                  </div>
                  <div className={`text-xs font-bold px-2.5 py-1 rounded-full border ${s.light}`}>
                    {s.label}
                  </div>
                  <p className="text-xs text-gray-500 leading-tight">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-gray-400 mt-8">
            Each step is optional — skip any that don't apply to your workflow.
          </p>
        </div>
      </section>

      {/* ── Roles Overview ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Who Is EventEcos For?</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              One account can hold multiple roles. A venue owner can also run promoter events and book vendors — all from the same login.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                role: 'Venue Owner / Event Planner',
                icon: <Building2 className="h-8 w-8" />,
                color: 'text-indigo-600 bg-indigo-100',
                description: 'Run your venue end-to-end. Manage private events through the full 5-step pipeline — intake, estimate, contract, invoice, and booked. Hire vendors, assign security staff, and keep clients informed from one dashboard.',
                features: ['Full 5-step event pipeline', 'Client intake form with auto-SMS', 'E-signature contracts & online invoices', 'Vendor hiring & payment tracking', 'Guest lists, door lists & security staff'],
                dashboard: '/dashboard',
                dashLabel: 'Open Owner Dashboard',
              },
              {
                role: 'Promoter',
                icon: <Megaphone className="h-8 w-8" />,
                color: 'text-blue-600 bg-blue-100',
                description: 'Build and promote public ticketed events. Set multiple ticket tiers, sell tickets online, and scan QR codes at the door. Discover and book artists from the EventEcos directory. Track sales and revenue in real time.',
                features: ['Create public events with ticket tiers', 'QR code tickets delivered by email', 'Door scanner for fast check-ins', 'Book artists from the talent directory', 'Real-time sales & revenue dashboard'],
                dashboard: '/dashboard/promoter',
                dashLabel: 'Open Promoter Dashboard',
              },
              {
                role: 'Vendor / Service Provider',
                icon: <Store className="h-8 w-8" />,
                color: 'text-orange-600 bg-orange-100',
                description: 'Get discovered by event owners looking for DJs, caterers, photographers, decorators, and more. Receive booking requests, respond to inquiries, submit invoices, and track your earnings — all without leaving the platform.',
                features: ['Public profile in the vendor directory', 'Receive & manage booking requests', 'Submit invoices directly through the app', 'Track booking status & payment history', 'Build reputation with client reviews'],
                dashboard: '/vendors/dashboard',
                dashLabel: 'Open Vendor Dashboard',
              },
              {
                role: 'Artist / Performer',
                icon: <Music className="h-8 w-8" />,
                color: 'text-pink-600 bg-pink-100',
                description: 'Get booked by promoters and venue owners looking for musicians, DJs, comedians, dancers, and MCs. Manage your public profile, upload your performance rider, set your availability, and respond to booking requests from one place.',
                features: ['Public artist profile & portfolio', 'Upload & send your performance rider', 'Receive booking requests from promoters', 'Set availability & rate information', 'Track all bookings & payment status'],
                dashboard: '/artist/dashboard',
                dashLabel: 'Open Artist Dashboard',
              },
            ].map((r) => (
              <div key={r.role} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${r.color} w-fit shrink-0`}>
                    {r.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">{r.role}</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{r.description}</p>
                <ul className="space-y-1.5">
                  {r.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={r.dashboard}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors mt-auto pt-1"
                >
                  {r.dashLabel} <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Owner Feature Grid ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wide">
              <Building2 className="h-3.5 w-3.5" />
              Venue Owner &amp; Event Planner
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              Every Tool You Need to Run Your Business
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              From the first inquiry to the final payment — everything lives in one platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {OWNER_FEATURES.map((f) => (
              <FeatureCardItem key={f.title} feature={f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Additional Roles Feature Grid ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wide">
              <Sparkles className="h-3.5 w-3.5" />
              Additional Roles &amp; Portals
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              One Ecosystem, Every Stakeholder
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Promoters, vendors, artists, and clients each get their own purpose-built experience.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {ROLE_FEATURES.map((f) => (
              <FeatureCardItem key={f.title} feature={f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── What Makes It Easy ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              Designed to Be Obvious
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Every screen tells you what to do next. No training required.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                emoji: '📋',
                title: 'Clear Next Steps',
                description: 'The 5-step progress bar on every event tells you exactly what action to take next. No guessing.',
              },
              {
                emoji: '📱',
                title: 'Everything Works on Mobile',
                description: 'Clients sign contracts, pay invoices, and message you from their phone — no app download required.',
              },
              {
                emoji: '🔔',
                title: 'Nothing Falls Through the Cracks',
                description: 'The dashboard surfaces unpaid invoices, pending signatures, and upcoming events — automatically.',
              },
            ].map((item) => (
              <div key={item.title} className="text-center p-6 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="text-4xl mb-4">{item.emoji}</div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to try it for real?
          </h2>
          <p className="text-indigo-200 text-lg mb-8">
            Start your free trial — all features unlocked, no credit card required.
            Your demo data carries over automatically.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="flex items-center gap-2 bg-white text-indigo-700 font-bold px-8 py-4 rounded-xl transition-colors hover:bg-indigo-50 shadow-lg text-base"
            >
              Start Free Trial <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-xl transition-colors border border-white/30 text-base"
            >
              Keep Exploring <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 text-center text-sm">
        <p>
          &copy; {new Date().getFullYear()} EventEcos &mdash; Demo Mode.{' '}
          <Link href="/" className="hover:text-white transition-colors">Back to Home</Link>
          {' · '}
          <Link href="/login" className="hover:text-white transition-colors">Login</Link>
          {' · '}
          <Link href="/signup" className="hover:text-white transition-colors">Sign Up</Link>
        </p>
      </footer>

    </div>
  )
}
