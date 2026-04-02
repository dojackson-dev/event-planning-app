'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { ServiceItem, ServiceItemCategory, DiscountType } from '@/types'

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
  const [events, setEvents] = useState<any[]>([])
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([])
  const [selectedEvent, setSelectedEvent] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [intakeFormId, setIntakeFormId] = useState<string | null>(null)
  const [clientEventDate, setClientEventDate] = useState<string | null>(null)
  const [clientEventType, setClientEventType] = useState<string | null>(null)
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>([])
  const [vendorBookingBanner, setVendorBookingBanner] = useState<string>('')
  const [vendorBookings, setVendorBookings] = useState<any[]>([])
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
  const [allBookings, setAllBookings] = useState<any[]>([])
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [autofilledFromBooking, setAutofilledFromBooking] = useState(false)

  useEffect(() => {
    fetchEvents()
    fetchServiceItems()
    api.get('/bookings').then(res => setAllBookings(res.data || [])).catch(() => {})
    api.get('/vendors/bookings/owner').then(res => {
      const confirmed = (res.data || []).filter((b: any) => b.status === 'confirmed' || b.status === 'completed')
      setVendorBookings(confirmed)
    }).catch(() => {})
  }, [])

  // Pre-fill from client workflow (clientId URL param)
  useEffect(() => {
    const clientId = searchParams?.get('clientId')
    if (!clientId) return
    setIntakeFormId(clientId)
    api.get(`/intake-forms/${clientId}`).then(res => {
      setClientName(res.data.contact_name || '')
      setClientEventDate(res.data.event_date || null)
      setClientEventType(res.data.event_type || null)
    }).catch(() => {})
  }, [searchParams])

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

  // When an event is selected, autofill client info from the linked booking
  useEffect(() => {
    if (!selectedEvent) {
      setBookingId(null)
      setAutofilledFromBooking(false)
      return
    }
    const booking = allBookings.find((b: any) => b.event_id === selectedEvent)
    if (booking) {
      setBookingId(booking.id)
      setClientName(booking.contact_name || '')
      setClientPhone(booking.contact_phone || '')
      setAutofilledFromBooking(true)
    } else {
      setBookingId(null)
      setAutofilledFromBooking(false)
    }
  }, [selectedEvent, allBookings])

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events')
      const today = new Date().toISOString().split('T')[0]
      const upcoming = (res.data || []).filter((e: any) =>
        e.status !== 'cancelled' && e.date >= today
      )
      setEvents(upcoming)
    } catch (err) {
      console.error('Failed to fetch events:', err)
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
    if (!selectedEvent) { alert('Please select an event'); return }
    if (lineItems.length === 0) { alert('Please add at least one line item'); return }
    setLoading(true)
    try {
      const body = {
        estimate: {
          owner_id: user?.id,
          booking_id: bookingId || null,
          intake_form_id: intakeFormId || null,
          client_name: clientName || null,
          client_phone: clientPhone || null,
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

        {/* Client info banner when coming from client workflow */}
        {intakeFormId && clientEventDate && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
            <span className="text-blue-500 text-xl">📅</span>
            <div>
              <p className="text-sm font-semibold text-blue-900">
                {clientEventType ? clientEventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Event'} for {clientName}
              </p>
              <p className="text-xs text-blue-700">
                {new Date(clientEventDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        {/* Event (Required) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Event <span className="text-red-500">*</span></label>
          {events.length === 0 ? (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              No upcoming events found. <a href="/dashboard/events/new" className="underline font-medium">Create an event</a> first.
            </p>
          ) : (
            <select
              required
              value={selectedEvent}
              onChange={e => setSelectedEvent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">-- Select an event --</option>
              {events.map((ev: any) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name || 'Event'}{ev.date ? ` (${new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Client Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Client Name</label>
          {(intakeFormId || autofilledFromBooking) ? (
            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800 font-medium flex items-center justify-between">
              <span>{clientName || 'Loading…'}</span>
              {autofilledFromBooking && <span className="text-xs text-blue-500">Auto-filled from booking</span>}
            </div>
          ) : (
            <input
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Enter client name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          )}
        </div>

        {/* Client Phone */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Phone <span className="text-gray-400 font-normal">(for SMS notifications)</span>
          </label>
          {autofilledFromBooking ? (
            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800 font-medium flex items-center justify-between">
              <span>{clientPhone || 'Not on file'}</span>
              <span className="text-xs text-blue-500">Auto-filled from booking</span>
            </div>
          ) : (
            <input
              type="tel"
              value={clientPhone}
              onChange={e => setClientPhone(e.target.value)}
              placeholder="e.g. 555-867-5309"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
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

        {/* Confirmed Vendor Bookings */}
        {vendorBookings.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Bookings</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {vendorBookings.map((vb: any) => {
                const vendor = vb.vendor_accounts
                const amount = Number(vb.agreed_amount) || 0
                const alreadyAdded = lineItems.some(li => li.id === `vendor-${vb.id}`)
                return (
                  <div key={vb.id} className={`flex items-center justify-between p-3 border rounded-lg text-sm ${
                    alreadyAdded ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-medium text-gray-900 truncate">{vendor?.business_name || 'Vendor'}</p>
                      <p className="text-xs text-gray-500 truncate">{vb.event_name}</p>
                      <p className="text-xs font-semibold text-amber-700">{amount > 0 ? `$${amount.toLocaleString()}` : 'No amount set'}</p>
                    </div>
                    {alreadyAdded ? (
                      <span className="text-xs text-green-700 font-medium flex-shrink-0">✓ Added</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
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
                          setLineItems(prev => [...prev, item])
                        }}
                        className="text-xs px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 flex-shrink-0"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
