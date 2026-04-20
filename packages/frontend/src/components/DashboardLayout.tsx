'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { OwnerBrandProvider, useOwnerBrand } from '@/contexts/OwnerBrandContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { VenueProvider, useVenue } from '@/contexts/VenueContext'
import NotificationPanel from '@/components/NotificationPanel'
import RoleSwitcher from '@/components/RoleSwitcher'
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
  Receipt,
  Settings,
  ChevronDown,
  Store,
  CreditCard,
  Building2,
  Check,
  Megaphone,
  Music,
} from 'lucide-react'

function getInitials(name: string): string {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map(w => w[0].toUpperCase())
    .join('')
}

function BrandLogo({ variant }: { variant: 'sidebar' | 'mobile' }) {
  const { logoUrl, businessName, loading } = useOwnerBrand()
  const initials = getInitials(businessName)

  if (variant === 'sidebar') {
    return (
      <div className="hidden lg:flex items-center justify-center h-20 px-4 pt-4 bg-primary-600">
        <div className="flex flex-col items-center gap-1 w-full">
          {logoUrl ? (
            <img src={logoUrl} alt={businessName || 'Logo'} className="max-h-12 max-w-[160px] w-auto object-contain" />
          ) : !loading && businessName ? (
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-2xl">
                {initials}
              </div>
              <p className="text-white/80 text-xs font-medium text-center truncate max-w-[160px]">{businessName}</p>
            </div>
          ) : (
            <img src="/lib/LogoDVS.png" alt="DoVenueSuite" style={{ height: '80px', width: 'auto' }} />
          )}
          <span className="text-white/60 text-[10px] font-semibold tracking-widest uppercase mt-0.5">OwnerSuite</span>
        </div>
      </div>
    )
  }

  // mobile variant — rendered on bg-primary-600 row
  return (
    <div className="flex items-center gap-2">
      {logoUrl ? (
        <img src={logoUrl} alt={businessName || 'Logo'} className="h-9 max-w-[140px] object-contain" />
      ) : businessName ? (
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {initials}
        </div>
      ) : (
        <img src="/lib/LogoDVS.png" alt="DoVenueSuite" style={{ height: '36px', width: 'auto' }} />
      )}
      <div className="flex flex-col leading-tight">
        {businessName && !logoUrl && <span className="font-bold text-white text-sm truncate max-w-[140px]">{businessName}</span>}
        <span className="text-white/70 text-[10px] font-semibold tracking-widest uppercase">OwnerSuite</span>
      </div>
    </div>
  )
}

