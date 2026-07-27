'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Invoice, InvoiceStatus } from '@/types'
import { Send, Trash2, Pencil, Printer, Link2, DollarSign, Loader2 } from 'lucide-react'

interface EditItem {
  id?: string
  description: string
  quantity: number
  unit_price: number
  item_type: 'revenue' | 'expense'
  _originalDescription: string
  _originalQty: number
  _originalUnitPrice: number
  _deleted: boolean
  _isNew: boolean
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentLink, setPaymentLink] = useState('')
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [ownerInfo, setOwnerInfo] = useState<{
    businessName: string
    venue: { name?: string; address?: string; city?: string; state?: string; zip_code?: string; phone?: string; email?: string } | null
  } | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editDueDate, setEditDueDate] = useState('')
  const [editTaxRate, setEditTaxRate] = useState(0)
  const [editDiscountAmount, setEditDiscountAmount] = useState(0)
  const [editNotes, setEditNotes] = useState('')
  const [editTerms, setEditTerms] = useState('')
  const [editItems, setEditItems] = useState<EditItem[]>([])
  const [editClientName, setEditClientName] = useState('')
  const [editClientEmail, setEditClientEmail] = useState('')
  const [editClientPhone, setEditClientPhone] = useState('')
  const [editClientAddress, setEditClientAddress] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchInvoice()
    }
    api.get('/owner/venue').then(r => setOwnerInfo(r.data)).catch(() => {})
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
      // Use the /status endpoint so the backend also sends SMS/email notification
      await api.put(`/invoices/${invoice.id}/status`, { status })
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

  const handleGeneratePaymentLink = async () => {
    if (!invoice) return
    setGeneratingLink(true)
    try {
      const amountCents = Math.round(Number(invoice.amount_due || invoice.total_amount) * 100)
      const res = await api.post('/stripe/payment-link', {
        invoiceId: invoice.id,
        amountCents,
        description: `Invoice ${invoice.invoice_number}`,
      })
      setPaymentLink(res.data.url)
      setShowLinkModal(true)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate payment link. Make sure Stripe Connect is set up.')
    } finally {
      setGeneratingLink(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(paymentLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const openEditModal = () => {
    if (!invoice) return
    const intakeForm = (invoice as any).intake_form
    const booking = (invoice as any).booking
    setEditClientName(
      invoice.client_name ||
      intakeForm?.contact_name ||
      booking?.contact_name ||
      (booking?.user ? `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim() : '') ||
      ''
    )
    setEditClientEmail(
      invoice.client_email ||
      intakeForm?.contact_email ||
      booking?.contact_email ||
      booking?.user?.email ||
      ''
    )
    setEditClientPhone(
      invoice.client_phone ||
      intakeForm?.contact_phone ||
      booking?.contact_phone ||
      ''
    )
    setEditClientAddress(invoice.client_address || '')
    setEditDueDate(invoice.due_date || '')
    setEditTaxRate(Number(invoice.tax_rate) || 0)
    setEditDiscountAmount(Number(invoice.discount_amount) || 0)
    setEditNotes(invoice.notes || '')
    setEditTerms(invoice.terms || '')
    setEditItems(
      (invoice.items || [])
        .filter(i => !i.item_type || i.item_type === 'revenue')
        .map(item => ({
          id: item.id,
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          item_type: (item.item_type || 'revenue') as 'revenue' | 'expense',
          _originalDescription: item.description,
          _originalQty: Number(item.quantity),
          _originalUnitPrice: Number(item.unit_price),
          _deleted: false,
          _isNew: false,
        }))
    )
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!invoice) return
    setSaving(true)
    try {
      const newItems: Array<{ description: string; quantity: number; unit_price: number; item_type: string }> = []

      for (const item of editItems) {
        if (item._isNew && !item._deleted) {
          newItems.push({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            item_type: item.item_type,
          })
        } else if (!item._isNew && item._deleted && item.id) {
          await api.delete(`/invoices/items/${item.id}`)
        } else if (!item._isNew && !item._deleted && item.id) {
          const descChanged = item.description !== item._originalDescription
          const qtyChanged = item.quantity !== item._originalQty
          const priceChanged = item.unit_price !== item._originalUnitPrice
          if (descChanged || qtyChanged || priceChanged) {
            let desc = item.description
            if (descChanged && !desc.startsWith('Updated: ')) {
              desc = `Updated: ${desc}`
            }
            await api.put(`/invoices/items/${item.id}`, {
              description: desc,
              quantity: item.quantity,
              unit_price: item.unit_price,
            })
          }
        }
      }

      if (newItems.length > 0) {
        await api.post(`/invoices/${invoice.id}/items`, newItems)
      }

      await api.put(`/invoices/${invoice.id}`, {
        client_name: editClientName || null,
        client_email: editClientEmail || null,
        client_phone: editClientPhone || null,
        client_address: editClientAddress || null,
        due_date: editDueDate,
        tax_rate: editTaxRate,
        discount_amount: editDiscountAmount,
        notes: editNotes || null,
        terms: editTerms || null,
      })

      setShowEditModal(false)
      await fetchInvoice()
    } catch (error) {
      console.error('Failed to save invoice:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
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
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Back link */}
      <div className="mb-3 print:hidden">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => router.push('/dashboard/events')}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-1 text-sm"
          >
            ← Back to Events
          </button>
          <button
            onClick={() => router.push('/dashboard/invoices')}
            className="text-xs text-gray-400 hover:text-gray-600 text-left"
          >
            View All Invoices →
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-6 print:hidden">
        {invoice.status === InvoiceStatus.DRAFT && (
          <button
            onClick={() => handleStatusUpdate(InvoiceStatus.SENT)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            <Send className="w-4 h-4" />
            Send Invoice
          </button>
        )}
        {(invoice.status === InvoiceStatus.SENT || invoice.status === InvoiceStatus.PARTIAL || invoice.status === InvoiceStatus.OVERDUE) && (
          <button
            onClick={() => handleStatusUpdate(invoice.status)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            <Send className="w-4 h-4" />
            Resend Invoice
          </button>
        )}
        <button
          onClick={openEditModal}
          className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </button>
      </div>

      {/* Invoice Document */}
      <div className="bg-white shadow-lg rounded-lg p-4 sm:p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
            <p className="text-gray-600 mt-2">{invoice.invoice_number}</p>
          </div>
          <div className="text-right">
            {ownerInfo?.businessName && (
              <p className="font-semibold">{ownerInfo.businessName}</p>
            )}
            {ownerInfo?.venue?.address && (
              <p className="text-sm text-gray-600">{ownerInfo.venue.address}</p>
            )}
            {(ownerInfo?.venue?.city || ownerInfo?.venue?.state || ownerInfo?.venue?.zip_code) && (
              <p className="text-sm text-gray-600">
                {[ownerInfo.venue?.city, ownerInfo.venue?.state].filter(Boolean).join(', ')}
                {ownerInfo.venue?.zip_code ? ` ${ownerInfo.venue.zip_code}` : ''}
              </p>
            )}
            {ownerInfo?.venue?.phone && (
              <p className="text-sm text-gray-600">{ownerInfo.venue.phone}</p>
            )}
            {ownerInfo?.venue?.email && (
              <p className="text-sm text-gray-600">{ownerInfo.venue.email}</p>
            )}
          </div>
        </div>

        {/* Bill To & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Bill To:</h3>
            <div className="text-gray-600">
              {(() => {
                const intakeForm = (invoice as any).intake_form
                const booking = (invoice as any).booking
                const name = invoice.client_name ||
                  intakeForm?.contact_name ||
                  booking?.contact_name ||
                  (booking?.user ? `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim() : '') ||
                  null
                const email = invoice.client_email ||
                  intakeForm?.contact_email ||
                  booking?.contact_email ||
                  booking?.user?.email ||
                  null
                const phone = invoice.client_phone ||
                  intakeForm?.contact_phone ||
                  booking?.contact_phone ||
                  null
                const address = invoice.client_address || null
                return (
                  <>
                    {name && <p className="font-medium text-gray-800">{name}</p>}
                    {address && <p className="text-sm">{address}</p>}
                    {email && <p className="text-sm">{email}</p>}
                    {phone && <p className="text-sm">{phone}</p>}
                    {!name && !email && !phone && (
                      <p className="text-sm text-gray-400 italic">No client info — use Edit to add</p>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
          <div className="text-right">
            <div className="mb-2">
              <span className="text-gray-600">Issue Date: </span>
              <span className="font-semibold">
                {new Date(invoice.issue_date + 'T12:00:00').toLocaleDateString()}
              </span>
            </div>
            <div className="mb-2">
              <span className="text-gray-600">Due Date: </span>
              <span className="font-semibold">
                {new Date(invoice.due_date + 'T12:00:00').toLocaleDateString()}
              </span>
            </div>
            {(invoice as any).booking?.event?.date && (
              <div>
                <span className="text-gray-600">Event Date: </span>
                <span className="font-semibold">
                  {new Date((invoice as any).booking.event.date + 'T12:00:00').toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items — revenue only (billed to client) */}
        <div className="overflow-x-auto mb-8">
        <table className="w-full min-w-[480px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Qty</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Unit Price</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoice.items?.filter(i => !i.item_type || i.item_type === 'revenue').map((item) => (
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
        </div>

        {/* Vendor Costs — internal, print-hidden */}
        {invoice.items?.some(i => i.item_type === 'expense') && (() => {
          const expenseItems = invoice.items!.filter(i => i.item_type === 'expense')
          const vendorCosts = expenseItems.reduce((s, i) => s + Number(i.amount), 0)
          const margin = Number(invoice.total_amount) - vendorCosts
          return (
            <div className="mb-8 print:hidden border border-dashed border-amber-300 rounded-lg p-4 bg-amber-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-amber-800">Vendor Costs <span className="font-normal text-amber-600">(Internal — not billed to client)</span></h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-amber-700 uppercase">
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Unit Cost</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {expenseItems.map(item => (
                    <tr key={item.id}>
                      <td className="py-1.5 text-gray-700">{item.description}</td>
                      <td className="py-1.5 text-right text-gray-700">{item.quantity}</td>
                      <td className="py-1.5 text-right text-gray-700">${Number(item.unit_price).toFixed(2)}</td>
                      <td className="py-1.5 text-right font-medium text-amber-700">${Number(item.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 pt-3 border-t border-amber-200 flex flex-col items-end gap-1">
                <div className="flex gap-6 text-sm text-amber-700">
                  <span>Total Vendor Costs:</span>
                  <span className="font-semibold">-${vendorCosts.toFixed(2)}</span>
                </div>
                <div className={`flex gap-6 text-base font-bold ${margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  <span>Estimated Margin:</span>
                  <span>${margin.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )
        })()}

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

        {/* Payment Schedule */}
        {invoice.deposit_percentage != null && invoice.deposit_percentage > 0 && (() => {
          const total = Number(invoice.total_amount)
          const depositAmt = total * (Number(invoice.deposit_percentage) / 100)
          const finalAmt = total - depositAmt
          const eventDateStr = (invoice.booking as any)?.event?.date
          const eventDate = eventDateStr ? new Date(eventDateStr + 'T00:00:00') : null

          const depositDueDate = eventDate && invoice.deposit_due_days_before != null
            ? new Date(eventDate.getTime() - invoice.deposit_due_days_before * 86400000)
            : null
          const finalDueDate = eventDate && invoice.final_payment_due_days_before != null
            ? new Date(eventDate.getTime() - invoice.final_payment_due_days_before * 86400000)
            : null

          return (
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h4 className="font-semibold text-gray-700 mb-3">Payment Schedule</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-800">
                      Deposit ({invoice.deposit_percentage}%)
                    </span>
                    {depositDueDate && (
                      <span className="ml-2 text-xs text-gray-500">
                        due {depositDueDate.toLocaleDateString()}
                        {invoice.deposit_due_days_before != null && ` (${invoice.deposit_due_days_before} days before event)`}
                      </span>
                    )}
                    {!depositDueDate && invoice.deposit_due_days_before != null && (
                      <span className="ml-2 text-xs text-gray-500">due {invoice.deposit_due_days_before} days before event</span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-amber-700">${depositAmt.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-4 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-800">Final Payment</span>
                    {finalDueDate && (
                      <span className="ml-2 text-xs text-gray-500">
                        due {finalDueDate.toLocaleDateString()}
                        {invoice.final_payment_due_days_before != null && ` (${invoice.final_payment_due_days_before} days before event)`}
                      </span>
                    )}
                    {!finalDueDate && invoice.final_payment_due_days_before != null && (
                      <span className="ml-2 text-xs text-gray-500">due {invoice.final_payment_due_days_before} days before event</span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-green-700">${finalAmt.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )
        })()}

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
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
      {/* Payment Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-2">🔗 Payment Link</h3>
            <p className="text-sm text-gray-500 mb-4">
              Share this link with your client. They can pay securely via Stripe — no account needed.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                readOnly
                value={paymentLink}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 truncate"
              />
              <button
                onClick={copyLink}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  linkCopied ? 'bg-green-600 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                {linkCopied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <a
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center w-full mb-4 py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
            >
              Open Payment Page →
            </a>
            <button
              onClick={() => setShowLinkModal(false)}
              className="w-full py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-6">Edit Invoice</h3>

              {/* Client Info */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3">Bill To</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                    <input
                      type="text"
                      value={editClientName}
                      onChange={e => setEditClientName(e.target.value)}
                      placeholder="Full name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editClientEmail}
                      onChange={e => setEditClientEmail(e.target.value)}
                      placeholder="client@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editClientPhone}
                      onChange={e => setEditClientPhone(e.target.value)}
                      placeholder="(555) 000-0000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={editClientAddress}
                      onChange={e => setEditClientAddress(e.target.value)}
                      placeholder="123 Main St, City, State ZIP"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Invoice-level fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editTaxRate}
                    onChange={e => setEditTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editDiscountAmount}
                    onChange={e => setEditDiscountAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-700">Line Items</h4>
                  <button
                    onClick={() => setEditItems(prev => [...prev, {
                      description: '',
                      quantity: 1,
                      unit_price: 0,
                      item_type: 'revenue',
                      _originalDescription: '',
                      _originalQty: 1,
                      _originalUnitPrice: 0,
                      _deleted: false,
                      _isNew: true,
                    }])}
                    className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                    <div className="col-span-6">Description</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-3 text-center">Unit Price</div>
                    <div className="col-span-1" />
                  </div>
                  {editItems.map((item, idx) => item._deleted ? null : (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <input
                          type="text"
                          value={item.description}
                          onChange={e => {
                            const updated = [...editItems]
                            updated[idx] = { ...updated[idx], description: e.target.value }
                            setEditItems(updated)
                          }}
                          placeholder="Description"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => {
                            const updated = [...editItems]
                            updated[idx] = { ...updated[idx], quantity: Number(e.target.value) }
                            setEditItems(updated)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-center"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={e => {
                            const updated = [...editItems]
                            updated[idx] = { ...updated[idx], unit_price: Number(e.target.value) }
                            setEditItems(updated)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-center"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button
                          onClick={() => {
                            const updated = [...editItems]
                            if (updated[idx]._isNew) {
                              updated.splice(idx, 1)
                            } else {
                              updated[idx] = { ...updated[idx], _deleted: true }
                            }
                            setEditItems(updated)
                          }}
                          className="text-red-500 hover:text-red-700 text-xl leading-none"
                          title="Remove item"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes & Terms */}
              <div className="grid grid-cols-1 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Terms</label>
                  <textarea
                    value={editTerms}
                    onChange={e => setEditTerms(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={saving}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
