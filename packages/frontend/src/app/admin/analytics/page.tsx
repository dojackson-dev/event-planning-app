'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart3,
  Users,
  Calendar,
  TrendingUp,
  DollarSign,
  Clock,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

interface AnalyticsData {
  totalOwners: number
  totalClients: number
  totalEvents: number
  totalBookings: number
  monthlyGrowth: {
    owners: number
    clients: number
    events: number
    bookings: number
  }
  ownersByMonth: { month: string; count: number }[]
  clientsByMonth: { month: string; count: number }[]
  eventsByMonth: { month: string; count: number }[]
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const supabase = createClient()

      // Fetch all data
      const [ownersRes, clientsRes, eventsRes, bookingsRes] = await Promise.all([
        supabase.from('owners').select('id, created_at'),
        supabase.from('clients').select('id, created_at'),
        supabase.from('events').select('id, created_at'),
        supabase.from('bookings').select('id, created_at')
      ])

      const owners = ownersRes.data || []
      const clients = clientsRes.data || []
      const events = eventsRes.data || []
      const bookings = bookingsRes.data || []

      // Calculate monthly data for last 6 months
      const getMonthlyData = (items: any[]) => {
        const months: { [key: string]: number } = {}
        const now = new Date()
        
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          months[key] = 0
        }

        items.forEach(item => {
          if (!item.created_at) return
          const d = new Date(item.created_at)
          const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          if (months[key] !== undefined) {
            months[key]++
          }
        })

        return Object.entries(months).map(([month, count]) => ({ month, count }))
      }

      // Calculate growth (compare this month to last month)
      const calcGrowth = (items: any[]) => {
        const now = new Date()
        const thisMonth = items.filter(item => {
          if (!item.created_at) return false
          const d = new Date(item.created_at)
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        }).length

        const lastMonth = items.filter(item => {
          if (!item.created_at) return false
          const d = new Date(item.created_at)
          const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear()
        }).length

        if (lastMonth === 0) return thisMonth > 0 ? 100 : 0
        return Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
      }

      setData({
        totalOwners: owners.length,
        totalClients: clients.length,
        totalEvents: events.length,
        totalBookings: bookings.length,
        monthlyGrowth: {
          owners: calcGrowth(owners),
          clients: calcGrowth(clients),
          events: calcGrowth(events),
          bookings: calcGrowth(bookings)
        },
        ownersByMonth: getMonthlyData(owners),
        clientsByMonth: getMonthlyData(clients),
        eventsByMonth: getMonthlyData(events)
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const StatCard = ({ 
    title, 
    value, 
    growth, 
    icon: Icon, 
    color 
  }: { 
    title: string
    value: number
    growth: number
    icon: any
    color: string 
  }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 ${color} rounded-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className={`flex items-center text-sm ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {growth >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          <span className="ml-1">{Math.abs(growth)}%</span>
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-600 mt-1">{title}</p>
    </div>
  )

  const SimpleBarChart = ({ 
    data, 
    color 
  }: { 
    data: { month: string; count: number }[]
    color: string 
  }) => {
    const maxCount = Math.max(...data.map(d => d.count), 1)
    
    return (
      <div className="flex items-end justify-between gap-2 h-40">
        {data.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center flex-1">
            <div 
              className={`w-full ${color} rounded-t transition-all duration-300`}
              style={{ height: `${(item.count / maxCount) * 100}%`, minHeight: item.count > 0 ? '8px' : '2px' }}
            />
            <span className="text-xs text-gray-500 mt-2">{item.month}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Platform performance and growth metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Owners" 
          value={data.totalOwners} 
          growth={data.monthlyGrowth.owners}
          icon={Users}
          color="bg-purple-500"
        />
        <StatCard 
          title="Total Clients" 
          value={data.totalClients} 
          growth={data.monthlyGrowth.clients}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard 
          title="Total Events" 
          value={data.totalEvents} 
          growth={data.monthlyGrowth.events}
          icon={Calendar}
          color="bg-green-500"
        />
        <StatCard 
          title="Total Bookings" 
          value={data.totalBookings} 
          growth={data.monthlyGrowth.bookings}
          icon={TrendingUp}
          color="bg-orange-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Owner Growth</h3>
          <SimpleBarChart data={data.ownersByMonth} color="bg-purple-500" />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Growth</h3>
          <SimpleBarChart data={data.clientsByMonth} color="bg-blue-500" />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Events Created</h3>
          <SimpleBarChart data={data.eventsByMonth} color="bg-green-500" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Platform Overview</h3>
          <p className="text-red-100 text-sm mb-4">Key platform statistics at a glance</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-red-200 text-xs">Avg Clients/Owner</p>
              <p className="text-2xl font-bold">
                {data.totalOwners > 0 ? (data.totalClients / data.totalOwners).toFixed(1) : 0}
              </p>
            </div>
            <div>
              <p className="text-red-200 text-xs">Avg Events/Owner</p>
              <p className="text-2xl font-bold">
                {data.totalOwners > 0 ? (data.totalEvents / data.totalOwners).toFixed(1) : 0}
              </p>
            </div>
            <div>
              <p className="text-red-200 text-xs">Avg Bookings/Event</p>
              <p className="text-2xl font-bold">
                {data.totalEvents > 0 ? (data.totalBookings / data.totalEvents).toFixed(1) : 0}
              </p>
            </div>
            <div>
              <p className="text-red-200 text-xs">Platform Active</p>
              <p className="text-2xl font-bold">
                {data.totalOwners + data.totalClients}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-gray-700 to-gray-800 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Growth Summary</h3>
          <p className="text-gray-300 text-sm mb-4">Month over month comparison</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Owner Growth</span>
              <span className={`font-semibold ${data.monthlyGrowth.owners >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.monthlyGrowth.owners >= 0 ? '+' : ''}{data.monthlyGrowth.owners}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Client Growth</span>
              <span className={`font-semibold ${data.monthlyGrowth.clients >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.monthlyGrowth.clients >= 0 ? '+' : ''}{data.monthlyGrowth.clients}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Event Growth</span>
              <span className={`font-semibold ${data.monthlyGrowth.events >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.monthlyGrowth.events >= 0 ? '+' : ''}{data.monthlyGrowth.events}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Booking Growth</span>
              <span className={`font-semibold ${data.monthlyGrowth.bookings >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.monthlyGrowth.bookings >= 0 ? '+' : ''}{data.monthlyGrowth.bookings}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
