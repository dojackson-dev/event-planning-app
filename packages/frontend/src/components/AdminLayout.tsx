'use client'

import { ReactNode, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AdminProvider, useAdmin } from '@/contexts/AdminContext'
import {
  LayoutDashboard,
  Users,
  UserCircle,
  DollarSign,
  Gift,
  Activity,
  Settings,
  LogOut,
  Shield,
  Building2,
  Calendar,
  FileText,
  BarChart3
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Owners', href: '/admin/owners', icon: Building2 },
  { name: 'Clients', href: '/admin/clients', icon: Users },
  { name: 'All Events', href: '/admin/events', icon: Calendar },
  { name: 'All Bookings', href: '/admin/bookings', icon: FileText },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Revenue', href: '/admin/revenue', icon: DollarSign },
  { name: 'Free Trials', href: '/admin/trials', icon: Gift },
  { name: 'User Activity', href: '/admin/activity', icon: Activity },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

// AUTH BYPASS: Set to false to re-enable admin authentication
const BYPASS_ADMIN_AUTH = true

function AdminLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { session, loading, logout, isAuthenticated } = useAdmin()

  useEffect(() => {
    // Skip redirect when auth is bypassed
    if (BYPASS_ADMIN_AUTH) return
    
    if (!loading && !isAuthenticated) {
      router.push('/admin-login')
    }
  }, [loading, isAuthenticated, router])

  // Skip loading state when bypassed
  if (!BYPASS_ADMIN_AUTH && loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!BYPASS_ADMIN_AUTH && !isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 shadow-xl">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <div className="p-2 bg-red-600 rounded-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Admin Portal</h1>
            <p className="text-xs text-gray-400">EventEcos</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-5 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/admin' && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-red-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User info & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
              <UserCircle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                Admin
              </p>
              <p className="text-xs text-gray-400 truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="min-h-screen">
          {children}
        </main>
        <footer className="bg-gray-900 border-t border-gray-800 py-8 px-4">
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
  )
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminProvider>
  )
}
