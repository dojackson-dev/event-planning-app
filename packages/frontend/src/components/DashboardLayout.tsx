'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Package, 
  FileText, 
  MessageSquare, 
  Shield, 
  ListChecks,
  DollarSign,
  LogOut,
  Menu,
  X,
  ClipboardList,
  Bell,
  Receipt
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Events', href: '/dashboard/events', icon: Calendar },
  { name: 'Bookings', href: '/dashboard/bookings', icon: Users },
  { name: 'Client Intake', href: '/dashboard/intake', icon: ClipboardList },
  { name: 'Items & Packages', href: '/dashboard/items', icon: Package },
  { name: 'Invoices', href: '/dashboard/invoices', icon: Receipt },
  { name: 'Contracts', href: '/dashboard/contracts', icon: FileText },
  { name: 'Door Lists', href: '/dashboard/door-lists', icon: ListChecks },
  { name: 'Security', href: '/dashboard/security', icon: Shield },
  { name: 'Payments', href: '/dashboard/payments', icon: DollarSign },
  { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationCount] = useState(5) // Placeholder notification count

  // Placeholder user for development when not logged in
  const displayUser = user || {
    firstName: 'Demo',
    lastName: 'Owner',
    email: 'owner@eventcenter.com',
    role: 'owner'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="flex items-center justify-between h-16 px-4 pt-2">
          <Image 
            src="/lib/LogoDVS.png" 
            alt="Event Center Logo" 
            width={320} 
            height={107}
            className="h-24 w-auto"
          />
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button className="relative p-2 rounded-md text-gray-600 hover:bg-gray-100">
              <Bell className="h-6 w-6" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full min-w-[18px]">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
            
            {/* Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar - Hidden on mobile by default, shows as drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:w-64`}>
        <div className="flex flex-col h-full">
          {/* Logo - Desktop Only */}
          <div className="hidden lg:flex items-center justify-center h-20 px-4 pt-4 bg-primary-600">
            <Image 
              src="/lib/LogoDVS.png" 
              alt="Event Center Logo" 
              width={400} 
              height={133}
              className="h-28 w-auto"
            />
          </div>

          {/* User info */}
          <div className="p-4 border-b mt-16 lg:mt-0">
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg">
                {displayUser.firstName[0]}{displayUser.lastName[0]}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {displayUser.firstName} {displayUser.lastName}
                </p>
                <p className="text-xs text-gray-500">{displayUser.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded">
                  {displayUser.role}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="flex-1">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                if (user) {
                  logout()
                } else {
                  alert('Authentication disabled for development')
                }
              }}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              {user ? 'Logout' : 'Login (Dev)'}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        {/* Desktop Top Bar with Notifications */}
        <div className="hidden lg:flex items-center justify-end h-16 px-8 bg-white border-b border-gray-100 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {/* Notification Bell - Desktop */}
            <button className="relative p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full min-w-[18px]">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
            
            {/* User Info - Desktop */}
            <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {displayUser.firstName} {displayUser.lastName}
                </p>
                <p className="text-xs text-gray-500">{displayUser.role}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold">
                {displayUser.firstName[0]}{displayUser.lastName[0]}
              </div>
            </div>
          </div>
        </div>
        
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
