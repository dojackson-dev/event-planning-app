'use client'

/**
 * DemoTour
 * Comprehensive 16-step guided walkthrough of the entire EventEcos platform.
 *
 * In DEMO MODE: uses sessionStorage so the tour resets on every new browser
 * session — visitors always get a fresh experience.
 *
 * Can be reopened at any time by calling window.__openDemoTour()
 */

import { useEffect, useState, useCallback } from 'react'
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  FileText,
  ClipboardList,
  Users2,
  Store,
  Rocket,
  ChevronRight,
  ChevronLeft,
  X,
  Receipt,
  MessageSquare,
  ListChecks,
  Shield,
  DollarSign,
  Music,
  Megaphone,
  Building2,
  Link as LinkIcon,
  Sparkles,
} from 'lucide-react'

// Demo mode: session-only dismissal so every fresh browser session starts clean.
const STORAGE_KEY = 'demo_tour_v3_dismissed'

interface Step {
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
  badgeColor?: string
  href?: string
  hrefLabel?: string
  tips?: string[]
}

const STEPS: Step[] = [
  {
    icon: <Sparkles className="h-10 w-10 text-indigo-500" />,
    title: 'Welcome to EventEcos!',
    description:
      'EventEcos is a complete business platform for venue owners, event promoters, vendors, and artists. This guided tour covers every feature so you know exactly what to expect.',
    badge: 'Demo Mode Active',
    badgeColor: 'bg-violet-100 text-violet-700',
    tips: ['Use the arrows below to navigate', 'Click any page link to explore that feature live', 'Reopen this tour anytime from the banner above'],
  },
  {
    icon: <LayoutDashboard className="h-10 w-10 text-blue-500" />,
    title: 'Dashboard — Your Command Center',
    description:
      'The dashboard greets you with live stats: unpaid invoices, upcoming events, total revenue, and new clients. Everything you need to know about your business at a glance.',
    href: '/dashboard',
    hrefLabel: 'Go to Dashboard',
    tips: ['Stats update in real time', '"Take a tour" button is always in the top-right corner', 'The setup checklist guides new users step by step'],
  },
  {
    icon: <ClipboardList className="h-10 w-10 text-purple-500" />,
    title: 'Client Intake — Where It All Starts',
    description:
      'Share your unique intake form link with potential clients. When they fill it out, the platform automatically creates an event and instantly sends them an SMS with a link to their own client portal.',
    href: '/dashboard/intake',
    hrefLabel: 'View Intake Form',
    badge: 'Step 1 of 5',
    badgeColor: 'bg-purple-100 text-purple-700',
    tips: ['Your intake link is unique to your account', 'Clients get an SMS the moment they submit', 'No client login required — just their link'],
  },
  {
    icon: <CalendarCheck2 className="h-10 w-10 text-emerald-500" />,
    title: 'Events — Your Central Hub',
    description:
      'Every client becomes an event. Each event shows a 5-step progress tracker: Intake Received → Estimate Sent → Contract Signed → Invoice Paid → Booked. Open any event to take the next step.',
    href: '/dashboard/events',
    hrefLabel: 'View Events',
    badge: 'Step 2 of 5',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    tips: ['All documents for an event live in one place', 'Color-coded status makes it easy to spot what needs attention', 'Filter by date, venue, or status'],
  },
  {
    icon: <FileText className="h-10 w-10 text-amber-500" />,
    title: 'Estimates — Get Client Approval First',
    description:
      'Before sending an invoice, send an estimate. The client receives a link to review the pricing and approve or decline. Once approved, it converts automatically into an invoice.',
    href: '/dashboard/estimates',
    hrefLabel: 'View Estimates',
    badge: 'Step 3 of 5',
    badgeColor: 'bg-amber-100 text-amber-700',
    tips: ['Estimates keep you from issuing invoices before the client agrees', 'Clients approve with one tap from their phone', 'Approved estimates auto-populate the invoice'],
  },
  {
    icon: <FileText className="h-10 w-10 text-rose-500" />,
    title: 'Contracts — E-Signature, No Printer',
    description:
      'Upload a contract PDF or use a template, assign it to an event, and send it. Clients e-sign directly from their phone. The signed document is stored and accessible any time.',
    href: '/dashboard/contracts',
    hrefLabel: 'View Contracts',
    badge: 'Step 4 of 5',
    badgeColor: 'bg-rose-100 text-rose-700',
    tips: ['Contracts are linked directly to the event', 'You get notified the moment a contract is signed', 'Voided contracts are marked automatically'],
  },
  {
    icon: <Receipt className="h-10 w-10 text-green-500" />,
    title: 'Invoices — Get Paid Online',
    description:
      'Create an invoice, add your service items, and send it. Clients pay online via a secure Stripe link — funds go straight to your connected bank account. No manual transfers.',
    href: '/dashboard/invoices',
    hrefLabel: 'View Invoices',
    badge: 'Step 5 of 5',
    badgeColor: 'bg-green-100 text-green-700',
    tips: ['Clients pay from any device — no app required', 'Partial payments and deposits are supported', 'Revenue is tracked automatically in Payments'],
  },
  {
    icon: <Users className="h-10 w-10 text-sky-500" />,
    title: 'Client Portal — Their View',
    description:
      'Every client gets a private, no-login portal (sent via SMS). They can check their event status, review and sign documents, pay invoices, and message you — all from one link.',
    tips: ['Clients don\'t need to create an account', 'Their portal shows only their event — nothing else', 'Messages between you and the client are private per event'],
  },
  {
    icon: <MessageSquare className="h-10 w-10 text-teal-500" />,
    title: 'Messages — In-App Client Chat',
    description:
      'Each event has its own message thread. You and the client can exchange messages directly in the app — no more lost emails or scattered texts. Unread counts show in your sidebar.',
    href: '/dashboard/messages',
    hrefLabel: 'Open Messages',
    tips: ['Unread badge appears on the sidebar icon', 'Each event is a separate conversation', 'Messages are archived with the event'],
  },
  {
    icon: <CalendarCheck2 className="h-10 w-10 text-indigo-500" />,
    title: 'Calendar — See Everything at Once',
    description:
      'A full-screen calendar view of all your events. Click any date to see what\'s booked. Toggle between month, week, and day views. Block out dates to prevent double-bookings.',
    href: '/dashboard/calendar',
    hrefLabel: 'Open Calendar',
    tips: ['Clicking an event opens it directly', 'Color coding shows event status', 'Great for planning capacity across multiple venues'],
  },
  {
    icon: <Store className="h-10 w-10 text-orange-500" />,
    title: 'Vendors — Your Entire Supply Chain',
    description:
      'Add vendors (DJs, caterers, photographers, etc.), send booking requests, collect their invoices, and track payments — all from one vendor hub that keeps your supply chain organized.',
    href: '/dashboard/vendors',
    hrefLabel: 'View Vendors',
    tips: ['Vendors can also register on the platform directly', 'Vendor invoices go into a separate queue', 'Link vendors to specific events'],
  },
  {
    icon: <Store className="h-10 w-10 text-amber-500" />,
    title: 'Vendor Portal — For Service Providers',
    description:
      'Vendors get their own dashboard to manage their public profile, respond to booking requests from event owners, submit invoices, and track their earnings — no separate account needed.',
    href: '/vendors/dashboard',
    hrefLabel: 'View Vendor Dashboard',
    badge: 'Add-On Role',
    badgeColor: 'bg-orange-100 text-orange-700',
    tips: ['Vendors sign up with the Vendor role', 'Event owners discover vendors from the platform directory', 'Vendor invoices feed directly into the owner\'s billing workflow'],
  },
  {
    icon: <ListChecks className="h-10 w-10 text-cyan-500" />,
    title: 'Door Lists — Manage Event Access',
    description:
      'Build a guest list for any event. Add names, assign ticket types or VIP status, and check guests in at the door. Great for ticketed events, private functions, and galas.',
    href: '/dashboard/door-lists',
    hrefLabel: 'View Door Lists',
    tips: ['Security staff can check in guests from a tablet', 'Capacity tracking prevents over-entry', 'Lists are tied to specific events'],
  },
  {
    icon: <Shield className="h-10 w-10 text-slate-500" />,
    title: 'Security — Staff & Access Control',
    description:
      'Assign security personnel to events and control which entry points they manage. Security staff get a dedicated check-in interface — no dashboard access required.',
    href: '/dashboard/security',
    hrefLabel: 'View Security',
    tips: ['Security staff only see their assigned events', 'Access is role-based and scoped to the event', 'Perfect for multi-entry venues'],
  },
  {
    icon: <Megaphone className="h-10 w-10 text-blue-500" />,
    title: 'Promoter Mode — Sell Tickets Publicly',
    description:
      'Enable Promoter Mode from Settings to unlock a second dashboard. Create public events, set multiple ticket tiers, and sell tickets directly. Ticket buyers get a QR code confirmation via email.',
    href: '/dashboard/settings',
    hrefLabel: 'Enable Promoter Mode',
    badge: 'Add-On Feature',
    badgeColor: 'bg-blue-100 text-blue-700',
    tips: ['Promoter and Owner dashboards are separate but linked', 'Tickets are scanned at the door using QR codes', 'Sales reports show real-time revenue'],
  },
  {
    icon: <Music className="h-10 w-10 text-pink-500" />,
    title: 'Artist Portal — For Performers',
    description:
      'Artists have their own dashboard to manage their public profile, performance rider, and incoming booking requests from promoters. All bookings are tracked with status and payment details.',
    href: '/artist/dashboard',
    hrefLabel: 'View Artist Dashboard',
    badge: 'Add-On Feature',
    badgeColor: 'bg-pink-100 text-pink-700',
    tips: ['Artists sign up with the Artist role', 'Promoters can discover and book artists from the platform', 'Riders are sent to promoters digitally'],
  },
  {
    icon: <Rocket className="h-10 w-10 text-violet-500" />,
    title: 'You\'re Ready to Explore!',
    description:
      'That\'s a full lap around EventEcos. Everything is live — click around, explore any section, and see how the pieces connect. When you\'re ready, start your free trial.',
    badge: 'Tour Complete ✓',
    badgeColor: 'bg-violet-100 text-violet-700',
    href: '/signup',
    hrefLabel: 'Start Free Trial →',
    tips: ['All features are unlocked during the trial', 'Your data carries over when you upgrade', 'Questions? Use the Feature Map at /demo'],
  },
]

