'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Estimate, EstimateStatus, DiscountType } from '@/types'
import { Eye } from 'lucide-react'

type EditItem = {
  id: string
  description: string
  quantity: number
  unit_price: number
  discount_type: DiscountType
  discount_value: number
  amount: number
}

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
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({ issue_date: '', expiration_date: '', tax_rate: 0, discount_amount: 0, notes: '', terms: '' })
  const [editItems, setEditItems] = useState<EditItem[]>([])
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

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

  const enterEditMode = () => {
    if (!estimate) return
    setEditData({
      issue_date: estimate.issue_date,
      expiration_date: estimate.expiration_date,
      tax_rate: estimate.tax_rate || 0,
      discount_amount: estimate.discount_amount || 0,
      notes: estimate.notes || '',
      terms: estimate.terms || '',
    })
    setEditItems(estimate.items.map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_type: item.discount_type,
      discount_value: item.discount_value,
      amount: item.amount,
    })))
    setDeletedItemIds([])
    setEditMode(true)
  }

  const calcEditItemAmount = (qty: number, price: number, dtype: DiscountType, dval: number) => {
    const sub = qty * price
    if (dtype === DiscountType.PERCENTAGE) return sub * (1 - dval / 100)
    if (dtype === DiscountType.FIXED) return Math.max(0, sub - dval)
    return sub
  }

  const updateEditItem = (id: string, field: string, value: any) => {
    setEditItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      updated.amount = calcEditItemAmount(
        field === 'quantity' ? value : updated.quantity,
        field === 'unit_price' ? value : updated.unit_price,
        field === 'discount_type' ? value : updated.discount_type,
        field === 'discount_value' ? value : updated.discount_value,
      )
      return updated
    }))
  }

  const addEditItem = () => {
    setEditItems(prev => [...prev, { id: `new-${Date.now()}`, description: '', quantity: 1, unit_price: 0, discount_type: DiscountType.NONE, discount_value: 0, amount: 0 }])
  }

  const removeEditItem = (id: string) => {
    if (!id.startsWith('new-')) setDeletedItemIds(prev => [...prev, id])
    setEditItems(prev => prev.filter(i => i.id !== id))
  }

  const saveEdit = async () => {
    if (!estimate) return
    if (editItems.length === 0) { alert('Please add at least one line item'); return }
    setSaving(true)
    try {
      await api.put(`/estimates/${estimate.id}`, editData)
      await Promise.all(deletedItemIds.map(id => api.delete(`/estimates/items/${id}`)))
      await Promise.all(
        editItems
          .filter(i => !i.id.startsWith('new-'))
          .map(i => api.put(`/estimates/items/${i.id}`, {
            description: i.description, quantity: i.quantity, unit_price: i.unit_price,
            discount_type: i.discount_type, discount_value: i.discount_value,
          }))
      )
      const newItems = editItems.filter(i => i.id.startsWith('new-'))
      if (newItems.length > 0) {
        await api.post(`/estimates/${estimate.id}/items`, newItems.map(i => ({
          description: i.description, quantity: i.quantity, unit_price: i.unit_price,
          discount_type: i.discount_type, discount_value: i.discount_value, amount: i.amount,
        })))
      }
      setEditMode(false)
      fetchEstimate()
    } catch {
      alert('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isExpired = estimate
    ? new Date(estimate.expiration_date + 'T12:00:00') < new Date() && estimate.status === EstimateStatus.SENT
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
  const canConvert = [EstimateStatus.DRAFT, EstimateStatus.SENT, EstimateStatus.APPROVED].includes(estimate.status)

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Action Bar */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button onClick={() => router.push('/dashboard/estimates')} className="text-gray-600 hover:text-gray-900">
          ← Back to Estimates
        </button>
        <div className="flex flex-wrap gap-2">
          {!editMode && estimate.status !== EstimateStatus.CONVERTED && (
            <button onClick={enterEditMode}
              className="bg-amber-500 text-white px-4 py-2 rounded-md hover:bg-amber-600 text-sm font-medium">
              ✏ Edit Estimate
            </button>
          )}
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
          ⚠ This estimate expired on {new Date(estimate.expiration_date + 'T12:00:00').toLocaleDateString()}.
          You may mark it Expired if the client did not respond.
          <button onClick={() => updateStatus(EstimateStatus.EXPIRED)}
            className="ml-3 underline hover:no-underline">Mark as Expired</button>
        </div>
      )}

      {/* Document */}
      {editMode ? (
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Estimate</h2>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
              <input type="date" value={editData.issue_date}
                onChange={e => setEditData(d => ({ ...d, issue_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
              <input type="date" value={editData.expiration_date}
                onChange={e => setEditData(d => ({ ...d, expiration_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">Line Items</label>
              <button type="button" onClick={addEditItem}
                className="text-sm px-3 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700">+ Add Item</button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-20">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Unit Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-36">Discount</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Amount</th>
                    <th className="px-4 py-2 w-10" />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {editItems.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">
                        <input type="text" value={item.description}
                          onChange={e => updateEditItem(item.id, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Item description" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min="0" step="1" value={item.quantity}
                          onChange={e => updateEditItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min="0" step="0.01" value={item.unit_price}
                          onChange={e => updateEditItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right" />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <select value={item.discount_type}
                            onChange={e => updateEditItem(item.id, 'discount_type', e.target.value)}
                            className="px-1 py-1 border border-gray-300 rounded text-xs">
                            <option value={DiscountType.NONE}>None</option>
                            <option value={DiscountType.PERCENTAGE}>%</option>
                            <option value={DiscountType.FIXED}>$</option>
                          </select>
                          {item.discount_type !== DiscountType.NONE && (
                            <input type="number" step="0.01" min="0" value={item.discount_value}
                              onChange={e => updateEditItem(item.id, 'discount_value', parseFloat(e.target.value) || 0)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-right" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-medium">${item.amount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">
                        <button type="button" onClick={() => removeEditItem(item.id)}
                          className="text-red-500 hover:text-red-700 text-xl leading-none">×</button>
                      </td>
                    </tr>
                  ))}
                  {editItems.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-400">No items — click "+ Add Item" to start.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax & Discount */}
          <div className="flex justify-end mb-6">
            <div className="w-72 space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700 flex-1">Tax Rate (%)</label>
                <input type="number" step="0.01" min="0" value={editData.tax_rate}
                  onChange={e => setEditData(d => ({ ...d, tax_rate: parseFloat(e.target.value) || 0 }))}
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700 flex-1">Overall Discount ($)</label>
                <input type="number" step="0.01" min="0" value={editData.discount_amount}
                  onChange={e => setEditData(d => ({ ...d, discount_amount: parseFloat(e.target.value) || 0 }))}
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right" />
              </div>
            </div>
          </div>

          {/* Terms & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms</label>
              <textarea value={editData.terms}
                onChange={e => setEditData(d => ({ ...d, terms: e.target.value }))}
                rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={editData.notes}
                onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))}
                rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>

          <div className="flex gap-3 justify-end border-t border-gray-200 pt-6">
            <button onClick={() => setEditMode(false)} disabled={saving}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
              Cancel
            </button>
            <button onClick={saveEdit} disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm font-medium">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
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
              <span className="font-semibold">{new Date(estimate.issue_date + 'T12:00:00').toLocaleDateString()}</span>
            </div>
            <div className={new Date(estimate.expiration_date + 'T12:00:00') < new Date() ? 'text-red-600' : ''}>
              <span className="text-gray-500">Expires: </span>
              <span className="font-semibold">{new Date(estimate.expiration_date + 'T12:00:00').toLocaleDateString()}</span>
            </div>
            {estimate.approved_date && (
              <div className="mt-1 text-green-600">
                <span>Approved: </span>
                <span className="font-semibold">{new Date(estimate.approved_date + 'T12:00:00').toLocaleDateString()}</span>
              </div>
            )}
            {(estimate as any).viewed_at && (
              <div className="mt-1 text-emerald-700 flex items-center justify-end gap-1 print:hidden">
                <Eye className="h-3.5 w-3.5" />
                <span className="text-xs">Viewed {new Date((estimate as any).viewed_at).toLocaleString()}</span>
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
      )}
    </div>
  )
}
