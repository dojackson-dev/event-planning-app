'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { ServiceItem, ServiceItemCategory, DiscountType } from '@/types'

interface BookingOption {
  id: string
  contact_name: string
  contact_email: string
  event_id?: string
  event?: {
    id: string
    name: string
    date: string
  }
}

interface EstimateLineItem {
  id: string
  service_item_id?: string | null
  description: string
  quantity: number
  standardPrice: number
  unitPrice: number
  subtotal: number
  discountType: DiscountType
  discountValue: number
  discountAmount: number
  amount: number
}

function NewEstimatePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [bookings, setBookings] = useState<BookingOption[]>([])
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([])
  const [selectedBooking, setSelectedBooking] = useState('')
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>([])
  const [vendorBookingBanner, setVendorBookingBanner] = useState<string>('')
  const [includeTax, setIncludeTax] = useState(false)
  const [taxRate, setTaxRate] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('This estimate is valid until the expiration date above.')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [expirationDate, setExpirationDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchBookings()
    fetchServiceItems()
  }, [])

  // Pre-fill vendor booking as a line item when vendorBookingId is in URL
  useEffect(() => {
    const vendorBookingId = searchParams?.get('vendorBookingId')
    if (!vendorBookingId) return
    api.get(`/vendors/bookings/${vendorBookingId}`).then(res => {
      const vb = res.data
      const vendor = vb.vendor_accounts
      const amount = Number(vb.agreed_amount) || 0
      const item: EstimateLineItem = {
        id: `vendor-${vb.id}`,
        service_item_id: null,
        description: `Vendor Cost: ${vendor?.business_name || 'Vendor'} — ${vb.event_name}`,
        quantity: 1,
        standardPrice: amount,
        unitPrice: amount,
        subtotal: amount,
        discountType: DiscountType.NONE,
        discountValue: 0,
        discountAmount: 0,
        amount,
      }
      setLineItems([item])
      setVendorBookingBanner(`Vendor cost pre-filled: ${vendor?.business_name || 'Vendor'} for "${vb.event_name}" — $${amount.toLocaleString()}`)
    }).catch(() => {})
  }, [searchParams])

  const fetchBookings = async () => {
    try {
      const res = await api.get<BookingOption[]>('/bookings')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      // Only show bookings whose event date is today or in the future
      const upcoming = (res.data || []).filter((b) => {
        const dateStr = b.event?.date
        if (!dateStr) return true
        const [y, m, d] = dateStr.split('-').map(Number)
        const eventDate = new Date(y, m - 1, d)
        return eventDate >= today
      })
      setBookings(upcoming)
    } catch (err) {
      console.error('Failed to fetch bookings:', err)
    }
  }

  const fetchServiceItems = async () => {
    try {
      const res = await api.get<ServiceItem[]>('/service-items')
      setServiceItems(res.data)
    } catch {
      setServiceItems([
        { id: '1', name: 'Facility Rental', description: 'Venue rental fee', category: ServiceItemCategory.FACILITY_RENTAL, defaultPrice: 2500, isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
        { id: '2', name: 'Security Deposit', description: 'Refundable security deposit', category: ServiceItemCategory.SECURITY_DEPOSIT, defaultPrice: 500, isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
        { id: '3', name: 'Sound System', description: 'Professional sound system', category: ServiceItemCategory.SOUND_SYSTEM, defaultPrice: 500, isActive: true, sortOrder: 3, createdAt: '', updatedAt: '' },
        { id: '4', name: 'A/V Equipment', description: 'Audio/visual equipment', category: ServiceItemCategory.AV_EQUIPMENT, defaultPrice: 750, isActive: true, sortOrder: 4, createdAt: '', updatedAt: '' },
        { id: '5', name: 'Planning Services', description: 'Event planning and coordination', category: ServiceItemCategory.PLANNING_SERVICES, defaultPrice: 1000, isActive: true, sortOrder: 5, createdAt: '', updatedAt: '' },
        { id: '6', name: 'Additional Time', description: 'Extended rental time per hour', category: ServiceItemCategory.ADDITIONAL_TIME, defaultPrice: 250, isActive: true, sortOrder: 6, createdAt: '', updatedAt: '' },
        { id: '7', name: 'Hosting Services', description: 'Professional event hosting', category: ServiceItemCategory.HOSTING_SERVICES, defaultPrice: 500, isActive: true, sortOrder: 7, createdAt: '', updatedAt: '' },
        { id: '8', name: 'Catering', description: 'Food and beverage services', category: ServiceItemCategory.CATERING, defaultPrice: 0, isActive: true, sortOrder: 8, createdAt: '', updatedAt: '' },
        { id: '9', name: 'Bar Services', description: 'Bar setup and service', category: ServiceItemCategory.BAR_SERVICES, defaultPrice: 0, isActive: true, sortOrder: 9, createdAt: '', updatedAt: '' },
        { id: '14', name: 'Miscellaneous', description: 'Other charges', category: ServiceItemCategory.MISC, defaultPrice: 0, isActive: true, sortOrder: 14, createdAt: '', updatedAt: '' },
      ])
    }
  }

  const addServiceItem = (item: ServiceItem | any) => {
    const price = Number(item.default_price ?? item.defaultPrice) || 0
    setLineItems(prev => [...prev, {
      id: `temp-${Date.now()}`,
      service_item_id: item.id,
      description: item.name,
      quantity: 1,
      standardPrice: price,
      unitPrice: price,
      subtotal: price,
      discountType: DiscountType.NONE,
      discountValue: 0,
      discountAmount: 0,
      amount: price,
    }])
  }

  const addCustomItem = () => {
    setLineItems(prev => [...prev, {
      id: `temp-${Date.now()}`,
      service_item_id: null,
      description: '',
      quantity: 1,
      standardPrice: 0,
      unitPrice: 0,
      subtotal: 0,
      discountType: DiscountType.NONE,
      discountValue: 0,
      discountAmount: 0,
      amount: 0,
    }])
  }

  const calcItem = (item: EstimateLineItem) => {
    const subtotal = item.quantity * item.unitPrice
    let discountAmount = 0
    if (item.discountType === DiscountType.PERCENTAGE) discountAmount = subtotal * (item.discountValue / 100)
    else if (item.discountType === DiscountType.FIXED) discountAmount = item.discountValue
    return { subtotal, discountAmount, amount: subtotal - discountAmount }
  }

  const updateLineItem = (id: string, field: keyof EstimateLineItem, value: any) => {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (['quantity', 'unitPrice', 'discountType', 'discountValue'].includes(field)) {
        const c = calcItem(updated)
        updated.subtotal = c.subtotal
        updated.discountAmount = c.discountAmount
        updated.amount = c.amount
      }
      return updated
    }))
  }

  const removeLineItem = (id: string) => setLineItems(prev => prev.filter(i => i.id !== id))

  const calcSubtotal = () => lineItems.reduce((s, i) => s + i.amount, 0)
  const calcTax = () => includeTax ? calcSubtotal() * (taxRate / 100) : 0
  const calcTotal = () => calcSubtotal() + calcTax() - discountAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lineItems.length === 0) { alert('Please add at least one line item'); return }
    setLoading(true)
    try {
      const body = {
        estimate: {
          booking_id: selectedBooking || null,
          owner_id: user?.id,
          tax_rate: includeTax ? Number(taxRate) : 0,
          discount_amount: Number(discountAmount),
          issue_date: issueDate,
          expiration_date: expirationDate,
          notes,
          terms,
          status: 'draft',
        },
        items: lineItems.map((item, index) => ({
          service_item_id: item.service_item_id || null,
          description: item.description,
          quantity: Number(item.quantity),
          standard_price: Number(item.standardPrice),
          unit_price: Number(item.unitPrice),
          discount_type: item.discountType,
          discount_value: Number(item.discountValue),
          sort_order: index,
        })),
      }
      const res = await api.post('/estimates', body)
      router.push(`/dashboard/estimates/${res.data.id}`)
    } catch (err) {
      console.error('Failed to create estimate:', err)
      alert('Failed to create estimate')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Estimate</h1>
        <p className="text-sm text-gray-500 mt-1">Send to your client for approval before converting to an invoice.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">

        {/* Vendor booking banner */}
        {vendorBookingBanner && (
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <span className="text-amber-600 mt-0.5">⚡</span>
            <p className="text-sm text-amber-800">{vendorBookingBanner}</p>
          </div>
        )}

        {/* Client */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Event / Booking (Optional)</label>
          <select
            value={selectedBooking}
            onChange={e => setSelectedBooking(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">-- No booking --</option>
            {bookings.map(b => (
              <option key={b.id} value={b.id}>
                {b.event?.name || 'Event'}
                {b.contact_name ? ` — ${b.contact_name}` : ''}
                {b.event?.date ? ` (${b.event.date})` : ''}
              </option>
            ))}
          </select>
          {bookings.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">No upcoming bookings found. Estimates can still be created without linking to a booking.</p>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date *</label>
            <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Expiration Date *</label>
            <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <p className="text-xs text-gray-400 mt-1">Client must approve before this date.</p>
          </div>
        </div>

        {/* Quick Add Service Items */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Quick Add Service Items</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
            {serviceItems.map((item: any) => {
              const price = Number(item.default_price ?? item.defaultPrice) || 0
              return (
                <button key={item.id} type="button" onClick={() => addServiceItem(item)}
                  className="flex flex-col items-start p-3 text-sm bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-left transition-colors">
                  <span className="font-medium text-gray-900">{item.name}</span>
                  <span className="text-xs text-blue-600 mt-1">${price.toFixed(2)}</span>
                </button>
              )
            })}
          </div>
          <button type="button" onClick={addCustomItem}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700">
            + Add Custom Item
          </button>
        </div>

        {/* Line Items */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Estimate Items *</label>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-20">Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Unit Price</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Discount</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Amount</th>
                  <th className="px-4 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lineItems.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-2">
                      <input type="text" value={item.description}
                        onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                        placeholder="Item description" required />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" step="0.01" min="0" value={item.quantity}
                        onChange={e => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-right" required />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" step="0.01" min="0" value={item.unitPrice}
                        onChange={e => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-right" required />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <select value={item.discountType}
                          onChange={e => updateLineItem(item.id, 'discountType', e.target.value)}
                          className="px-1 py-1 border border-gray-300 rounded-md text-xs">
                          <option value={DiscountType.NONE}>None</option>
                          <option value={DiscountType.PERCENTAGE}>%</option>
                          <option value={DiscountType.FIXED}>$</option>
                        </select>
                        {item.discountType !== DiscountType.NONE && (
                          <input type="number" step="0.01" min="0" value={item.discountValue}
                            onChange={e => updateLineItem(item.id, 'discountValue', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-xs text-right" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-medium">${item.amount.toFixed(2)}</td>
                    <td className="px-4 py-2 text-center">
                      <button type="button" onClick={() => removeLineItem(item.id)}
                        className="text-red-600 hover:text-red-800 text-lg">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="mb-6 flex justify-end">
          <div className="w-80">
            <div className="flex justify-between py-2 text-sm text-gray-600">
              <span>Subtotal:</span>
              <span className="font-semibold">${calcSubtotal().toFixed(2)}</span>
            </div>
            <div className="mb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                <input type="checkbox" checked={includeTax} onChange={e => setIncludeTax(e.target.checked)}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
                Include Sales Tax
              </label>
              {includeTax && (
                <input type="number" step="0.01" min="0" value={taxRate}
                  onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                  placeholder="Tax rate %" />
              )}
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span className="text-gray-600">Discount:</span>
              <input type="number" step="0.01" min="0" value={discountAmount}
                onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                className="w-32 px-2 py-1 border border-gray-300 rounded-md text-sm text-right" />
            </div>
            <div className="flex justify-between py-2 border-t border-gray-300 text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary-600">${calcTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Terms & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Terms</label>
            <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Internal notes..." />
          </div>
        </div>

        <div className="flex gap-4 justify-end">
          <button type="button" onClick={() => router.push('/dashboard/estimates')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Estimate'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewEstimatePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <NewEstimatePageInner />
    </Suspense>
  )
}
