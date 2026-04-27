'use client'

/**
 * DemoTour
 * Step-by-step feature walkthrough shown on first login.
 * Dismissed state stored in localStorage so it only appears once.
 * Can be reopened by calling window.__openDemoTour() (useful for a "Take a tour" link).
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
} from 'lucide-react'

const STORAGE_KEY = 'demo_tour_v2_dismissed'

interface Step {
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
  href?: string
  hrefLabel?: string
}

const STEPS: Step[] = [
  {
    icon: <Rocket className="h-10 w-10 text-indigo-500" />,
    title: 'Welcome to DoVenueSuite!',
    description:
      'You\'re on a free trial — all features are unlocked. Let\'s take a quick tour so you can see how everything flows through the platform.',
    badge: 'Free Trial Active',
  },
  {
    icon: <LayoutDashboard className="h-10 w-10 text-blue-500" />,
    title: 'Your Dashboard',
    description:
      'The dashboard is your command center. See upcoming events, recent activity, revenue at a glance, and quick stats — all updated in real time.',
    href: '/dashboard',
    hrefLabel: 'Go to Dashboard',
  },
  {
    icon: <ClipboardList className="h-10 w-10 text-purple-500" />,
    title: 'Start with a Client Intake Form',
    description:
      'Everything begins here. Share your intake form link with clients. When they fill it out, an event is automatically created and they receive an SMS with a link to their client portal.',
    href: '/dashboard/intake',
    hrefLabel: 'View Intake Form',
  },
  {
    icon: <CalendarCheck2 className="h-10 w-10 text-primary-500" />,
    title: 'Events Are Your Hub',
    description:
      'Each event has a 5-step progress bar: Form → Estimate → Contract → Invoice → Booked. All invoices, estimates, and contracts are created directly from the event page — keeping everything in one place.',
    href: '/dashboard/events',
    hrefLabel: 'View Events',
  },
  {
    icon: <FileText className="h-10 w-10 text-rose-500" />,
    title: 'Estimates, Contracts & Invoices',
    description:
      'Once inside an event, send an estimate for approval, upload and send a contract for e-signature, then issue an invoice. Clients receive payment links and can pay online — funds go directly to your Stripe account.',
    href: '/dashboard/events',
    hrefLabel: 'Go to Events',
  },
  {
    icon: <Users className="h-10 w-10 text-teal-500" />,
    title: 'Your Client Portal',
    description:
      'Clients get their own portal where they can track their event, review and pay invoices, and sign contracts — no login required, just their unique SMS link.',
  },
  {
    icon: <Users2 className="h-10 w-10 text-teal-500" />,
    title: 'Vendor Management',
    description:
      'Add vendors, send booking requests, collect vendor invoices, and manage payments — all from a single vendor portal. Keep your entire event supply chain in sync.',
    href: '/dashboard/vendors',
    hrefLabel: 'View Vendors',
  },
  {
    icon: <Store className="h-10 w-10 text-orange-500" />,
    title: 'You\'re Ready to Go!',
    description:
      'Complete the setup checklist below to finish configuring your account. Then upgrade your plan when you\'re ready to go live — all your data carries over automatically.',
    href: '/dashboard/billing',
    hrefLabel: 'View Plans & Upgrade',
    badge: 'Complete setup below ↓',
  },
]

export default function DemoTour() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    // Show automatically if never dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed) {
      // Small delay so the dashboard renders first
      const t = setTimeout(() => setOpen(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    // Expose a global opener so a "Take the tour" link can reopen it
    ;(window as any).__openDemoTour = () => {
      setStep(0)
      setOpen(true)
    }
    return () => {
      delete (window as any).__openDemoTour
    }
  }, [])

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1')
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

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close tour"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress dots */}
        <div className="absolute top-4 left-0 right-0 flex justify-center gap-1.5 px-14">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-indigo-600' : 'w-1.5 bg-gray-200'
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-8 pt-14 pb-8 text-center">
          <div className="flex justify-center mb-5">
            <div className="bg-gray-50 p-4 rounded-2xl">
              {current.icon}
            </div>
          </div>

          {current.badge && (
            <span className="inline-block mb-3 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
              {current.badge}
            </span>
          )}

          <h2 className="text-xl font-bold text-gray-900 mb-3">{current.title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed">{current.description}</p>

          {current.href && (
            <a
              href={current.href}
              onClick={dismiss}
              className="inline-block mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
            >
              {current.hrefLabel} →
            </a>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-8 pb-7 gap-3">
          <button
            onClick={prev}
            disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          <span className="text-xs text-gray-400">
            {step + 1} / {STEPS.length}
          </span>

          <button
            onClick={next}
            className="flex items-center gap-1 px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            {isLast ? 'Get Started' : 'Next'}
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
