'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Megaphone, Home, Calendar, FileText, Users, Settings, Menu, X, LogOut, Mic2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import RoleSwitcher from '@/components/RoleSwitcher'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
}

export default function PromoterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/promoter/login')
    }
  }, [user, loading, router])

  const navItems: NavItem[] = [
    { href: '/dashboard/promoter', label: 'Dashboard', icon: <Home className="h-5 w-5" /> },
    { href: '/dashboard/promoter/events', label: 'Events', icon: <Calendar className="h-5 w-5" /> },
    { href: '/dashboard/promoter/artists', label: 'Book Artists', icon: <Mic2 className="h-5 w-5" /> },
    { href: '/dashboard/promoter/invoices', label: 'Invoices', icon: <FileText className="h-5 w-5" /> },
    { href: '/dashboard/promoter/bookings', label: 'Bookings', icon: <Users className="h-5 w-5" /> },
    { href: '/dashboard/promoter/profile', label: 'Profile', icon: <Settings className="h-5 w-5" /> },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static`}>
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200">
          <Link href="/dashboard/promoter" className="flex items-center gap-2 font-bold text-gray-900">
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <Megaphone className="h-5 w-5 text-purple-600" />
            </div>
            <span className="hidden sm:inline">Promoter</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <RoleSwitcher variant="sidebar" />
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  {item.label}
                </div>
                {item.badge && (
                  <span className="bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-4 py-4 border-t border-gray-200">
          <button
            onClick={() => {
              logout()
              setSidebarOpen(false)
            }}
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
        <div className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-gray-600 hidden sm:block">
                {user.firstName} {user.lastName}
              </span>
            )}
            <Link href="/dashboard/promoter/profile" className="text-sm text-gray-600 hover:text-gray-900">
              Account Settings
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
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