export default function DemoTour() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    // Demo mode: session-only dismissal — fresh every new browser session
    const dismissed = sessionStorage.getItem(STORAGE_KEY)
    if (!dismissed) {
      const t = setTimeout(() => setOpen(true), 900)
      return () => clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    ;(window as any).__openDemoTour = () => {
      setStep(0)
      setOpen(true)
    }
    return () => {
      delete (window as any).__openDemoTour
    }
  }, [])

  const dismiss = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }, [])

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      dismiss()
    }
  }

  const prev = () => setStep(s => Math.max(0, s - 1))

  if (!open) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const progress = Math.round(((step + 1) / STEPS.length) * 100)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Top progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            EventEcos Feature Tour
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-medium">
              {step + 1} / {STEPS.length}
            </span>
            <button
              onClick={dismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Dot nav */}
        <div className="flex justify-center gap-1 pt-3 pb-1 px-5 overflow-x-auto">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`flex-shrink-0 h-1.5 rounded-full transition-all duration-200 ${
                i === step
                  ? 'w-5 bg-indigo-600'
                  : i < step
                  ? 'w-1.5 bg-indigo-300'
                  : 'w-1.5 bg-gray-200'
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pt-5 pb-4 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              {current.icon}
            </div>
          </div>

          {current.badge && (
            <span className={`inline-block mb-3 px-3 py-1 rounded-full text-xs font-semibold ${current.badgeColor || 'bg-indigo-100 text-indigo-700'}`}>
              {current.badge}
            </span>
          )}

          <h2 className="text-lg font-bold text-gray-900 mb-2 leading-snug">{current.title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed">{current.description}</p>

          {current.href && (
            <a
              href={current.href}
              onClick={dismiss}
              className="inline-flex items-center gap-1 mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
            >
              {current.hrefLabel} <ChevronRight className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Tips */}
        {current.tips && current.tips.length > 0 && (
          <div className="mx-6 mb-4 bg-indigo-50 rounded-xl px-4 py-3 text-left">
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-1.5">Quick tips</p>
            <ul className="space-y-1">
              {current.tips.map((tip, i) => (
                <li key={i} className="text-xs text-indigo-800 flex items-start gap-1.5">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 pb-5 gap-3">
          <button
            onClick={prev}
            disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          <button
            onClick={next}
            className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
          >
            {isLast ? 'Done — Let\'s Explore!' : 'Next'}
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

      </div>
    </div>
  )
}
