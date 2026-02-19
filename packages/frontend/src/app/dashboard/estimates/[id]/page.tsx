'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Estimate, EstimateStatus } from '@/types'

const statusColors: Record<EstimateStatus, string> = {
  [EstimateStatus.DRAFT]: 'bg-gray-100 text-gray-700',
  [EstimateStatus.SENT]: 'bg-blue-100 text-blue-700',
  [EstimateStatus.APPROVED]: 'bg-green-100 text-green-700',
  [EstimateStatus.REJECTED]: 'bg-red-100 text-red-700',
  [EstimateStatus.EXPIRED]: 'bg-yellow-100 text-yellow-700',
  [EstimateStatus.CONVERTED]: 'bg-purple-100 text-purple-700',
}

export default function EstimateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (params.id) fetchEstimate()
  }, [params.id])

  const fetchEstimate = async () => {
    try {
      const res = await api.get<Estimate>(`/estimates/${params.id}`)
      setEstimate(res.data)
    } catch (err) {
      console.error('Failed to fetch estimate:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (status: EstimateStatus) => {
    if (!estimate) return
    setActionLoading(true)
    try {
      await api.put(`/estimates/${estimate.id}/status`, { status })
      fetchEstimate()
    } catch (err) {
      console.error('Failed to update status:', err)
      alert('Failed to update status')
    } finally {
      setActionLoading(false)
    }
  }

  const convertToInvoice = async () => {
    if (!estimate) return
    if (!confirm('Convert this estimate to an invoice? The estimate will be marked as converted.')) return
    setActionLoading(true)
    try {
      const res = await api.post(`/estimates/${estimate.id}/convert-to-invoice`)
      alert(`Invoice ${res.data.invoice_number} created successfully!`)
      router.push(`/dashboard/invoices/${res.data.id}`)
    } catch (err) {
      console.error('Failed to convert:', err)
      alert('Failed to convert to invoice')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!estimate) return
    if (!confirm('Delete this estimate? This cannot be undone.')) return
    try {
      await api.delete(`/estimates/${estimate.id}`)
      router.push('/dashboard/estimates')
    } catch (err) {
      console.error('Failed to delete:', err)
      alert('Failed to delete estimate')
    }
  }

  const isExpired = estimate
    ? new Date(estimate.expiration_date) < new Date() && estimate.status === EstimateStatus.SENT
    : false

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-600">Loading estimate...</div></div>
  }

  if (!estimate) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-600">Estimate not found</div></div>
  }

  const canSend = estimate.status === EstimateStatus.DRAFT
  const canApprove = estimate.status === EstimateStatus.SENT
  const canReject = estimate.status === EstimateStatus.SENT
  const canConvert = estimate.status === EstimateStatus.APPROVED

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Action Bar */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button onClick={() => router.push('/dashboard/estimates')} className="text-gray-600 hover:text-gray-900">
          ← Back to Estimates
        </button>
        <div className="flex flex-wrap gap-2">
          {canSend && (
            <button onClick={() => updateStatus(EstimateStatus.SENT)} disabled={actionLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm">
              Send to Client
            </button>
          )}
          {canApprove && (
            <button onClick={() => updateStatus(EstimateStatus.APPROVED)} disabled={actionLoading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm">
              Mark Approved
            </button>
          )}
          {canReject && (
            <button onClick={() => updateStatus(EstimateStatus.REJECTED)} disabled={actionLoading}
              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:opacity-50 text-sm">
              Mark Rejected
            </button>
          )}
          {canConvert && (
            <button onClick={convertToInvoice} disabled={actionLoading}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm font-semibold">
              Convert to Invoice
            </button>
          )}
          {estimate.status === EstimateStatus.CONVERTED && estimate.converted_invoice_id && (
            <button onClick={() => router.push(`/dashboard/invoices/${estimate.converted_invoice_id}`)}
              className="bg-purple-100 text-purple-700 px-4 py-2 rounded-md hover:bg-purple-200 text-sm">
              View Invoice →
            </button>
          )}
          <button onClick={() => window.print()}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm">
            Print
          </button>
          {estimate.status === EstimateStatus.DRAFT && (
            <button onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm">
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Expired warning */}
      {isExpired && (
        <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded-md p-3 text-yellow-800 text-sm print:hidden">
          ⚠ This estimate expired on {new Date(estimate.expiration_date).toLocaleDateString()}.
          You may mark it Expired if the client did not respond.
          <button onClick={() => updateStatus(EstimateStatus.EXPIRED)}
            className="ml-3 underline hover:no-underline">Mark as Expired</button>
        </div>
      )}

      {/* Document */}
      <div className="bg-white shadow-lg rounded-lg p-8">

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ESTIMATE</h1>
            <p className="text-gray-600 mt-1">{estimate.estimate_number}</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize mt-2 ${statusColors[estimate.status]}`}>
              {estimate.status}
            </span>
          </div>
          <div className="text-right">
            <p className="font-semibold">Your Company Name</p>
            <p className="text-sm text-gray-500">123 Business St</p>
            <p className="text-sm text-gray-500">City, State 12345</p>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Prepared For:</h3>
            {(estimate as any).booking?.user && (
              <div className="text-gray-600 text-sm">
                <p>{(estimate as any).booking.user.firstName} {(estimate as any).booking.user.lastName}</p>
                <p>{(estimate as any).booking.user.email}</p>
              </div>
            )}
          </div>
          <div className="text-right text-sm">
            <div className="mb-1">
              <span className="text-gray-500">Issue Date: </span>
              <span className="font-semibold">{new Date(estimate.issue_date).toLocaleDateString()}</span>
            </div>
            <div className={new Date(estimate.expiration_date) < new Date() ? 'text-red-600' : ''}>
              <span className="text-gray-500">Expires: </span>
              <span className="font-semibold">{new Date(estimate.expiration_date).toLocaleDateString()}</span>
            </div>
            {estimate.approved_date && (
              <div className="mt-1 text-green-600">
                <span>Approved: </span>
                <span className="font-semibold">{new Date(estimate.approved_date).toLocaleDateString()}</span>
              </div>
            )}
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
            {estimate.items?.map(item => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">${Number(item.unit_price).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">${Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between py-2 text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold">${Number(estimate.subtotal).toFixed(2)}</span>
            </div>
            {estimate.tax_rate > 0 && (
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-600">Tax ({estimate.tax_rate}%):</span>
                <span className="font-semibold">${Number(estimate.tax_amount).toFixed(2)}</span>
              </div>
            )}
            {estimate.discount_amount > 0 && (
              <div className="flex justify-between py-2 text-sm text-red-600">
                <span>Discount:</span>
                <span>-${Number(estimate.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t border-gray-300 text-lg font-bold">
              <span>Total:</span>
              <span>${Number(estimate.total_amount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Terms & Notes */}
        {(estimate.terms || estimate.notes) && (
          <div className="border-t border-gray-200 pt-6">
            {estimate.terms && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-1">Terms:</h4>
                <p className="text-sm text-gray-600">{estimate.terms}</p>
              </div>
            )}
            {estimate.notes && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-1">Notes:</h4>
                <p className="text-sm text-gray-600">{estimate.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
