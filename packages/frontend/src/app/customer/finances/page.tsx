'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Invoice, InvoiceStatus } from '@/types'
import { 
  DollarSign, 
  CreditCard, 
  FileText, 
  Download, 
  Eye, 
  CheckCircle, 
  AlertCircle,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronRight,
  Filter,
  Receipt
} from 'lucide-react'

interface PaymentHistory {
  id: string
  date: string
  amount: number
  method: string
  invoiceNumber: string
  status: 'completed' | 'pending' | 'failed'
  description: string
}

type TabType = 'overview' | 'invoices' | 'payments'

export default function CustomerFinancesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<PaymentHistory[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  useEffect(() => {
    fetchFinancialData()
  }, [])

  const fetchFinancialData = async () => {
    try {
      const response = await api.get<Invoice[]>('/invoices')
      setInvoices(response.data || [])
      
      // Generate payment history from invoices
      const paymentsList: PaymentHistory[] = (response.data || [])
        .filter((inv: Invoice) => Number(inv.amount_paid || 0) > 0)
        .map((inv: Invoice) => ({
          id: `payment-${inv.id}`,
          date: inv.paid_date || inv.updated_at || inv.created_at,
          amount: Number(inv.amount_paid || 0),
          method: 'Credit Card',
          invoiceNumber: inv.invoice_number,
          status: inv.status === InvoiceStatus.PAID ? 'completed' as const : 'pending' as const,
          description: `Payment for Invoice #${inv.invoice_number}`
        }))
      setPayments(paymentsList)
    } catch (error) {
      console.error('Failed to fetch financial data:', error)
      // Set mock data for demo
      setInvoices([
        {
          id: '1',
          invoice_number: 'INV-2024-001',
          status: InvoiceStatus.PAID,
          issue_date: '2024-01-15',
          due_date: '2024-02-15',
          total_amount: 3500,
          amount_paid: 3500,
          amount_due: 0,
          paid_date: '2024-01-20',
          created_at: '2024-01-15',
          updated_at: '2024-01-20'
        },
        {
          id: '2',
          invoice_number: 'INV-2024-002',
          status: InvoiceStatus.SENT,
          issue_date: '2024-02-01',
          due_date: '2024-03-01',
          total_amount: 5000,
          amount_paid: 2000,
          amount_due: 3000,
          created_at: '2024-02-01',
          updated_at: '2024-02-01'
        },
        {
          id: '3',
          invoice_number: 'INV-2024-003',
          status: InvoiceStatus.OVERDUE,
          issue_date: '2024-01-01',
          due_date: '2024-01-15',
          total_amount: 1500,
          amount_paid: 0,
          amount_due: 1500,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ] as Invoice[])
      
      setPayments([
        {
          id: 'p1',
          date: '2024-01-20',
          amount: 3500,
          method: 'Credit Card ****4242',
          invoiceNumber: 'INV-2024-001',
          status: 'completed',
          description: 'Full payment for Wedding Reception deposit'
        },
        {
          id: 'p2',
          date: '2024-02-05',
          amount: 2000,
          method: 'Credit Card ****4242',
          invoiceNumber: 'INV-2024-002',
          status: 'completed',
          description: 'Partial payment for Birthday Party booking'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  // Calculate financial metrics
  const metrics = {
    totalInvoiced: invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0),
    totalPaid: invoices.reduce((sum, inv) => sum + Number(inv.amount_paid || 0), 0),
    totalDue: invoices.reduce((sum, inv) => sum + Number(inv.amount_due || 0), 0),
    overdueAmount: invoices
      .filter(inv => inv.status === InvoiceStatus.OVERDUE)
      .reduce((sum, inv) => sum + Number(inv.amount_due || 0), 0),
    pendingInvoices: invoices.filter(inv => 
      inv.status === InvoiceStatus.SENT || inv.status === InvoiceStatus.OVERDUE
    ).length,
    paidInvoices: invoices.filter(inv => inv.status === InvoiceStatus.PAID).length
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusStyle = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID: return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle }
      case InvoiceStatus.SENT: return { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock }
      case InvoiceStatus.OVERDUE: return { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle }
      case InvoiceStatus.DRAFT: return { bg: 'bg-gray-100', text: 'text-gray-700', icon: FileText }
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', icon: FileText }
    }
  }

  const getPaymentStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': return { bg: 'bg-green-100', text: 'text-green-700' }
      case 'pending': return { bg: 'bg-yellow-100', text: 'text-yellow-700' }
      case 'failed': return { bg: 'bg-red-100', text: 'text-red-700' }
      default: return { bg: 'bg-gray-100', text: 'text-gray-700' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices & Payments</h1>
          <p className="text-gray-500 mt-1">Manage your billing and payment history</p>
        </div>
        {metrics.totalDue > 0 && (
          <button
            className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Pay Balance ({formatCurrency(metrics.totalDue)})
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1.5 inline-flex">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'invoices', label: 'Invoices', icon: FileText },
          { id: 'payments', label: 'Payment History', icon: Receipt }
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Invoiced</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(metrics.totalInvoiced)}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-xl">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(metrics.totalPaid)}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Balance Due</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">{formatCurrency(metrics.totalDue)}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-xl">
                  <DollarSign className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Overdue</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(metrics.overdueAmount)}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Progress */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Progress</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount Paid</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(metrics.totalPaid)} of {formatCurrency(metrics.totalInvoiced)}
                </span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all"
                  style={{ width: `${metrics.totalInvoiced > 0 ? (metrics.totalPaid / metrics.totalInvoiced) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{Math.round(metrics.totalInvoiced > 0 ? (metrics.totalPaid / metrics.totalInvoiced) * 100 : 0)}% paid</span>
                <span>{formatCurrency(metrics.totalDue)} remaining</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pending Invoices */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Pending Invoices</h3>
                <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                  {metrics.pendingInvoices} pending
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {invoices.filter(inv => inv.status === InvoiceStatus.SENT || inv.status === InvoiceStatus.OVERDUE).slice(0, 3).map(invoice => {
                  const status = getStatusStyle(invoice.status)
                  const StatusIcon = status.icon
                  return (
                    <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${status.bg}`}>
                          <StatusIcon className={`w-4 h-4 ${status.text}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                          <p className="text-sm text-gray-500">Due: {formatDate(invoice.due_date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(Number(invoice.amount_due || 0))}</p>
                        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                          Pay Now
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              {metrics.pendingInvoices > 3 && (
                <button
                  onClick={() => setActiveTab('invoices')}
                  className="w-full p-3 text-sm text-primary-600 hover:bg-gray-50 font-medium flex items-center justify-center gap-1"
                >
                  View all invoices <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Recent Payments */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Recent Payments</h3>
                <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  {payments.length} payments
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {payments.slice(0, 3).map(payment => {
                  const status = getPaymentStatusStyle(payment.status)
                  return (
                    <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100">
                          <CreditCard className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{payment.method}</p>
                          <p className="text-sm text-gray-500">{formatDate(payment.date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">+{formatCurrency(payment.amount)}</p>
                        <span className={`text-xs font-medium ${status.text}`}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
              {payments.length > 3 && (
                <button
                  onClick={() => setActiveTab('payments')}
                  className="w-full p-3 text-sm text-primary-600 hover:bg-gray-50 font-medium flex items-center justify-center gap-1"
                >
                  View all payments <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">All Invoices</h3>
            <span className="text-sm text-gray-500">{invoices.length} total</span>
          </div>
          
          {invoices.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-gray-900 font-medium mb-2">No invoices yet</h3>
              <p className="text-gray-500 text-sm">Invoices will appear here once created.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => {
                    const status = getStatusStyle(invoice.status)
                    const StatusIcon = status.icon
                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-gray-900">{invoice.invoice_number}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(invoice.issue_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(invoice.due_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {formatCurrency(Number(invoice.total_amount || 0))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          {formatCurrency(Number(invoice.amount_paid || 0))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                          {formatCurrency(Number(invoice.amount_due || 0))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedInvoice(invoice)}
                              className="text-primary-600 hover:text-primary-700 font-medium"
                            >
                              View
                            </button>
                            {invoice.status !== InvoiceStatus.PAID && (
                              <button className="text-green-600 hover:text-green-700 font-medium">
                                Pay
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Payment History</h3>
            <span className="text-sm text-gray-500">{payments.length} payments</span>
          </div>
          
          {payments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-gray-900 font-medium mb-2">No payments yet</h3>
              <p className="text-gray-500 text-sm">Your payment history will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {payments.map((payment) => {
                const status = getPaymentStatusStyle(payment.status)
                return (
                  <div key={payment.id} className="p-5 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-green-100">
                        <ArrowDownRight className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{payment.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-500">{payment.method}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-sm text-gray-500">{formatDate(payment.date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-600">+{formatCurrency(payment.amount)}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setSelectedInvoice(null)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedInvoice.invoice_number}</h2>
                    <p className="text-gray-500 mt-1">Issued on {formatDate(selectedInvoice.issue_date)}</p>
                  </div>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  {(() => {
                    const status = getStatusStyle(selectedInvoice.status)
                    const StatusIcon = status.icon
                    return (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}>
                        <StatusIcon className="w-4 h-4 mr-1" />
                        {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                      </span>
                    )
                  })()}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Due Date</span>
                  <span className="font-medium text-gray-900">{formatDate(selectedInvoice.due_date)}</span>
                </div>
                
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="font-medium text-gray-900">{formatCurrency(Number(selectedInvoice.total_amount || 0))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Amount Paid</span>
                    <span className="font-medium text-green-600">{formatCurrency(Number(selectedInvoice.amount_paid || 0))}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className="font-semibold text-gray-900">Balance Due</span>
                    <span className="text-xl font-bold text-primary-600">{formatCurrency(Number(selectedInvoice.amount_due || 0))}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                  <Download className="w-5 h-5 mr-2" />
                  Download PDF
                </button>
                {selectedInvoice.status !== InvoiceStatus.PAID && (
                  <button className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Pay Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
