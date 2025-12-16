'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Invoice, InvoiceStatus } from '@/types'

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchInvoice()
    }
  }, [params.id])

  const fetchInvoice = async () => {
    try {
      const response = await api.get<Invoice>(`/invoices/${params.id}`)
      setInvoice(response.data)
    } catch (error) {
      console.error('Failed to fetch invoice:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRecordPayment = async () => {
    if (!paymentAmount || !invoice) return

    try {
      await api.post(`/invoices/${invoice.id}/payment`, { amount: parseFloat(paymentAmount) })
      setShowPaymentModal(false)
      setPaymentAmount('')
      fetchInvoice()
    } catch (error) {
      console.error('Failed to record payment:', error)
      alert('Failed to record payment')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleStatusUpdate = async (status: InvoiceStatus) => {
    if (!invoice) return

    try {
      await api.put(`/invoices/${invoice.id}`, { status })
      fetchInvoice()
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('Failed to update status')
    }
  }

  const handleDelete = async () => {
    if (!invoice) return

    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return
    }

    try {
      await api.delete(`/invoices/${invoice.id}`)
      router.push('/dashboard/invoices')
    } catch (error) {
      console.error('Failed to delete invoice:', error)
      alert('Failed to delete invoice')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading invoice...</div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Invoice not found</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button
          onClick={() => router.push('/dashboard/invoices')}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back to Invoices
        </button>
        <div className="flex gap-2">
          {invoice.status !== InvoiceStatus.PAID && (
            <>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Record Payment
              </button>
              {invoice.status === InvoiceStatus.DRAFT && (
                <button
                  onClick={() => handleStatusUpdate(InvoiceStatus.SENT)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Mark as Sent
                </button>
              )}
            </>
          )}
          <button
            onClick={handlePrint}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Print
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="bg-white shadow-lg rounded-lg p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
            <p className="text-gray-600 mt-2">{invoice.invoice_number}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">Your Company Name</p>
            <p className="text-sm text-gray-600">123 Business St</p>
            <p className="text-sm text-gray-600">City, State 12345</p>
          </div>
        </div>

        {/* Bill To & Dates */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Bill To:</h3>
            {invoice.booking?.user && (
              <div className="text-gray-600">
                <p>{invoice.booking.user.firstName} {invoice.booking.user.lastName}</p>
                <p>{invoice.booking.user.email}</p>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="mb-2">
              <span className="text-gray-600">Issue Date: </span>
              <span className="font-semibold">
                {new Date(invoice.issue_date).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Due Date: </span>
              <span className="font-semibold">
                {new Date(invoice.due_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <table className="w-full mb-8">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Qty</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Unit Price</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoice.items?.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  ${Number(item.unit_price).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  ${Number(item.amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold">${Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            {invoice.tax_rate > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Tax ({invoice.tax_rate}%):</span>
                <span className="font-semibold">${Number(invoice.tax_amount).toFixed(2)}</span>
              </div>
            )}
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between py-2 text-red-600">
                <span>Discount:</span>
                <span>-${Number(invoice.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t border-gray-300 text-lg font-bold">
              <span>Total:</span>
              <span>${Number(invoice.total_amount).toFixed(2)}</span>
            </div>
            {invoice.amount_paid > 0 && (
              <>
                <div className="flex justify-between py-2 text-green-600">
                  <span>Paid:</span>
                  <span>-${Number(invoice.amount_paid).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-gray-300 text-lg font-bold text-red-600">
                  <span>Balance Due:</span>
                  <span>${Number(invoice.amount_due).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Terms & Notes */}
        {(invoice.terms || invoice.notes) && (
          <div className="border-t border-gray-200 pt-6">
            {invoice.terms && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">Terms:</h4>
                <p className="text-sm text-gray-600">{invoice.terms}</p>
              </div>
            )}
            {invoice.notes && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Notes:</h4>
                <p className="text-sm text-gray-600">{invoice.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Record Payment</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0.00"
              />
              <p className="text-sm text-gray-500 mt-1">
                Amount due: ${Number(invoice.amount_due).toFixed(2)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRecordPayment}
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
              >
                Record
              </button>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setPaymentAmount('')
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
