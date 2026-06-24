'use client'

/**
 * /demo — EventEcos Feature Map & Live Demo Showcase
 *
 * A fully public page (no auth required) that walks visitors through
 * every feature of the platform. Designed to be a polished proof-of-concept
 * before someone signs up — easy enough for anyone to understand, detailed
 * enough for a decision-maker to evaluate.
 */

import { useState } from 'react'
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

// ─── Dashboard Preview Mockups ────────────────────────────────────────────────

type PreviewTab = 'owner' | 'promoter' | 'vendor' | 'artist' | 'client'

const PREVIEW_TABS: { id: PreviewTab; label: string; color: string }[] = [
  { id: 'owner',    label: 'Venue Owner',  color: 'text-indigo-600 border-indigo-600' },
  { id: 'promoter', label: 'Promoter',     color: 'text-blue-600 border-blue-600' },
  { id: 'vendor',   label: 'Vendor',       color: 'text-orange-600 border-orange-600' },
  { id: 'artist',   label: 'Artist',       color: 'text-pink-600 border-pink-600' },
  { id: 'client',   label: 'Client Portal',color: 'text-teal-600 border-teal-600' },
]

function MockBrowser({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-2xl">
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-2.5 flex items-center gap-3">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded-md px-3 py-1 text-[11px] text-gray-400 border border-gray-200 font-mono truncate">
          eventecos.com{url}
        </div>
      </div>
      <div className="bg-white overflow-hidden">{children}</div>
    </div>
  )
}

function FakeRow({ name, sub, badge, badgeColor }: { name: string; sub: string; badge: string; badgeColor: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-[11px] font-medium text-gray-800">{name}</p>
        <p className="text-[10px] text-gray-400">{sub}</p>
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
    </div>
  )
}

