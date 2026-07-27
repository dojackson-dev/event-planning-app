'use client'

/**
 * ClientPortalTour
 * Step-by-step feature walkthrough for the client portal, shown on first login.
 * Dismissed state stored in localStorage so it only appears once.
 * Can be reopened by calling window.__openClientPortalTour() (used for "Take a Tour" button).
 */

import { useEffect, useState, useCallback } from 'react'
import {
  LayoutDashboard,
  Receipt,
  Calendar,
  FileText,
  Store,
  MessageSquare,
  Bell,
  Rocket,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react'

const STORAGE_KEY = 'client_portal_tour_v1_dismissed'

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
    icon: <Rocket className="h-10 w-10 text-primary-500" />,
    title: 'Welcome to Your Client Portal!',
    description:
      'This is your personal portal where you can track everything related to your event — from invoices and contracts to vendors and notifications. Let\'s take a quick tour so you know exactly where to find everything.',
    badge: 'Quick Tour',
  },
  {
    icon: <LayoutDashboard className="h-10 w-10 text-blue-500" />,
    title: 'Your Overview Dashboard',
    description:
      'The overview is your home base. See your outstanding invoices, upcoming events, and quick links to every section of your portal — all at a glance every time you log in.',
    href: '/client-portal',
    hrefLabel: 'Go to Overview',
  },
  {
    icon: <Receipt className="h-10 w-10 text-emerald-500" />,
    title: 'Invoices & Payments',
    description:
      'View all invoices sent to you by your venue coordinator. You can see the amount due, due dates, and pay securely online with your credit or debit card — right from this portal.',
    href: '/client-portal/invoices',
    hrefLabel: 'View Invoices',
  },
  {
    icon: <Calendar className="h-10 w-10 text-violet-500" />,
    title: 'My Events',
    description:
      'Keep track of every event you have booked. See the event name, date, time, location, and current status — so you always know what\'s coming up and when.',
    href: '/client-portal/events',
    hrefLabel: 'View My Events',
  },
  {
    icon: <FileText className="h-10 w-10 text-rose-500" />,
    title: 'Contracts',
    description:
      'Review and e-sign your contracts anytime, from any device. Once your coordinator sends a contract, you\'ll see it here and can sign it with a digital signature — no printing required.',
    href: '/client-portal/contracts',
    hrefLabel: 'View Contracts',
  },
  {
    icon: <FileText className="h-10 w-10 text-amber-500" />,
    title: 'Estimates',
    description:
      'Your venue coordinator may send you estimates before finalizing costs. Review itemized pricing, totals, and any notes — then follow up with your coordinator if you have questions.',
    href: '/client-portal/estimates',
    hrefLabel: 'View Estimates',
  },
  {
    icon: <Store className="h-10 w-10 text-orange-500" />,
    title: 'Booked Vendors',
    description:
      'See all the vendors working your event — from photographers and caterers to DJs and florists. Click any vendor card to view their contact info and details.',
    href: '/client-portal/vendors',
    hrefLabel: 'View Vendors',
  },
  {
    icon: <MessageSquare className="h-10 w-10 text-teal-500" />,
    title: 'Messages',
    description:
      'Have a question for your event coordinator? Send a message directly from the portal. All communication is kept in one place so nothing gets lost in your inbox.',
    href: '/client-portal/messages',
    hrefLabel: 'Go to Messages',
  },
  {
    icon: <Bell className="h-10 w-10 text-indigo-500" />,
    title: 'Notifications',
    description:
      'Stay informed with real-time notifications. You\'ll be alerted when an event is coming up, an invoice is due, you receive an estimate, your contract is ready to sign, and much more.',
    href: '/client-portal/notifications',
    hrefLabel: 'View Notifications',
    badge: 'Stay in the loop!',
  },
]

export default function ClientPortalTour() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    // Show automatically if never dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed) {
      const t = setTimeout(() => setOpen(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    // Expose a global opener so the "Take a tour" button can reopen it
    ;(window as any).__openClientPortalTour = () => {
      setStep(0)
      setOpen(true)
    }
    return () => {
      delete (window as any).__openClientPortalTour
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
                i === step ? 'w-6 bg-primary-600' : 'w-1.5 bg-gray-200'
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
            <span className="inline-block mb-3 px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">
              {current.badge}
            </span>
          )}

          <h2 className="text-xl font-bold text-gray-900 mb-3">{current.title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed">{current.description}</p>

          {current.href && (
            <a
              href={current.href}
              onClick={dismiss}
              className="inline-block mt-4 text-xs font-semibold text-primary-600 hover:text-primary-800 underline underline-offset-2"
            >
              {current.hrefLabel} →
            </a>
          )}
        </div>

        {/* Navigation */}
        <div className="px-8 pb-6 flex items-center justify-between gap-4">
          <button
            onClick={prev}
            disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-0 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <span className="text-xs text-gray-400">
            {step + 1} / {STEPS.length}
          </span>

          <button
            onClick={next}
            className="flex items-center gap-1 px-5 py-2 text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors"
          >
            {isLast ? 'Get Started' : 'Next'}
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