function VenueSelectorWidget() {
  const { venues, activeVenue, setActiveVenue } = useVenue()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (venues.length === 0) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 bg-primary-700/40 rounded-lg text-white text-sm hover:bg-primary-700/60 transition-colors"
      >
        <Building2 className="h-4 w-4 flex-shrink-0 text-white/70" />
        <span className="flex-1 text-left truncate font-medium">
          {activeVenue ? activeVenue.name : 'All Venues'}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-white/70 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          <button
            onClick={() => { setActiveVenue(null); setOpen(false) }}
            className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left transition-colors ${
              !activeVenue ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="flex-1">All Venues</span>
            {!activeVenue && <Check className="h-3.5 w-3.5 text-primary-600 flex-shrink-0" />}
          </button>
          {venues.length > 1 && <div className="border-t border-gray-100" />}
          {venues.map(v => (
            <button
              key={v.id}
              onClick={() => { setActiveVenue(v); setOpen(false) }}
              className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left transition-colors ${
                activeVenue?.id === v.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="flex-1 truncate">{v.name}</span>
              {activeVenue?.id === v.id && <Check className="h-3.5 w-3.5 text-primary-600 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function VenueSelectorTopBar() {
  const { venues, activeVenue, setActiveVenue } = useVenue()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (venues.length < 2) return null

  return (
    <div className="relative mr-2" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors border border-gray-200"
      >
        <Building2 className="h-4 w-4 text-primary-600" />
        <span className="max-w-[160px] truncate">{activeVenue ? activeVenue.name : 'All Venues'}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">Switch Venue</p>
          <button
            onClick={() => { setActiveVenue(null); setOpen(false) }}
            className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left transition-colors ${
              !activeVenue ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="flex-1">All Venues</span>
            {!activeVenue && <Check className="h-3.5 w-3.5 text-primary-600 flex-shrink-0" />}
          </button>
          {venues.map(v => (
            <button
              key={v.id}
              onClick={() => { setActiveVenue(v); setOpen(false) }}
              className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left transition-colors ${
                activeVenue?.id === v.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="flex-1 truncate">{v.name}</span>
              {activeVenue?.id === v.id && <Check className="h-3.5 w-3.5 text-primary-600 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const ALL_NAV = [
  { name: 'Dashboard',      href: '/dashboard',              icon: LayoutDashboard, ownerOnly: false },
  { name: 'Calendar',       href: '/dashboard/calendar',     icon: Calendar,        ownerOnly: false },
  { name: 'Events',         href: '/dashboard/events',       icon: Calendar,        ownerOnly: false },
  { name: 'Clients',        href: '/dashboard/clients',      icon: Users,           ownerOnly: false },
  { name: 'Client Intake',  href: '/dashboard/intake',       icon: ClipboardList,   ownerOnly: false },
  { name: 'Items & Packages', href: '/dashboard/items',      icon: Package,         ownerOnly: false },
  { name: 'Invoices',       href: '/dashboard/invoices',     icon: Receipt,         ownerOnly: false },
  { name: 'Estimates',      href: '/dashboard/estimates',    icon: FileText,        ownerOnly: false },
  { name: 'Contracts',      href: '/dashboard/contracts',    icon: FileText,        ownerOnly: false },
  { name: 'Door Lists',     href: '/dashboard/door-lists',   icon: ListChecks,      ownerOnly: false },
  { name: 'Security',       href: '/dashboard/security',     icon: Shield,          ownerOnly: false },
  { name: 'Payments',       href: '/dashboard/payments',     icon: DollarSign,      ownerOnly: false },
  { name: 'Billing',        href: '/dashboard/billing',      icon: CreditCard,      ownerOnly: true  },
  { name: 'Messages',       href: '/dashboard/messages',     icon: MessageSquare,   ownerOnly: false },
  { name: 'Vendors',        href: '/dashboard/vendors',      icon: Store,           ownerOnly: false },
  { name: 'Vendor Invoices', href: '/dashboard/vendor-invoices', icon: Receipt,     ownerOnly: false },
  { name: 'Promoter',       href: '/dashboard/promoter',     icon: Megaphone,       ownerOnly: false },
  { name: 'Artists',        href: '/dashboard/artists',      icon: Music,           ownerOnly: false },
  { name: 'Team',           href: '/dashboard/team',         icon: Users,           ownerOnly: true  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout, activeRole } = useAuth()
  const isAssociate = activeRole === 'associate'
  const navigation = ALL_NAV.filter(item => !item.ownerOnly || !isAssociate)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Placeholder user for development when not logged in
  const displayUser = user || {
    firstName: 'Demo',
    lastName: 'Owner',
    email: 'owner@eventcenter.com',
    role: 'owner'
  }

  return (
    <NotificationProvider>
    <OwnerBrandProvider>
    <VenueProvider>
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50">
        {/* Row 1 — Logo */}
        <div className="flex items-center justify-center h-16 bg-primary-600 px-4">
          <BrandLogo variant="mobile" />
        </div>
        {/* Row 2 — Controls */}
        <div className="flex items-center justify-end h-12 bg-white border-b border-gray-200 px-4 gap-3">
          {/* Notification Bell - Mobile */}
          <NotificationPanel />
          {/* Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
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
          <BrandLogo variant="sidebar" />

          {/* User info */}
          <div className="p-4 border-b mt-16 lg:mt-0">
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg">
                {displayUser.firstName?.[0] || 'U'}{displayUser.lastName?.[0] || 'U'}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {displayUser.firstName || 'User'} {displayUser.lastName || ''}
                </p>
                <p className="text-xs text-gray-500">{displayUser.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded">
                  {displayUser.role}
                </span>
              </div>
            </div>
          </div>

          {/* Venue Selector */}
          <div className="px-4 py-3 bg-primary-600">
            <VenueSelectorWidget />
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

          {/* Role Switcher — only shown when user has multiple roles */}
          <RoleSwitcher variant="sidebar" />

          {/* Logout */}
          <div className="p-4 border-t space-y-1">
            <Link
              href="/dashboard/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <Settings className="mr-3 h-5 w-5" />
              Settings
            </Link>
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
      <div className="lg:pl-64 pt-28 lg:pt-0 min-h-screen">
        {/* Desktop Top Bar with Notifications */}
        <div className="hidden lg:flex items-center justify-end h-16 px-8 bg-white border-b border-gray-100 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {/* Venue Selector - Desktop */}
            <VenueSelectorTopBar />
            {/* Notification Bell - Desktop */}
            <NotificationPanel />
            
            {/* User Info - Desktop with Dropdown */}
            <div className="relative pl-3 border-l border-gray-200" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
              >
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {displayUser.firstName || 'User'} {displayUser.lastName || ''}
                  </p>
                  <p className="text-xs text-gray-500">{displayUser.role}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold">
                  {displayUser.firstName?.[0] || 'U'}{displayUser.lastName?.[0] || 'U'}
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      if (user) {
                        logout()
                      } else {
                        alert('Authentication disabled for development')
                      }
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    {user ? 'Logout' : 'Login (Dev)'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
    </VenueProvider>
    </OwnerBrandProvider>
    </NotificationProvider>
  )
}