function OwnerPreview() {
  const nav = ['Dashboard','Events','Clients','Invoices','Estimates','Contracts','Calendar','Vendors','Messages','Payments']
  return (
    <MockBrowser url="/dashboard">
      <div className="flex h-[400px] text-[11px] overflow-hidden select-none">
        <div className="w-40 bg-gray-900 shrink-0 flex flex-col gap-0.5 py-4 px-2">
          <div className="flex items-center gap-1.5 px-2 py-2 mb-2">
            <div className="w-5 h-5 rounded bg-indigo-500 shrink-0" />
            <span className="text-white font-bold text-xs tracking-tight">EventEcos</span>
          </div>
          {nav.map((item, i) => (
            <div key={item} className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${i === 0 ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
              <div className="w-2.5 h-2.5 rounded-sm bg-current opacity-60 shrink-0" />
              {item}
            </div>
          ))}
        </div>
        <div className="flex-1 bg-gray-50 overflow-hidden p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-gray-800 text-sm">Welcome back!</p>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">Free Trial</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Unpaid Invoices', value: '$4,250', bg: 'bg-red-50 border-red-100', text: 'text-red-600' },
              { label: 'Revenue / Mo.', value: '$12,800', bg: 'bg-green-50 border-green-100', text: 'text-green-600' },
              { label: 'Upcoming Events', value: '7', bg: 'bg-blue-50 border-blue-100', text: 'text-blue-600' },
              { label: 'New Clients', value: '3', bg: 'bg-purple-50 border-purple-100', text: 'text-purple-600' },
            ].map(s => (
              <div key={s.label} className={`rounded-lg border p-2 ${s.bg}`}>
                <p className="text-[9px] text-gray-500 leading-tight mb-0.5">{s.label}</p>
                <p className={`text-base font-bold ${s.text}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg border border-gray-200 flex-1 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
              <p className="font-semibold text-gray-700 text-xs">Recent Events</p>
              <span className="text-[9px] text-indigo-500 font-medium">View all →</span>
            </div>
            <FakeRow name="Johnson Wedding" sub="Jul 12 · Grand Ballroom" badge="Invoice Sent" badgeColor="bg-green-100 text-green-700" />
            <FakeRow name="Garcia Quinceañera" sub="Jul 18 · Rooftop" badge="Contract Signed" badgeColor="bg-blue-100 text-blue-700" />
            <FakeRow name="Smith Corp Event" sub="Aug 2 · Hall A" badge="Estimate Sent" badgeColor="bg-amber-100 text-amber-700" />
            <FakeRow name="Rivera Birthday" sub="Aug 9 · Garden" badge="Intake Received" badgeColor="bg-purple-100 text-purple-700" />
          </div>
        </div>
      </div>
    </MockBrowser>
  )
}

function PromoterPreview() {
  return (
    <MockBrowser url="/dashboard/promoter">
      <div className="flex h-[400px] text-[11px] overflow-hidden select-none">
        <div className="w-40 bg-gray-900 shrink-0 flex flex-col gap-0.5 py-4 px-2">
          <div className="flex items-center gap-1.5 px-2 py-2 mb-2">
            <div className="w-5 h-5 rounded bg-blue-500 shrink-0" />
            <span className="text-white font-bold text-xs">Promoter</span>
          </div>
          {['Dashboard','My Events','Artists','Ticket Sales','Payouts'].map((item, i) => (
            <div key={item} className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${i === 0 ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>
              <div className="w-2.5 h-2.5 rounded-sm bg-current opacity-60 shrink-0" />
              {item}
            </div>
          ))}
        </div>
        <div className="flex-1 bg-gray-50 overflow-hidden p-4 flex flex-col gap-3">
          <p className="font-bold text-gray-800 text-sm">Promoter Dashboard</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Active Events', value: '4', bg: 'bg-blue-50 border-blue-100', text: 'text-blue-600' },
              { label: 'Tickets Sold', value: '312', bg: 'bg-indigo-50 border-indigo-100', text: 'text-indigo-600' },
              { label: 'Revenue', value: '$6,240', bg: 'bg-green-50 border-green-100', text: 'text-green-600' },
            ].map(s => (
              <div key={s.label} className={`rounded-lg border p-2 ${s.bg}`}>
                <p className="text-[9px] text-gray-500 mb-0.5">{s.label}</p>
                <p className={`text-base font-bold ${s.text}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg border border-gray-200 flex-1 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="font-semibold text-gray-700 text-xs">Your Events</p>
            </div>
            <FakeRow name="Summer Rooftop Party" sub="Jul 20 · 180 tickets left" badge="On Sale" badgeColor="bg-green-100 text-green-700" />
            <FakeRow name="DJ Night Vol. 3" sub="Aug 5 · 43 sold" badge="On Sale" badgeColor="bg-green-100 text-green-700" />
            <FakeRow name="Comedy Night" sub="Aug 22 · Draft" badge="Draft" badgeColor="bg-gray-100 text-gray-600" />
            <FakeRow name="New Year Gala" sub="Dec 31 · Not started" badge="Planning" badgeColor="bg-blue-100 text-blue-700" />
          </div>
        </div>
      </div>
    </MockBrowser>
  )
}

function VendorPreview() {
  return (
    <MockBrowser url="/vendors/dashboard">
      <div className="h-[400px] text-[11px] overflow-hidden select-none bg-gray-50 p-4 flex flex-col gap-3">
        <div className="bg-orange-600 rounded-xl p-4 text-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl shrink-0">🎵</div>
          <div>
            <p className="font-bold text-sm">SoundWave Productions</p>
            <p className="text-orange-200 text-[10px]">DJ · Audio Equipment · Lighting</p>
            <span className="inline-block mt-1 text-[9px] bg-white/20 px-2 py-0.5 rounded-full">Profile 85% complete</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Bookings', value: '8', bg: 'bg-orange-50 border-orange-100', text: 'text-orange-600' },
            { label: 'Pending', value: '2', bg: 'bg-yellow-50 border-yellow-100', text: 'text-yellow-600' },
            { label: 'Earned', value: '$3,400', bg: 'bg-green-50 border-green-100', text: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border p-2 ${s.bg}`}>
              <p className="text-[9px] text-gray-500 mb-0.5">{s.label}</p>
              <p className={`text-base font-bold ${s.text}`}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 flex-1 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="font-semibold text-gray-700 text-xs">Booking Requests</p>
          </div>
          <FakeRow name="Galaxy Events — Wedding" sub="Jul 26 · 4hr set" badge="New Request" badgeColor="bg-orange-100 text-orange-700" />
          <FakeRow name="Rooftop Promotions" sub="Aug 3 · DJ Night" badge="Accepted" badgeColor="bg-green-100 text-green-700" />
          <FakeRow name="Smith Corp Event" sub="Aug 10 · Corporate" badge="Pending Quote" badgeColor="bg-yellow-100 text-yellow-700" />
        </div>
      </div>
    </MockBrowser>
  )
}

function ArtistPreview() {
  return (
    <MockBrowser url="/artist/dashboard">
      <div className="h-[400px] text-[11px] overflow-hidden select-none bg-gray-50 p-4 flex flex-col gap-3">
        <div className="bg-gradient-to-r from-pink-600 to-rose-500 rounded-xl p-4 text-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl shrink-0">🎤</div>
          <div>
            <p className="font-bold text-sm">Marcus Rivera</p>
            <p className="text-pink-200 text-[10px]">R&B · Soul · Live Performance</p>
            <div className="flex gap-1 mt-1">
              <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full">Rider Uploaded</span>
              <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full">Public Profile</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Bookings', value: '6', bg: 'bg-pink-50 border-pink-100', text: 'text-pink-600' },
            { label: 'Pending', value: '1', bg: 'bg-yellow-50 border-yellow-100', text: 'text-yellow-600' },
            { label: 'Earned', value: '$5,200', bg: 'bg-green-50 border-green-100', text: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border p-2 ${s.bg}`}>
              <p className="text-[9px] text-gray-500 mb-0.5">{s.label}</p>
              <p className={`text-base font-bold ${s.text}`}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 flex-1 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="font-semibold text-gray-700 text-xs">Booking Requests</p>
          </div>
          <FakeRow name="Summer Rooftop — DJ Set" sub="Jul 28 · via PromoterX" badge="New" badgeColor="bg-pink-100 text-pink-700" />
          <FakeRow name="Galaxy Events Wedding" sub="Aug 12 · Live Performance" badge="Confirmed" badgeColor="bg-green-100 text-green-700" />
          <FakeRow name="NYE Gala 2027" sub="Dec 31 · Negotiating" badge="Offer Sent" badgeColor="bg-blue-100 text-blue-700" />
        </div>
      </div>
    </MockBrowser>
  )
}

function ClientPortalPreview() {
  return (
    <MockBrowser url="/client-portal">
      <div className="h-[400px] text-[11px] overflow-hidden select-none bg-gray-50 p-4 flex flex-col gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="font-bold text-gray-800 text-sm mb-1">Your Event — Johnson Wedding</p>
          <p className="text-gray-400 text-[10px] mb-3">Saturday, July 12 · Grand Ballroom · 120 guests</p>
          <div className="flex items-center gap-0">
            {['Intake', 'Estimate', 'Contract', 'Invoice', 'Booked'].map((step, i) => (
              <div key={step} className="flex items-center flex-1 last:flex-initial">
                <div className={`flex flex-col items-center gap-0.5 flex-1`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${i < 4 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>{i + 1}</div>
                  <p className={`text-[8px] font-medium ${i < 4 ? 'text-indigo-600' : 'text-gray-400'}`}>{step}</p>
                </div>
                {i < 4 && <div className={`h-0.5 flex-1 -mt-4 ${i < 3 ? 'bg-indigo-300' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 flex-1">
          <div className="bg-white rounded-xl border border-green-200 p-3 flex flex-col">
            <p className="font-semibold text-gray-700 text-xs mb-1">💳 Invoice</p>
            <p className="text-[10px] text-gray-500">Balance due</p>
            <p className="text-xl font-bold text-green-600 mt-0.5">$2,500</p>
            <button className="mt-auto w-full bg-green-600 text-white rounded-lg py-1.5 text-[10px] font-semibold">Pay Now →</button>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-3 flex flex-col">
            <p className="font-semibold text-gray-700 text-xs mb-1">✍️ Contract</p>
            <p className="text-[10px] text-gray-500">Status</p>
            <p className="text-sm font-bold text-blue-600 mt-0.5">Signed ✓</p>
            <p className="text-[9px] text-gray-400 mt-auto">Signed Jun 5, 2026</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 col-span-2">
            <p className="font-semibold text-gray-700 text-xs mb-1.5">💬 Messages</p>
            <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-[10px] text-gray-600">"Your timeline looks great — see you Saturday! 🎉"</div>
          </div>
        </div>
      </div>
    </MockBrowser>
  )
}

function DashboardPreviews() {
  const [activeTab, setActiveTab] = useState<PreviewTab>('owner')
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wide">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard Previews
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            See What Every Dashboard Looks Like
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Each role has its own purpose-built interface. Click a tab to preview.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-8">
          {PREVIEW_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap -mb-px ${
                activeTab === t.id ? t.color : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div>
          {activeTab === 'owner'    && <OwnerPreview />}
          {activeTab === 'promoter' && <PromoterPreview />}
          {activeTab === 'vendor'   && <VendorPreview />}
          {activeTab === 'artist'   && <ArtistPreview />}
          {activeTab === 'client'   && <ClientPortalPreview />}
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          These are illustrative previews. Sign up for a free trial to experience the real thing.
        </p>
      </div>
    </section>
  )
}

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
          href="/signup"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors mt-auto pt-1"
        >
          Sign up to access <ChevronRight className="h-4 w-4" />
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
              href="/signup"
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign Up Free
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
              href="/signup"
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 font-bold px-6 py-3 rounded-xl border border-gray-300 hover:border-gray-400 transition-colors shadow-sm text-sm"
            >
              Start Free Trial <ArrowRight className="h-4 w-4" />
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
                  href="/signup"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors mt-auto pt-1"
                >
                  Sign up to get started <ChevronRight className="h-4 w-4" />
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

      {/* ── Dashboard Previews ── */}
      <DashboardPreviews />

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
