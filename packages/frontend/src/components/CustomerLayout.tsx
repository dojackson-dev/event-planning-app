'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Home,
  Calendar,
  Package, 
  MessageSquare, 
  DollarSign,
  FileText,
  LogOut,
  Menu,
  X,
  Bell,
  User,
  Settings,
  HelpCircle,
  Heart,
  ClipboardList,
  Star
} from 'lucide-react'

// Customer navigation items
const customerNavigation = [
  { name: 'Dashboard', href: '/customer', icon: Home, description: 'Overview of your account' },
  { name: 'My Events', href: '/customer/events', icon: Calendar, description: 'View your booked events' },
  { name: 'Browse Services', href: '/customer/services', icon: Package, description: 'Explore available services' },
  { name: 'Messages', href: '/customer/messages', icon: MessageSquare, description: 'Chat with the venue' },
  { name: 'Invoices & Payments', href: '/customer/finances', icon: DollarSign, description: 'Manage your payments' },
  { name: 'My Contracts', href: '/customer/contracts', icon: FileText, description: 'View and sign contracts' },
  { name: 'Request Booking', href: '/customer/book', icon: ClipboardList, description: 'Book a new event' },
]

const secondaryNavigation = [
  { name: 'Favorites', href: '/customer/favorites', icon: Heart },
  { name: 'Help & Support', href: '/customer/support', icon: HelpCircle },
  { name: 'Settings', href: '/customer/settings', icon: Settings },
]

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationCount] = useState(3) // Placeholder notification count

  // Placeholder user for development when not logged in
  const displayUser = user || {
    firstName: 'Guest',
    lastName: 'Customer',
    email: 'customer@example.com',
    role: 'customer'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 shadow-sm">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">DV</span>
            </div>
            <span className="font-semibold text-gray-900">DoVenue</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button className="relative p-2 rounded-full text-gray-600 hover:bg-gray-100">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
            
            {/* Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-full text-gray-600 hover:bg-gray-100"
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

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:w-72`}>
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="hidden lg:flex items-center justify-center h-20 bg-gradient-to-r from-primary-600 to-primary-700 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-bold">DV</span>
              </div>
              <span className="text-white font-bold text-xl">DoVenue</span>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="p-4 border-b bg-gradient-to-r from-primary-50 to-primary-100 mt-16 lg:mt-0">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                {displayUser.firstName?.[0] || 'U'}{displayUser.lastName?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {displayUser.firstName || 'User'} {displayUser.lastName || ''}
                </p>
                <p className="text-xs text-gray-600 truncate">{displayUser.email}</p>
                <span className="inline-flex items-center mt-1 px-2.5 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                  <Star className="w-3 h-3 mr-1" />
                  Customer
                </span>
              </div>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Main Menu
              </p>
              {customerNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-primary-600'}`} />
                    <span className="flex-1">{item.name}</span>
                    {item.name === 'Messages' && notificationCount > 0 && (
                      <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${
                        isActive ? 'bg-white text-primary-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {notificationCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Secondary Navigation */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                More
              </p>
              {secondaryNavigation.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gray-200 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    <span className="flex-1">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Quick Action Card */}
          <div className="p-4 border-t">
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-4 text-white">
              <h4 className="font-semibold mb-1">Need to plan an event?</h4>
              <p className="text-xs text-primary-100 mb-3">Book your next celebration with us!</p>
              <Link
                href="/customer/book"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2 px-4 bg-white text-primary-600 rounded-lg text-sm font-semibold hover:bg-primary-50 transition-colors"
              >
                Book Now
              </Link>
            </div>
          </div>

          {/* Logout */}
          <div className="p-4 border-t bg-gray-50">
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                if (user) {
                  logout()
                } else {
                  alert('Authentication disabled for development')
                }
              }}
              className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              {user ? 'Sign Out' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72 pt-16 lg:pt-0 min-h-screen">
        {/* Desktop Top Bar */}
        <div className="hidden lg:flex items-center justify-between h-16 px-8 bg-white border-b border-gray-200 sticky top-0 z-30">
          <div>
            <h2 className="text-sm text-gray-500">Welcome back,</h2>
            <p className="text-lg font-semibold text-gray-900">{displayUser.firstName || 'User'}</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Search Bar - Placeholder */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search services, events..."
                className="w-64 pl-10 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Notification Bell - Desktop */}
            <button className="relative p-2 rounded-full text-gray-600 hover:bg-gray-100 transition-colors">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
            
            {/* User Menu */}
            <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {displayUser.firstName || 'User'} {displayUser.lastName || ''}
                </p>
                <p className="text-xs text-gray-500">Customer</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold shadow-sm">
                {displayUser.firstName?.[0] || 'U'}{displayUser.lastName?.[0] || 'U'}
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
