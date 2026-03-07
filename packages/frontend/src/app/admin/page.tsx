'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Building2,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  ArrowRight,
  UserPlus,
  Gift
} from 'lucide-react'

interface DashboardStats {
  totalOwners: number
  activeOwners: number
  totalClients: number
  totalEvents: number
  totalBookings: number
  totalRevenue: number
  activeTrials: number
  recentLogins: number
  newOwnersThisMonth: number
  newClientsThisMonth: number
}

interface RecentOwner {
  id: string
  email: string
  first_name: string
  last_name: string
  created_at: string
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOwners: 0,
    activeOwners: 0,
    totalClients: 0,
    totalEvents: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeTrials: 0,
    recentLogins: 0,
    newOwnersThisMonth: 0,
    newClientsThisMonth: 0
  })
  const [recentOwners, setRecentOwners] = useState<RecentOwner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const supabase = createClient()
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      // Fetch owners count
      const { data: ownersData, count: ownersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('role', 'owner')

      // New owners this month
      const { count: newOwnersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'owner')
        .gte('created_at', startOfMonth)

      // Fetch clients count
      const { count: clientsCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer')

      // New clients this month
      const { count: newClientsCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer')
        .gte('created_at', startOfMonth)

      // Fetch events count
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })

      // Fetch bookings count
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })

      // Fetch recent owners
      const { data: recentOwnersData } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, created_at')
        .eq('role', 'owner')
        .order('created_at', { ascending: false })
        .limit(5)

      // Calculate revenue from invoices
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('status', 'paid')

      const totalRevenue = invoicesData?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0

      // Fetch active trials (owners with trial status)
      const { count: trialsCount } = await supabase
        .from('owners')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'trialing')

      setStats({
        totalOwners: ownersCount || 0,
        activeOwners: ownersData?.length || 0,
        totalClients: clientsCount || 0,
        totalEvents: eventsCount || 0,
        totalBookings: bookingsCount || 0,
        totalRevenue,
        activeTrials: trialsCount || 0,
        recentLogins: 0,
        newOwnersThisMonth: newOwnersCount || 0,
        newClientsThisMonth: newClientsCount || 0
      })

      setRecentOwners(recentOwnersData || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of DoVenue Suite platform metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Owners */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            {stats.newOwnersThisMonth > 0 && (
              <span className="flex items-center text-sm text-green-600 font-medium">
                <TrendingUp className="h-4 w-4 mr-1" />
                +{stats.newOwnersThisMonth} this month
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalOwners}</p>
          <p className="text-sm text-gray-600 mt-1">Total Owners</p>
          <Link href="/admin/owners" className="text-blue-600 text-sm font-medium mt-3 inline-flex items-center hover:underline">
            View all <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        {/* Clients */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            {stats.newClientsThisMonth > 0 && (
              <span className="flex items-center text-sm text-green-600 font-medium">
                <TrendingUp className="h-4 w-4 mr-1" />
                +{stats.newClientsThisMonth} this month
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalClients}</p>
          <p className="text-sm text-gray-600 mt-1">Total Clients</p>
          <Link href="/admin/clients" className="text-green-600 text-sm font-medium mt-3 inline-flex items-center hover:underline">
            View all <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        {/* Events */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalEvents}</p>
          <p className="text-sm text-gray-600 mt-1">Total Events</p>
          <Link href="/admin/events" className="text-purple-600 text-sm font-medium mt-3 inline-flex items-center hover:underline">
            View all <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-600 mt-1">Total Revenue</p>
          <Link href="/admin/revenue" className="text-yellow-600 text-sm font-medium mt-3 inline-flex items-center hover:underline">
            View details <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Active Trials */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Active Trials</p>
              <p className="text-4xl font-bold mt-2">{stats.activeTrials}</p>
            </div>
            <Gift className="h-12 w-12 text-orange-200" />
          </div>
          <Link href="/admin/trials" className="text-white text-sm font-medium mt-4 inline-flex items-center hover:underline">
            Manage trials <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        {/* Total Bookings */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Total Bookings</p>
              <p className="text-4xl font-bold mt-2">{stats.totalBookings}</p>
            </div>
            <Calendar className="h-12 w-12 text-indigo-200" />
          </div>
          <Link href="/admin/bookings" className="text-white text-sm font-medium mt-4 inline-flex items-center hover:underline">
            View bookings <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        {/* User Activity */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Active Today</p>
              <p className="text-4xl font-bold mt-2">{stats.recentLogins}</p>
            </div>
            <Activity className="h-12 w-12 text-emerald-200" />
          </div>
          <Link href="/admin/activity" className="text-white text-sm font-medium mt-4 inline-flex items-center hover:underline">
            View activity <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>

      {/* Recent Owners Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Owners</h2>
          <Link href="/admin/owners" className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOwners.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No owners found
                  </td>
                </tr>
              ) : (
                recentOwners.map((owner) => (
                  <tr key={owner.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {owner.first_name?.[0]}{owner.last_name?.[0]}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {owner.first_name} {owner.last_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {owner.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(owner.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/admin/owners/${owner.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
