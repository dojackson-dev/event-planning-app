'use client'

import { useState } from 'react'
import { Invoice, InvoiceStatus } from '@/types'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  FileText,
  Download,
  Eye,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Calendar
} from 'lucide-react'

interface ClientFinancialInfoProps {
  invoices: Invoice[]
  onViewInvoice: (invoiceId: string) => void
  onPayInvoice?: (invoiceId: string) => void
  className?: string
}

interface PaymentHistory {
  id: string
  date: string
  amount: number
  method: string
  invoiceNumber: string
  status: 'completed' | 'pending' | 'failed'
}

export default function ClientFinancialInfo({
  invoices,
  onViewInvoice,
  onPayInvoice,
  className = '',
}: ClientFinancialInfoProps) {
  const [activeView, setActiveView] = useState<'overview' | 'invoices' | 'history'>('overview')

  // Calculate financial metrics
  const metrics = {
    totalInvoiced: invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0),
    totalPaid: invoices.reduce((sum, inv) => sum + Number(inv.amount_paid || 0), 0),
    totalDue: invoices.reduce((sum, inv) => sum + Number(inv.amount_due || 0), 0),
    overdueAmount: invoices
      .filter(inv => inv.status === InvoiceStatus.OVERDUE)
      .reduce((sum, inv) => sum + Number(inv.amount_due || 0), 0),
    paidInvoices: invoices.filter(inv => inv.status === InvoiceStatus.PAID).length,
    pendingInvoices: invoices.filter(inv => 
      inv.status === InvoiceStatus.SENT || inv.status === InvoiceStatus.OVERDUE
    ).length,
    overdueInvoices: invoices.filter(inv => inv.status === InvoiceStatus.OVERDUE).length,
  }

  // Generate mock payment history from paid invoices
  const paymentHistory: PaymentHistory[] = invoices
    .filter(inv => Number(inv.amount_paid || 0) > 0)
    .map(inv => {
      const status: 'completed' | 'pending' | 'failed' = inv.status === InvoiceStatus.PAID ? 'completed' : 'pending'
      return {
        id: `payment-${inv.id}`,
        date: inv.paid_date || inv.updated_at || inv.created_at,
        amount: Number(inv.amount_paid || 0),
        method: 'Credit Card',
        invoiceNumber: inv.invoice_number,
        status,
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const getStatusBadge = (status: InvoiceStatus) => {
    const styles = {
      [InvoiceStatus.PAID]: 'bg-green-100 text-green-800',
      [InvoiceStatus.SENT]: 'bg-blue-100 text-blue-800',
      [InvoiceStatus.OVERDUE]: 'bg-red-100 text-red-800',
      [InvoiceStatus.DRAFT]: 'bg-gray-100 text-gray-800',
      [InvoiceStatus.CANCELLED]: 'bg-gray-100 text-gray-600',
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
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
      year: 'numeric',
    })
  }

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 px-4">
        <nav className="flex space-x-4">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'invoices', label: 'Invoices', icon: FileText },
            { id: 'history', label: 'Payment History', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-2 border-b-2 text-sm font-medium transition-colors ${
                  activeView === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="p-4">
        {/* Overview View */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-medium uppercase">Total Invoiced</p>
                    <p className="text-xl font-bold text-blue-900 mt-1">
                      {formatCurrency(metrics.totalInvoiced)}
                    </p>
                  </div>
                  <div className="bg-blue-200 p-2 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600 font-medium uppercase">Total Paid</p>
                    <p className="text-xl font-bold text-green-900 mt-1">
                      {formatCurrency(metrics.totalPaid)}
                    </p>
                  </div>
                  <div className="bg-green-200 p-2 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-yellow-600 font-medium uppercase">Balance Due</p>
                    <p className="text-xl font-bold text-yellow-900 mt-1">
                      {formatCurrency(metrics.totalDue)}
                    </p>
                  </div>
                  <div className="bg-yellow-200 p-2 rounded-lg">
                    <DollarSign className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-red-600 font-medium uppercase">Overdue</p>
                    <p className="text-xl font-bold text-red-900 mt-1">
                      {formatCurrency(metrics.overdueAmount)}
                    </p>
                  </div>
                  <div className="bg-red-200 p-2 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Status Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Invoice Summary</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">{metrics.paidInvoices} Paid</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">{metrics.pendingInvoices} Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">{metrics.overdueInvoices} Overdue</span>
                  </div>
                </div>
                <span className="text-sm text-gray-500">{invoices.length} Total</span>
              </div>
              {/* Progress Bar */}
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden flex">
                <div 
                  className="bg-green-500 transition-all"
                  style={{ width: `${(metrics.paidInvoices / Math.max(invoices.length, 1)) * 100}%` }}
                ></div>
                <div 
                  className="bg-blue-500 transition-all"
                  style={{ width: `${((metrics.pendingInvoices - metrics.overdueInvoices) / Math.max(invoices.length, 1)) * 100}%` }}
                ></div>
                <div 
                  className="bg-red-500 transition-all"
                  style={{ width: `${(metrics.overdueInvoices / Math.max(invoices.length, 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Quick Actions */}
            {metrics.pendingInvoices > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">
                        You have {metrics.pendingInvoices} pending invoice{metrics.pendingInvoices > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-yellow-700">
                        Total amount due: {formatCurrency(metrics.totalDue)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveView('invoices')}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                  >
                    View Invoices
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invoices View */}
        {activeView === 'invoices' && (
          <div>
            {invoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No invoices yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-gray-100 p-2 rounded-lg">
                          <FileText className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                          <p className="text-sm text-gray-500">
                            Issued: {formatDate(invoice.issue_date)} · Due: {formatDate(invoice.due_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(Number(invoice.total_amount))}
                          </p>
                          {Number(invoice.amount_due) > 0 && (
                            <p className="text-sm text-red-600">
                              Due: {formatCurrency(Number(invoice.amount_due))}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(invoice.status)}`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onViewInvoice(invoice.id)}
                            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="View Invoice"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {onPayInvoice && invoice.status !== InvoiceStatus.PAID && (
                            <button
                              onClick={() => onPayInvoice(invoice.id)}
                              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Pay Invoice"
                            >
                              <CreditCard className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payment History View */}
        {activeView === 'history' && (
          <div>
            {paymentHistory.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No payment history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        payment.status === 'completed' ? 'bg-green-100' : 'bg-yellow-100'
                      }`}>
                        <CheckCircle className={`h-5 w-5 ${
                          payment.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          Payment for {payment.invoiceNumber}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(payment.date)} · {payment.method}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        +{formatCurrency(payment.amount)}
                      </p>
                      <p className={`text-xs ${
                        payment.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
