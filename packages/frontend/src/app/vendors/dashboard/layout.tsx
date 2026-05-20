'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Store, Home, Calendar, CalendarDays, FileText, Star,
  DollarSign, Settings, Menu, X, LogOut, Receipt, ClipboardList,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import RoleSwitcher from '@/components/RoleSwitcher'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

export default function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/vendors/login')
    }
  }, [user, loading, router])

  const navItems: NavItem[] = [
    { href: '/vendors/dashboard',           label: 'Dashboard',  icon: <Home className="h-5 w-5" /> },
    { href: '/vendors/dashboard/bookings',  label: 'Bookings',   icon: <Calendar className="h-5 w-5" /> },
    { href: '/vendors/dashboard/invoices',  label: 'Invoices',   icon: <Receipt className="h-5 w-5" /> },
    { href: '/vendors/dashboard/contracts', label: 'Contracts',  icon: <ClipboardList className="h-5 w-5" /> },
    { href: '/vendors/dashboard/calendar',  label: 'Calendar',   icon: <CalendarDays className="h-5 w-5" /> },
    { href: '/vendors/dashboard/earnings',  label: 'Earnings',   icon: <DollarSign className="h-5 w-5" /> },
    { href: '/vendors/dashboard/payouts',   label: 'Payouts',    icon: <FileText className="h-5 w-5" /> },
    { href: '/vendors/dashboard/reviews',   label: 'Reviews',    icon: <Star className="h-5 w-5" /> },
    { href: '/vendors/dashboard/profile',   label: 'Profile',    icon: <Settings className="h-5 w-5" /> },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out z-50 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static`}>
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200 flex-shrink-0">
          <Link href="/vendors/dashboard" className="flex items-center gap-2 font-bold text-gray-900">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Store className="h-5 w-5 text-blue-600" />
            </div>
            <span>Vendor</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role switcher */}
        <RoleSwitcher variant="sidebar" />

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.href === '/vendors/dashboard'
              ? pathname === item.href
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Settings link + Logout */}
        <div className="px-4 py-4 border-t border-gray-200 space-y-1 flex-shrink-0">
          <Link
            href="/vendors/settings"
            className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
          <button
            onClick={() => { logout(); setSidebarOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-500 hover:text-gray-700 p-1"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
            <Store className="h-4 w-4 text-blue-600" />
            <span>Vendor Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-sm text-gray-600 hidden sm:block">
                {user.firstName || user.email}
              </span>
            )}
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
          <footer className="bg-gray-900 border-t border-gray-800 py-8 px-4 mt-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                <div className="flex flex-col items-center text-center">
                  <div className="inline-block bg-white rounded-xl p-2 mb-2">
                    <img src="/lib/EventEcos-Logo.jpg" alt="EventEcos" style={{ height: '60px', width: 'auto' }} />
                  </div>
                  <p className="text-gray-400 text-xs">The complete event management platform.</p>
                </div>
                <div>
                  <h4 className="text-white font-bold mb-3 text-sm">Product</h4>
                  <ul className="space-y-1 text-gray-400 text-xs">
                    <li><a href="/client-login" className="hover:text-white">Client Portal</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-white font-bold mb-3 text-sm">Legal</h4>
                  <ul className="space-y-1 text-gray-400 text-xs">
                    <li><a href="/privacy-policy" className="hover:text-white">Privacy</a></li>
                    <li><a href="/terms-of-service" className="hover:text-white">Terms</a></li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-gray-800 pt-6">
                <p className="text-center text-gray-400 text-xs">&copy; 2026 EventEcos. All rights reserved. Powering the Event Ecosystem.</p>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
