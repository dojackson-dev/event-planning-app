'use client'

/**
 * DemoModeBanner
 * Persistent top strip shown across every page in demo mode.
 * Provides context-aware hints about the current section, a quick
 * "Tour" button, and a link to the full Feature Map page.
 * Dismissed per browser session (sessionStorage), not permanently.
 */

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, Map, X, Play } from 'lucide-react'

interface PageCtx {
  label: string
  hint: string
}

const PAGE_CONTEXT: Record<string, PageCtx> = {
  '/dashboard': {
    label: 'Dashboard',
    hint: 'Your command center — live stats, recent activity, and quick links to every feature.',
  },
  '/dashboard/events': {
    label: 'Events',
    hint: 'Each event follows a 5-step pipeline: Intake → Estimate → Contract → Invoice → Booked.',
  },
  '/dashboard/calendar': {
    label: 'Calendar',
    hint: 'Visual timeline of all your events. Click any date or event to open it.',
  },
  '/dashboard/clients': {
    label: 'Clients',
    hint: 'Every client who filled out your intake form appears here. Click to view their event.',
  },
  '/dashboard/intake': {
    label: 'Client Intake',
    hint: 'Share your intake form link. When a client submits it, an event is auto-created and they receive an SMS with their portal link.',
  },
  '/dashboard/invoices': {
    label: 'Invoices',
    hint: 'Create and send invoices. Clients pay online — funds deposit directly into your Stripe account.',
  },
  '/dashboard/estimates': {
    label: 'Estimates',
    hint: 'Send a price estimate for client approval before issuing a formal invoice.',
  },
  '/dashboard/contracts': {
    label: 'Contracts',
    hint: 'Upload or create contracts. Clients e-sign from their phone — no printer required.',
  },
  '/dashboard/vendors': {
    label: 'Vendors',
    hint: 'Book vendors, send requests, collect vendor invoices, and track payments — all in one place.',
  },
  '/dashboard/vendor-invoices': {
    label: 'Vendor Invoices',
    hint: 'Invoices coming from your vendors. Review, approve, and pay from here.',
  },
  '/dashboard/messages': {
    label: 'Messages',
    hint: 'In-app chat with clients. Every event gets its own thread — no email chains needed.',
  },
  '/dashboard/door-lists': {
    label: 'Door Lists',
    hint: 'Build guest lists, manage check-ins, and track capacity for each event.',
  },
  '/dashboard/security': {
    label: 'Security',
    hint: 'Assign security personnel to events and control entry point access.',
  },
  '/dashboard/payments': {
    label: 'Payments',
    hint: 'Full revenue history — deposits, invoice payments, and outstanding balances.',
  },
  '/dashboard/billing': {
    label: 'Billing',
    hint: 'Manage your subscription plan. Upgrade from a free trial here — all your data carries over.',
  },
  '/dashboard/settings': {
    label: 'Settings',
    hint: 'Set your business name, venue details, logo, and notification preferences.',
  },
  '/dashboard/items': {
    label: 'Items & Packages',
    hint: 'Build your service catalog. Add items to any invoice in one click.',
  },
  '/dashboard/team': {
    label: 'Team',
    hint: 'Invite associates to help manage events. Control what they can see and do.',
  },
  '/dashboard/promoter': {
    label: 'Promoter Dashboard',
    hint: 'Create public events, set ticket tiers, and track sales — your promoter command center.',
  },
  '/artist/dashboard': {
    label: 'Artist Dashboard',
    hint: 'Manage your artist profile, performance rider, and incoming booking requests.',
  },
  '/vendors/dashboard': {
    label: 'Vendor Dashboard',
    hint: 'Update your vendor profile, respond to booking requests, and manage your invoices.',
  },
  '/client-portal': {
    label: 'Client Portal',
    hint: 'What your clients see — their event details, documents, invoices, and chat thread.',
  },
}

function getPageContext(pathname: string): PageCtx | null {
  if (PAGE_CONTEXT[pathname]) return PAGE_CONTEXT[pathname]
  for (const [key, val] of Object.entries(PAGE_CONTEXT)) {
    if (pathname.startsWith(key + '/')) return val
  }
  return null
}

export default function DemoModeBanner() {
  const pathname = usePathname()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const saved = sessionStorage.getItem('demo_banner_dismissed')
    if (saved) setDismissed(true)
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem('demo_banner_dismissed', '1')
    setDismissed(true)
  }

  if (dismissed) return null

  const ctx = getPageContext(pathname || '')

  return (
    <div className="sticky top-0 z-[60] bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-3 py-2 min-h-[44px]">

          {/* DEMO badge */}
          <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-bold tracking-wider shrink-0 uppercase">
            <Sparkles className="h-3 w-3" />
            <span className="hidden sm:inline">Demo</span>
            <span className="sm:hidden">Demo</span>
          </div>

          {/* Context hint */}
          <div className="flex-1 min-w-0 leading-tight">
            {ctx ? (
              <p className="text-xs sm:text-sm truncate">
                <span className="font-semibold">{ctx.label}:</span>{' '}
                <span className="opacity-90 hidden sm:inline">{ctx.hint}</span>
                <span className="opacity-90 sm:hidden">{ctx.label} — tap Tour for a walkthrough.</span>
              </p>
            ) : (
              <p className="text-xs sm:text-sm opacity-90">
                Exploring <span className="font-semibold">EventEcos</span>
                <span className="hidden sm:inline"> — the all-in-one event management platform. Tap <strong>Tour</strong> for a guided walkthrough.</span>
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/demo"
              className="hidden sm:flex items-center gap-1 text-xs font-semibold bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              <Map className="h-3 w-3" />
              Feature Map
            </Link>
            <button
              onClick={() => (window as any).__openDemoTour?.()}
              className="flex items-center gap-1 text-xs font-semibold bg-white text-indigo-700 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              <Play className="h-3 w-3" />
              Tour
            </button>
            <button
              onClick={handleDismiss}
              className="opacity-60 hover:opacity-100 transition-opacity p-1 ml-0.5"
              aria-label="Dismiss demo banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
