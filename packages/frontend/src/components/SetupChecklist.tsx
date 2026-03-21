'use client'

/**
 * SetupChecklist
 * Shown on the owner dashboard until all onboarding steps are complete.
 * Fetches venue, service-items, and branding state, then renders a
 * dismissible checklist card.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Rocket } from 'lucide-react'

interface CheckItem {
  id: string
  label: string
  description: string
  done: boolean
  href: string
  linkLabel: string
}

export default function SetupChecklist() {
  const [items, setItems] = useState<CheckItem[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [venueRes, itemsRes, profileRes] = await Promise.allSettled([
          api.get('/owner/venue'),
          api.get('/service-items'),
          api.get('/owner/profile'),
        ])

        const venue = venueRes.status === 'fulfilled' ? venueRes.value.data?.venue : null
        const serviceItems = itemsRes.status === 'fulfilled' ? itemsRes.value.data : []
        const profile = profileRes.status === 'fulfilled' ? profileRes.value.data : null

        const venueComplete =
          !!venue?.name && !!venue?.city && !!venue?.state && !!venue?.address

        const businessNameSet = !!(profile?.businessName && profile.businessName.trim())

        const serviceItemsAdded =
          Array.isArray(serviceItems) && serviceItems.length > 0

        setItems([
          {
            id: 'business_name',
            label: 'Set your business name',
            description: 'Add your venue or business name so it appears across the platform.',
            done: businessNameSet,
            href: '/dashboard/settings?tab=branding',
            linkLabel: 'Go to Branding',
          },
          {
            id: 'venue',
            label: 'Complete your venue info',
            description: 'Add your venue address, city, and state so clients can find you.',
            done: venueComplete,
            href: '/dashboard/settings?tab=venue',
            linkLabel: 'Go to Venue Settings',
          },
          {
            id: 'service_items',
            label: 'Add at least one service or package',
            description: 'Create the services you offer so you can add them to invoices and bookings.',
            done: serviceItemsAdded,
            href: '/dashboard/items',
            linkLabel: 'Add Service Items',
          },
        ])
      } catch (err) {
        console.error('SetupChecklist error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return null

  const doneCount = items.filter(i => i.done).length
  const allDone = doneCount === items.length

  // Hide completely once everything is done
  if (allDone) return null

  const progressPct = Math.round((doneCount / items.length) * 100)

  return (
    <div className="mb-6 bg-white border border-amber-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-5 py-4 bg-amber-50 hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-amber-400 text-white p-1.5 rounded-lg">
            <Rocket className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">
              Finish setting up your account
            </p>
            <p className="text-xs text-gray-500">
              {doneCount} of {items.length} steps complete
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-28 h-2 bg-amber-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-amber-700">{progressPct}%</span>
          </div>
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>

      {/* Checklist items */}
      {!collapsed && (
        <div className="divide-y divide-gray-100">
          {items.map(item => (
            <div
              key={item.id}
              className={`flex items-start gap-4 px-5 py-4 ${item.done ? 'opacity-60' : ''}`}
            >
              {item.done ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {item.label}
                </p>
                {!item.done && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                )}
              </div>
              {!item.done && (
                <Link
                  href={item.href}
                  className="flex-shrink-0 text-xs font-semibold text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  {item.linkLabel} →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
