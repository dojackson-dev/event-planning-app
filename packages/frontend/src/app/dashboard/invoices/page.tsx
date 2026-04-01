'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Invoice, InvoiceStatus } from '@/types'
import { Search } from 'lucide-react'

function getCustomerName(invoice: any): string {
  if (invoice.client_name) return invoice.client_name
  const booking = invoice.booking as any
  if (booking?.contact_name) return booking.contact_name
  if (booking?.contact_email) return booking.contact_email
  if (invoice.intake_form?.contact_name) return invoice.intake_form.contact_name
  if (invoice.intake_form?.contact_email) return invoice.intake_form.contact_email
  if (invoice.client_email) return invoice.client_email
  return 'N/A'
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      // If user is an owner, filter by their ownerId
      const params = user?.role === 'owner' ? { ownerId: user.id } : {}
      const response = await api.get<Invoice[]>('/invoices', { params })
      setInvoices(response.data)
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (invoiceId: string, invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNumber}? This action cannot be undone.`)) {
      return
    }

    try {
      await api.delete(`/invoices/${invoiceId}`)
      fetchInvoices()
    } catch (error) {
      console.error('Failed to delete invoice:', error)
      alert('Failed to delete invoice')
    }
  }

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID:
        return 'bg-green-100 text-green-800'
      case InvoiceStatus.PARTIAL:
        return 'bg-amber-100 text-amber-800'
      case InvoiceStatus.SENT:
        return 'bg-blue-100 text-blue-800'
      case InvoiceStatus.OVERDUE:
        return 'bg-red-100 text-red-800'
      case InvoiceStatus.DRAFT:
        return 'bg-gray-100 text-gray-800'
      case InvoiceStatus.CANCELLED:
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredInvoices = invoices
    .filter(inv => filter === 'all' || inv.status === filter)
    .filter(inv => {
      if (!searchTerm) return true
      const q = searchTerm.toLowerCase()
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        getCustomerName(inv).toLowerCase().includes(q) ||
        (inv.client_email || '').toLowerCase().includes(q)
      )
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading invoices...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {user?.role === 'owner' ? 'My Invoices' : 'Invoices'}
        </h1>
        {user?.role === 'owner' && (
          <button
            onClick={() => router.push('/dashboard/invoices/new')}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Create Invoice
          </button>
        )}
      </div>

      {/* Search + Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by invoice # or customer name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as InvoiceStatus | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Statuses</option>
          {Object.values(InvoiceStatus).map(s => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
      </div>

      {/* Mobile card view */}
      <div className="block md:hidden space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">No invoices found</div>
        ) : (
          filteredInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="bg-white rounded-lg shadow p-4 cursor-pointer active:bg-gray-50 hover:shadow-md transition-shadow"
              onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{invoice.invoice_number}</p>
                  <p className="text-sm text-gray-600 truncate">{getCustomerName(invoice)}</p>
                </div>
                <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${getStatusColor(invoice.status)}`}>
                  {invoice.status}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                <span>${Number(invoice.total_amount).toFixed(2)}</span>
                <span>·</span>
                <span>Due {new Date(invoice.due_date).toLocaleDateString()}</span>
              </div>
              <div className="mt-3 pt-3 border-t flex justify-between items-center" onClick={e => e.stopPropagation()}>
                <span className="text-xs text-gray-400">Tap to view details →</span>
                <button
                  onClick={() => handleDelete(invoice.id, invoice.invoice_number)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden overflow-x-auto">
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
                Issue Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No invoices found
                </td>
              </tr>
            ) : (
              filteredInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getCustomerName(invoice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.issue_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${Number(invoice.total_amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      View
                    </button>
                    {invoice.status !== InvoiceStatus.PAID && (
                      <button
                        onClick={() => router.push(`/dashboard/invoices/${invoice.id}/edit`)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(invoice.id, invoice.invoice_number)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
