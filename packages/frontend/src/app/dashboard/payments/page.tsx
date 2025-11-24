'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Invoice, InvoiceStatus } from '@/types'
import { DollarSign, TrendingUp, TrendingDown, Clock, CreditCard, FileText } from 'lucide-react'

interface PaymentStats {
  totalReceived: number
  totalPending: number
  totalOverdue: number
  thisMonth: number
}

export default function PaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<PaymentStats>({
    totalReceived: 0,
    totalPending: 0,
    totalOverdue: 0,
    thisMonth: 0
  })
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const params = user?.role === 'owner' ? { ownerId: user.id } : {}
      const response = await api.get<Invoice[]>('/invoices', { params })
      const invoiceData = response.data

      setInvoices(invoiceData)
      calculateStats(invoiceData)
    } catch (error) {
      console.error('Failed to fetch payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (invoiceData: Invoice[]) => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const stats = invoiceData.reduce((acc, invoice) => {
      const amountPaid = Number(invoice.amountPaid)
      const amountDue = Number(invoice.amountDue)

      // Total received
      if (invoice.status === InvoiceStatus.PAID) {
        acc.totalReceived += Number(invoice.totalAmount)
      } else {
        acc.totalReceived += amountPaid
      }

      // Total pending
      if (invoice.status === InvoiceStatus.SENT || invoice.status === InvoiceStatus.DRAFT) {
        acc.totalPending += amountDue
      }

      // Total overdue
      if (invoice.status === InvoiceStatus.OVERDUE) {
        acc.totalOverdue += amountDue
      }

      // This month
      const issueDate = new Date(invoice.issueDate)
      if (issueDate.getMonth() === currentMonth && issueDate.getFullYear() === currentYear) {
        acc.thisMonth += amountPaid
      }

      return acc
    }, {
      totalReceived: 0,
      totalPending: 0,
      totalOverdue: 0,
      thisMonth: 0
    })

    setStats(stats)
  }

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID:
        return 'bg-green-100 text-green-800'
      case InvoiceStatus.SENT:
        return 'bg-blue-100 text-blue-800'
      case InvoiceStatus.OVERDUE:
        return 'bg-red-100 text-red-800'
      case InvoiceStatus.DRAFT:
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading payment data...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-600 mt-1">Track and manage all payment transactions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Received</p>
              <p className="text-2xl font-bold text-green-600">
                ${stats.totalReceived.toFixed(2)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-blue-600">
                ${stats.totalPending.toFixed(2)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Overdue</p>
              <p className="text-2xl font-bold text-red-600">
                ${stats.totalOverdue.toFixed(2)}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">This Month</p>
              <p className="text-2xl font-bold text-purple-600">
                ${stats.thisMonth.toFixed(2)}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Payments Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount Due
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No payment records found
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.booking?.user
                        ? `${invoice.booking.user.firstName} ${invoice.booking.user.lastName}`
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.issueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      ${Number(invoice.totalAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      ${Number(invoice.amountPaid).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                      ${Number(invoice.amountDue).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          invoice.status
                        )}`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                      >
                        <FileText className="h-5 w-5 inline" />
                      </button>
                      {invoice.status !== InvoiceStatus.PAID && Number(invoice.amountDue) > 0 && (
                        <button
                          onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                          className="text-green-600 hover:text-green-900"
                          title="Record Payment"
                        >
                          <CreditCard className="h-5 w-5 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/dashboard/invoices/new')}
            className="flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-3 rounded-md hover:bg-primary-700"
          >
            <FileText className="h-5 w-5" />
            Create New Invoice
          </button>
          <button
            onClick={() => router.push('/dashboard/invoices')}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700"
          >
            <DollarSign className="h-5 w-5" />
            View All Invoices
          </button>
          <button
            onClick={() => {
              const csv = generateCSV()
              downloadCSV(csv, 'payments-export.csv')
            }}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700"
          >
            <TrendingUp className="h-5 w-5" />
            Export Report
          </button>
        </div>
      </div>
    </div>
  )

  function generateCSV(): string {
    const headers = ['Invoice Number', 'Customer', 'Issue Date', 'Total Amount', 'Amount Paid', 'Amount Due', 'Status']
    const rows = invoices.map(inv => [
      inv.invoiceNumber,
      inv.booking?.user ? `${inv.booking.user.firstName} ${inv.booking.user.lastName}` : 'N/A',
      new Date(inv.issueDate).toLocaleDateString(),
      Number(inv.totalAmount).toFixed(2),
      Number(inv.amountPaid).toFixed(2),
      Number(inv.amountDue).toFixed(2),
      inv.status
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  function downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }
}
