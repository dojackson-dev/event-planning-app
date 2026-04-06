'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useClientAuth } from '@/contexts/ClientAuthContext'
import {
  LayoutDashboard,
  Calendar,
  Store,
  FileText,
  MessageSquare,
  Receipt,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import { ClientAuthProvider } from '@/contexts/ClientAuthContext'

const navItems = [
  { name: 'Overview',      href: '/client-portal',               icon: LayoutDashboard },
  { name: 'Invoices',      href: '/client-portal/invoices',      icon: Receipt },
  { name: 'My Events',     href: '/client-portal/events',        icon: Calendar },
  { name: 'Contracts',     href: '/client-portal/contracts',     icon: FileText },
  { name: 'Estimates',     href: '/client-portal/estimates',     icon: FileText },
  { name: 'Vendors',       href: '/client-portal/vendors',       icon: Store },
  { name: 'Messages',      href: '/client-portal/messages',      icon: MessageSquare },
  { name: 'Notifications', href: '/client-portal/notifications', icon: Bell },
]

function ClientPortalLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { client, isClientAuthenticated, loading, clientLogout } = useClientAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!loading && !isClientAuthenticated) {
      router.push('/client-login')
    }
  }, [loading, isClientAuthenticated, router])

  if (loading || !isClientAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const initials = `${client?.firstName?.[0] ?? ''}${client?.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img src="/lib/LogoDVS.png" alt="DoVenueSuite" style={{ height: '40px', width: 'auto' }} />
          <span className="text-primary-600 text-[10px] font-semibold tracking-widest uppercase">ClientSuite</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg flex flex-col transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="hidden lg:flex flex-col items-center justify-center h-20 px-4 bg-primary-600 gap-1">
          <img src="/lib/LogoDVS.png" alt="DoVenueSuite" style={{ height: '48px', width: 'auto' }} />
          <span className="text-white/60 text-[10px] font-semibold tracking-widest uppercase">ClientSuite</span>
        </div>

        {/* Client info */}
        <div className="p-4 border-b mt-16 lg:mt-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
              {initials || 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {client?.firstName} {client?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{client?.phone}</p>
              <span className="inline-block mt-0.5 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                Client
              </span>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                {item.name}
                {isActive && <ChevronRight className="ml-auto h-4 w-4 text-primary-400" />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t">
          <button
            onClick={clientLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="h-5 w-5 text-gray-400" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientAuthProvider>
      <ClientPortalLayoutInner>{children}</ClientPortalLayoutInner>
    </ClientAuthProvider>
  )
}
