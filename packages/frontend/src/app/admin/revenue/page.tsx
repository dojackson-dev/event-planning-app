'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Users,
  ArrowUp,
  ArrowDown,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface RevenueData {
  totalRevenue: number
  monthlyRevenue: number
  activeSubscriptions: number
  cancelledSubscriptions: number
  revenueByMonth: { month: string; amount: number }[]
  recentPayments: {
    id: string
    owner_name: string
    amount: number
    status: string
    created_at: string
  }[]
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRevenue()
  }, [])

  const fetchRevenue = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return

      const res = await fetch(`${API_URL}/admin/revenue`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setData(data)
      return
    } catch (error) {
      console.error('Error fetching revenue:', error)
    } finally {
      setLoading(false)
    }
  }

  const _unused = async () => {
    try {
      const supabase = createClient()

      // Fetch owners with subscription info
      const { data: owners, error: ownersError } = await supabase
        .from('owners')
        .select(`
          id,
          subscription_status,
          created_at,
          users:user_id (
            first_name,
            last_name
          )
        `)

      if (ownersError) throw ownersError

      // Calculate subscription stats
      const activeSubscriptions = (owners || []).filter(
        o => o.subscription_status === 'active' || o.subscription_status === 'trialing'
      ).length
      const cancelledSubscriptions = (owners || []).filter(
        o => o.subscription_status === 'cancelled'
      ).length

      // Simulate revenue data (in real app, this would come from Stripe)
      const monthlyPrice = 29.99
      const totalRevenue = activeSubscriptions * monthlyPrice * 6 // Simulated 6 months avg
      const monthlyRevenue = activeSubscriptions * monthlyPrice

      // Generate monthly revenue for chart (simulated)
      const months = []
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthName = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        // Simulate growing revenue
        const baseAmount = (activeSubscriptions - Math.floor(i * 0.5)) * monthlyPrice
        months.push({ month: monthName, amount: Math.max(0, baseAmount) })
      }

      // Generate simulated recent payments
      const recentPayments = (owners || [])
        .filter(o => o.subscription_status === 'active')
        .slice(0, 10)
        .map((o: any, idx: number) => ({
          id: `pay_${idx}`,
          owner_name: `${o.users?.first_name || 'Unknown'} ${o.users?.last_name || 'Owner'}`,
          amount: monthlyPrice,
          status: 'succeeded',
          created_at: new Date(Date.now() - idx * 86400000 * 3).toISOString()
        }))

      setData({
        totalRevenue,
        monthlyRevenue,
        activeSubscriptions,
        cancelledSubscriptions,
        revenueByMonth: months,
        recentPayments
      })
    } catch (error) {
      console.error('Error fetching revenue:', error)
    } finally {
      setLoading(false)
    }
  }
  void _unused

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

  const SimpleBarChart = ({ data }: { data: { month: string; amount: number }[] }) => {
    const maxAmount = Math.max(...data.map(d => d.amount), 1)
    
    return (
      <div className="flex items-end justify-between gap-2 h-48">
        {data.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center flex-1">
            <span className="text-xs text-gray-600 mb-1">${item.amount.toFixed(0)}</span>
            <div 
              className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t transition-all duration-300"
              style={{ height: `${(item.amount / maxAmount) * 100}%`, minHeight: item.amount > 0 ? '8px' : '2px' }}
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
        <h1 className="text-3xl font-bold text-gray-900">Revenue</h1>
        <p className="text-gray-600 mt-1">Track platform revenue and subscriptions</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">${data.totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-600 mt-1">Total Revenue</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">${data.monthlyRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-600 mt-1">Monthly Recurring</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.activeSubscriptions}</p>
          <p className="text-sm text-gray-600 mt-1">Active Subscriptions</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.cancelledSubscriptions}</p>
          <p className="text-sm text-gray-600 mt-1">Cancelled</p>
        </div>
      </div>

      {/* Chart and Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue Over Time</h3>
          <SimpleBarChart data={data.revenueByMonth} />
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
            {data.recentPayments.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No recent payments
              </div>
            ) : (
              data.recentPayments.map((payment) => (
                <div key={payment.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{payment.owner_name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">${payment.amount.toFixed(2)}</p>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Subscription Breakdown */}
      <div className="mt-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Subscription Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-gray-400 text-sm">Churn Rate</p>
            <p className="text-2xl font-bold mt-1">
              {data.activeSubscriptions > 0 
                ? ((data.cancelledSubscriptions / (data.activeSubscriptions + data.cancelledSubscriptions)) * 100).toFixed(1)
                : 0
              }%
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">ARPU</p>
            <p className="text-2xl font-bold mt-1">$29.99</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">LTV (Est.)</p>
            <p className="text-2xl font-bold mt-1">$359.88</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Conversion Rate</p>
            <p className="text-2xl font-bold mt-1">
              {data.activeSubscriptions + data.cancelledSubscriptions > 0
                ? ((data.activeSubscriptions / (data.activeSubscriptions + data.cancelledSubscriptions)) * 100).toFixed(0)
                : 0
              }%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
