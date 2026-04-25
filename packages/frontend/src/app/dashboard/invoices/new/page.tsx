'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { ServiceItem, ServiceItemCategory, DiscountType } from '@/types'

interface InvoiceLineItem {
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
  item_type: 'revenue' | 'expense'
  vendor_booking_id?: string | null
}

function NewInvoicePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([])
  const [selectedBooking, setSelectedBooking] = useState<string>('')
  const [clientName, setClientName] = useState<string>('')
  const [clientPhone, setClientPhone] = useState<string>('')
  const [intakeFormId, setIntakeFormId] = useState<string | null>(null)
  const [invoiceType, setInvoiceType] = useState<'invoice' | 'estimate'>('invoice')
  const [clientEventDate, setClientEventDate] = useState<string | null>(null)
  const [clientEventType, setClientEventType] = useState<string | null>(null)
  const [lockedEvent, setLockedEvent] = useState<{ id: string; name: string; date: string } | null>(null)
  const [eventName, setEventName] = useState<string>('')
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const [expenseItems, setExpenseItems] = useState<InvoiceLineItem[]>([])
  const [vendorBookingBanner, setVendorBookingBanner] = useState<string>('')
  const [includeTax, setIncludeTax] = useState<boolean>(false)
  const [taxRate, setTaxRate] = useState<number>(0)
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('Payment due within 30 days')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  // Payment schedule — loaded from owner Settings → Billing (read-only here)
  const [ownerDepositPct, setOwnerDepositPct] = useState<number | null>(null)
  const [ownerDepositDays, setOwnerDepositDays] = useState<number | null>(null)
  const [ownerFinalDays, setOwnerFinalDays] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [approvedEstimates, setApprovedEstimates] = useState<any[]>([])

  useEffect(() => {
    fetchEvents()
    fetchServiceItems()
    // Load owner payment schedule defaults
    api.get('/owner/payment-schedule').then(res => {
      const d = res.data
      if (d.depositPercentage !== null && d.depositPercentage !== undefined) {
        setOwnerDepositPct(Number(d.depositPercentage))
        setOwnerDepositDays(Number(d.depositDueDaysBefore))
        setOwnerFinalDays(Number(d.finalPaymentDueDaysBefore))
      }
    }).catch(() => {})
  }, [])

  // Pre-fill from event manage page workflow (eventId param)
  useEffect(() => {
    const eventId = searchParams?.get('eventId')
    const clientIdParam = searchParams?.get('clientId')
    if (!eventId) return
    setSelectedBooking(eventId)
    api.get(`/events/${eventId}`).then(res => {
      const ev = res.data
      const evName = ev.intakeEventName || ev.name || ''
      setLockedEvent({ id: eventId, name: evName, date: ev.date || '' })
      setEventName(evName)

      // Use clientName directly from event if available
      if (ev.clientName) setClientName(ev.clientName)

      // Try clientId param first (passed from manage page)
      const intakeId = clientIdParam || ev.intakeFormId || ev.bookingId || ev.booking_id || ev.intake_form_id
      if (intakeId) {
        setIntakeFormId(intakeId)
        api.get(`/intake-forms/${intakeId}`).then(r => {
          const form = r.data
          if (form?.contact_name) setClientName(form.contact_name)
          if (form?.contact_phone) setClientPhone(form.contact_phone)
        }).catch(() => {})
        return
      }

      // Fallback: scan all intake forms
      api.get('/intake-forms').then(r => {
        const forms: any[] = r.data || []

        // Try matching by event_id first
        let match = forms.find((f: any) => String(f.event_id) === String(eventId))

        // If no event_id match, extract client name from event name (format: "type - Client Name")
        // and match by contact_name
        if (!match && evName.includes(' - ')) {
          const extractedName = evName.split(' - ').slice(1).join(' - ').trim()
          match = forms.find((f: any) =>
            (f.contact_name || '').toLowerCase() === extractedName.toLowerCase()
          )
        }

        if (match) {
          if (match.contact_name) setClientName(match.contact_name)
          if (match.contact_phone) setClientPhone(match.contact_phone)
          if (match.id) setIntakeFormId(match.id)
        }
      }).catch(() => {})
    }).catch(() => {})
  }, [searchParams])

  // Pre-fill from client detail page workflow (clientId + type=estimate)
  useEffect(() => {
    const clientId = searchParams?.get('clientId')
    const type = searchParams?.get('type')
    if (type === 'estimate') setInvoiceType('estimate')
    if (!clientId) return
    setIntakeFormId(clientId)
    api.get(`/intake-forms/${clientId}`).then(res => {
      const form = res.data
      setClientName(form.contact_name || '')
      setClientEventDate(form.event_date || null)
      setClientEventType(form.event_type || null)
    }).catch(() => {})
  }, [searchParams])

  useEffect(() => {
    const vendorBookingId = searchParams?.get('vendorBookingId')
    if (!vendorBookingId) return
    api.get(`/vendors/bookings/${vendorBookingId}`).then(res => {
      const vb = res.data
      const vendor = vb.vendor_accounts
      const amount = Number(vb.agreed_amount) || 0
      const expenseItem: InvoiceLineItem = {
        id: `expense-${vb.id}`,
        description: `Vendor: ${vendor?.business_name || 'Vendor'} — ${vb.event_name}`,
        quantity: 1,
        standardPrice: amount,
        unitPrice: amount,
        subtotal: amount,
        discountType: DiscountType.NONE,
        discountValue: 0,
        discountAmount: 0,
        amount,
        item_type: 'expense',
        vendor_booking_id: vb.id,
      }
      setExpenseItems([expenseItem])
      setVendorBookingBanner(`Vendor cost pre-filled from booking: ${vendor?.business_name || 'Vendor'} for "${vb.event_name}"`)
      // Pre-select the event if it's linked
      if (vb.event_id) setSelectedBooking('')
    }).catch(() => {})
  }, [searchParams])

  // Fetch approved/converted estimates for this event so the user can import line items
  useEffect(() => {
    const eventId = lockedEvent?.id
    if (!eventId && !intakeFormId) return
    api.get('/estimates').then(res => {
      const all: any[] = res.data || []
      const matched = all.filter((e: any) =>
        ['approved', 'converted'].includes(e.status) &&
        (
          (eventId && e.booking?.event_id === eventId) ||
          (intakeFormId && e.intake_form_id === intakeFormId)
        )
      )
      setApprovedEstimates(matched)
    }).catch(() => {})
  }, [lockedEvent, intakeFormId])

  const applyFromEstimate = (estimate: any) => {
    const discTypeMap: Record<string, DiscountType> = {
      percentage: DiscountType.PERCENTAGE,
      fixed: DiscountType.FIXED,
      none: DiscountType.NONE,
    }
    const items: InvoiceLineItem[] = (estimate.items || []).map((item: any, idx: number) => {
      const qty = Number(item.quantity) || 1
      const unitPrice = Number(item.unit_price) || 0
      const subtotal = qty * unitPrice
      const discountType = discTypeMap[item.discount_type] ?? DiscountType.NONE
      const discountValue = Number(item.discount_value) || 0
      let discountAmount = 0
      if (discountType === DiscountType.PERCENTAGE) discountAmount = subtotal * (discountValue / 100)
      else if (discountType === DiscountType.FIXED) discountAmount = discountValue
      return {
        id: `est-${estimate.id}-${idx}`,
        description: item.description || '',
        quantity: qty,
        standardPrice: unitPrice,
        unitPrice,
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        amount: subtotal - discountAmount,
        item_type: 'revenue' as const,
      }
    })
    setLineItems(items)
  }

  const fetchEvents = async () => {
    try {
      const response = await api.get('/events')
      const today = new Date().toISOString().split('T')[0]
      const upcoming = (response.data || []).filter((e: any) =>
        e.status !== 'cancelled' && e.date >= today
      )
      setEvents(upcoming)
    } catch (error) {
      console.error('Failed to fetch events:', error)
    }
  }

  const fetchServiceItems = async () => {
    try {
      const response = await api.get<ServiceItem[]>('/service-items')
      setServiceItems(response.data)
    } catch (error) {
      console.error('Failed to fetch service items:', error)
      // Fallback to hardcoded items if backend is unavailable
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
        { id: '10', name: 'Security Services', description: 'Professional security personnel', category: ServiceItemCategory.SECURITY_SERVICES, defaultPrice: 0, isActive: true, sortOrder: 10, createdAt: '', updatedAt: '' },
        { id: '11', name: 'Decorations', description: 'Event decorations', category: ServiceItemCategory.DECORATIONS, defaultPrice: 0, isActive: true, sortOrder: 11, createdAt: '', updatedAt: '' },
        { id: '12', name: 'Sales Tax', description: 'Applicable sales tax', category: ServiceItemCategory.SALES_TAX, defaultPrice: 0, isActive: true, sortOrder: 12, createdAt: '', updatedAt: '' },
        { id: '13', name: 'Items', description: 'Miscellaneous items', category: ServiceItemCategory.ITEMS, defaultPrice: 0, isActive: true, sortOrder: 13, createdAt: '', updatedAt: '' },
        { id: '14', name: 'Miscellaneous', description: 'Other charges', category: ServiceItemCategory.MISC, defaultPrice: 0, isActive: true, sortOrder: 14, createdAt: '', updatedAt: '' }
      ])
    }
  }

  const addServiceItem = (serviceItem: ServiceItem | any) => {
    // Handle both snake_case (from API) and camelCase (from type) price fields
    const price = Number(serviceItem.default_price ?? serviceItem.defaultPrice) || 0
    const itemName = serviceItem.name || 'Item'
    const itemDescription = serviceItem.description || itemName
    const newItem: InvoiceLineItem = {
      id: `temp-${Date.now()}`,
      service_item_id: serviceItem.id,
      description: itemDescription,
      quantity: 1,
      standardPrice: price,
      unitPrice: price,
      subtotal: price,
      discountType: DiscountType.NONE,
      discountValue: 0,
      discountAmount: 0,
      amount: price,
      item_type: 'revenue',
    }
    setLineItems([...lineItems, newItem])
  }

  const addCustomItem = () => {
    const newItem: InvoiceLineItem = {
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
      item_type: 'revenue',
    }
    setLineItems([...lineItems, newItem])
  }

  const addCustomExpenseItem = () => {
    const newItem: InvoiceLineItem = {
      id: `expense-custom-${Date.now()}`,
      description: '',
      quantity: 1,
      standardPrice: 0,
      unitPrice: 0,
      subtotal: 0,
      discountType: DiscountType.NONE,
      discountValue: 0,
      discountAmount: 0,
      amount: 0,
      item_type: 'expense',
    }
    setExpenseItems(prev => [...prev, newItem])
  }

  const updateExpenseItem = (id: string, field: keyof InvoiceLineItem, value: any) => {
    setExpenseItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (['quantity', 'unitPrice'].includes(field)) {
        const sub = Number(updated.quantity) * Number(updated.unitPrice)
        updated.subtotal = sub
        updated.amount = sub
      }
      return updated
    }))
  }

  const removeExpenseItem = (id: string) => {
    setExpenseItems(prev => prev.filter(item => item.id !== id))
  }

  const calculateItemAmounts = (item: InvoiceLineItem) => {
    const subtotal = Number(item.quantity) * Number(item.unitPrice)
    let discountAmount = 0

    if (item.discountType === DiscountType.PERCENTAGE) {
      discountAmount = subtotal * (Number(item.discountValue) / 100)
    } else if (item.discountType === DiscountType.FIXED) {
      discountAmount = Number(item.discountValue)
    }

    const amount = subtotal - discountAmount

    return {
      subtotal,
      discountAmount,
      amount,
    }
  }

  const updateLineItem = (id: string, field: keyof InvoiceLineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        
        // Recalculate amounts when relevant fields change
        if (['quantity', 'unitPrice', 'discountType', 'discountValue'].includes(field)) {
          const calculated = calculateItemAmounts(updated)
          updated.subtotal = calculated.subtotal
          updated.discountAmount = calculated.discountAmount
          updated.amount = calculated.amount
        }
        
        return updated
      }
      return item
    }))
  }

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + Number(item.amount), 0)
  }

  const calculateTax = () => {
    if (!includeTax || taxRate <= 0) return 0
    return calculateSubtotal() * (taxRate / 100)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - discountAmount
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lineItems.length === 0) {
      alert('Please add at least one line item')
      return
    }

    setLoading(true)
    try {
      const invoiceData = {
        invoice: {
          booking_id: null,
          intake_form_id: intakeFormId || null,
          event_id: lockedEvent?.id || null,
          client_name: clientName || null,
          client_phone: clientPhone || null,
          owner_id: user?.id,
          tax_rate: includeTax ? Number(taxRate) : 0,
          discount_amount: Number(discountAmount),
          amount_paid: 0,
          issue_date: issueDate,
          due_date: dueDate,
          deposit_percentage: ownerDepositPct,
          deposit_due_days_before: ownerDepositDays,
          final_payment_due_days_before: ownerFinalDays,
          notes,
          terms,
          status: 'draft',
        },
        items: [
          ...lineItems.map((item, index) => ({
            service_item_id: item.service_item_id || null,
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unitPrice),
            discount_type: 'none',
            discount_value: 0,
            sort_order: index,
            item_type: 'revenue',
          })),
          ...expenseItems.map((item, index) => ({
            service_item_id: null,
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unitPrice),
            discount_type: 'none',
            discount_value: 0,
            sort_order: lineItems.length + index,
            item_type: 'expense',
            vendor_booking_id: item.vendor_booking_id || null,
          })),
        ],
      }

      const response = await api.post('/invoices', invoiceData)
      router.push(`/dashboard/invoices/${response.data.id}`)
    } catch (error: any) {
      console.error('Failed to create invoice:', error)
      const msg = error?.response?.data?.message || 'Failed to create invoice. Please try again.'
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {invoiceType === 'estimate' ? 'Create New Estimate' : 'Create New Invoice'}
        </h1>
      </div>

      {vendorBookingBanner && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
          📋 {vendorBookingBanner}
        </div>
      )}

      {/* Client event banner when coming from client workflow */}
      {intakeFormId && clientEventDate && (
        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-4 py-3 text-sm flex items-center gap-3">
          <span className="text-blue-500 text-xl">📅</span>
          <div>
            <p className="font-semibold">
              {clientEventType ? clientEventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Event'} for {clientName}
            </p>
            <p className="text-xs text-blue-700">
              {new Date(clientEventDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        {/* Event Selection */}
        {!intakeFormId && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Link to Event (Optional)
          </label>
          {lockedEvent ? (
            <div className="flex items-center gap-3 px-3 py-2 bg-teal-50 border border-teal-200 rounded-md">
              <span className="text-teal-600 font-medium text-sm">{lockedEvent.name}</span>
              {lockedEvent.date && (
                <span className="text-xs text-teal-500">
                  {new Date(lockedEvent.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
              <span className="ml-auto text-xs text-teal-400">Linked from event</span>
            </div>
          ) : (
            <>
              {events.length === 0 ? (
                <p className="text-sm text-gray-500 mt-1">
                  No upcoming events found. Invoices can still be created without linking to an event.
                </p>
              ) : null}
              <select
                value={selectedBooking}
                onChange={(e) => setSelectedBooking(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">-- Select an event (optional) --</option>
                {events.map((ev: any) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name || 'Event'}{ev.date ? ` (${new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})` : ''}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        )}

        {/* Client Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Name
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Enter client name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Event Name — shown when pre-filled from event */}
        {eventName && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Name
            </label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-800 text-sm">
              {eventName}
            </div>
          </div>
        )}

        {/* Client Phone */}
        {(!intakeFormId || lockedEvent) && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Phone <span className="text-gray-400 font-normal">(for SMS notifications)</span>
          </label>
          <input
            type="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="e.g. 555-867-5309"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Date *
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date *
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Payment Schedule — from owner Settings → Billing */}
        {ownerDepositPct !== null && (
          <div className="mb-6 flex items-start gap-3 border border-blue-200 bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-800">
            <span className="text-base mt-0.5">💳</span>
            <div>
              <p className="font-semibold text-blue-900 mb-0.5">Payment schedule will be applied</p>
              <p>Deposit ({ownerDepositPct}%) — due {ownerDepositDays} days before the event</p>
              <p>Final payment ({100 - ownerDepositPct}%) — due {ownerFinalDays} days before the event</p>
              <a href="/dashboard/settings?tab=billing" className="text-xs text-blue-600 underline mt-1 inline-block">
                Change in Settings → Billing
              </a>
            </div>
          </div>
        )}

        {/* Apply from Approved Estimate */}
        {approvedEstimates.length > 0 && (
          <div className="mb-6 border border-green-200 bg-green-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-800 mb-1">✓ Approved estimate available</p>
            <p className="text-xs text-green-700 mb-3">Import line items directly from a confirmed estimate — you can still edit them after applying.</p>
            <div className="flex flex-col gap-2">
              {approvedEstimates.map(est => (
                <div key={est.id} className="flex items-center justify-between bg-white rounded-md border border-green-200 px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-gray-800">
                      Estimate #{est.estimate_number || est.id.slice(0, 8)}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      ${Number(est.total_amount || 0).toFixed(2)} &middot; {est.items?.length || 0} item{est.items?.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyFromEstimate(est)}
                    className="text-sm px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Service Items Quick Add */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Add Service Items
          </label>
          {serviceItems.length === 0 ? (
            <div className="text-sm text-gray-500 mb-4">
              Loading service items...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              {serviceItems.map((item: any) => {
                const itemPrice = Number(item.default_price ?? item.defaultPrice) || 0
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addServiceItem(item)}
                    className="flex flex-col items-start p-3 text-sm bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-left transition-colors"
                    title={item.description}
                  >
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <span className="text-xs text-blue-600 mt-1">
                      ${itemPrice.toFixed(2)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          <button
            type="button"
            onClick={addCustomItem}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            + Add Custom Item
          </button>
        </div>

        {/* Line Items */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invoice Items *
          </label>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-20">
                    Qty
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">
                    Std Price
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">
                    Unit Price
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">
                    Discount
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">
                    Amount
                  </th>
                  <th className="px-4 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                        placeholder="Item description"
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-right"
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.standardPrice}
                        onChange={(e) => {
                          const newPrice = parseFloat(e.target.value) || 0
                          updateLineItem(item.id, 'standardPrice', newPrice)
                          updateLineItem(item.id, 'unitPrice', newPrice)
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-right"
                        placeholder="0.00"
                        title="Standard price"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-right"
                        placeholder="0.00"
                        title="Adjusted price"
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <select
                          value={item.discountType}
                          onChange={(e) => updateLineItem(item.id, 'discountType', e.target.value)}
                          className="px-1 py-1 border border-gray-300 rounded-md text-xs"
                        >
                          <option value={DiscountType.NONE}>None</option>
                          <option value={DiscountType.PERCENTAGE}>%</option>
                          <option value={DiscountType.FIXED}>$</option>
                        </select>
                        {item.discountType !== DiscountType.NONE && (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.discountValue}
                            onChange={(e) => updateLineItem(item.id, 'discountValue', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-xs text-right"
                            placeholder="0"
                          />
                        )}
                      </div>
                      {item.discountAmount > 0 && (
                        <div className="text-xs text-red-600 mt-1">
                          -${item.discountAmount.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-medium">
                      ${Number(item.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="text-red-600 hover:text-red-800 text-lg"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vendor Costs (Expense Items — internal, not billed to client) */}
        <div className="mb-6 border-t border-dashed border-gray-300 pt-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Vendor Costs <span className="text-gray-400 font-normal">(Internal — not billed to client)</span></h3>
              <p className="text-xs text-gray-400 mt-0.5">Track what you&apos;re paying vendors to calculate your margin</p>
            </div>
            <button
              type="button"
              onClick={addCustomExpenseItem}
              className="text-xs px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-700 rounded-md hover:bg-amber-100"
            >
              + Add Vendor Cost
            </button>
          </div>
          {expenseItems.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-amber-100">
                <thead className="bg-amber-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-amber-700 uppercase w-20">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-amber-700 uppercase w-28">Unit Cost</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-amber-700 uppercase w-28">Total Cost</th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-amber-50">
                  {expenseItems.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={e => updateExpenseItem(item.id, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                          placeholder="e.g. DJ Services — Smith Wedding"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number" min="1" step="1"
                          value={item.quantity}
                          onChange={e => updateExpenseItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-right"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number" min="0" step="0.01"
                          value={item.unitPrice}
                          onChange={e => updateExpenseItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-right"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-medium text-amber-700">
                        ${Number(item.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button type="button" onClick={() => removeExpenseItem(item.id)} className="text-red-500 hover:text-red-700 text-lg">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {expenseItems.length === 0 && (
            <p className="text-sm text-gray-400 italic">No vendor costs added yet</p>
          )}
        </div>

        {/* Calculations */}
        <div className="mb-6 flex justify-end">
          <div className="w-96">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtotal
              </label>
              <div className="text-right text-lg font-semibold">
                ${calculateSubtotal().toFixed(2)}
              </div>
            </div>

            <div className="mb-3">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="includeTax"
                  checked={includeTax}
                  onChange={(e) => setIncludeTax(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="includeTax" className="ml-2 text-sm font-medium text-gray-700">
                  Include Sales Tax (Optional)
                </label>
              </div>
              {includeTax && (
                <>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter tax rate %"
                  />
                  <div className="text-right text-sm text-gray-600 mt-1">
                    Tax Amount: ${calculateTax().toFixed(2)}
                  </div>
                </>
              )}
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="border-t border-gray-300 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-2xl font-bold text-primary-600">
                  ${calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>

            {expenseItems.length > 0 && (() => {
              const vendorCosts = expenseItems.reduce((s, i) => s + Number(i.amount), 0)
              const margin = calculateTotal() - vendorCosts
              return (
                <div className="mt-3 pt-3 border-t border-dashed border-amber-300 space-y-1">
                  <div className="flex justify-between text-sm text-amber-700">
                    <span>Vendor Costs:</span>
                    <span>-${vendorCosts.toFixed(2)}</span>
                  </div>
                  <div className={`flex justify-between font-bold text-base ${margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    <span>Margin:</span>
                    <span>${margin.toFixed(2)}</span>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Additional Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Terms
            </label>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Internal notes..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <button
            type="button"
            onClick={() => router.push('/dashboard/invoices')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <NewInvoicePageContent />
    </Suspense>
  )
}