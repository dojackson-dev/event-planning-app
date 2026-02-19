'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { ServiceItem, ServiceItemCategory, Booking, DiscountType } from '@/types'

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
}

export default function NewInvoicePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([])
  const [selectedBooking, setSelectedBooking] = useState<string>('')
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const [includeTax, setIncludeTax] = useState<boolean>(false)
  const [taxRate, setTaxRate] = useState<number>(0)
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('Payment due within 30 days')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchBookings()
    fetchServiceItems()
  }, [])

  const fetchBookings = async () => {
    try {
      const response = await api.get<Booking[]>('/bookings')
      setBookings(response.data)
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
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
    }
    setLineItems([...lineItems, newItem])
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
          booking_id: selectedBooking && selectedBooking !== '' ? selectedBooking : null,
          owner_id: user?.id,
          tax_rate: includeTax ? Number(taxRate) : 0,
          discount_amount: Number(discountAmount),
          amount_paid: 0,
          issue_date: issueDate,
          due_date: dueDate,
          notes,
          terms,
          status: 'draft',
        },
        items: lineItems.map((item, index) => ({
          service_item_id: item.service_item_id || null,
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unitPrice),
          discount_type: 'none',
          discount_value: 0,
          sort_order: index,
        })),
      }

      const response = await api.post('/invoices', invoiceData)
      router.push(`/dashboard/invoices/${response.data.id}`)
    } catch (error) {
      console.error('Failed to create invoice:', error)
      alert('Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        {/* Booking Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Booking (Optional)
          </label>
          <select
            value={selectedBooking}
            onChange={(e) => setSelectedBooking(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">-- Select a booking (optional) --</option>
            {bookings.map((booking) => (
              <option key={booking.id} value={booking.id}>
                {booking.event?.name || 'Event'} - {booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : 'Customer'}
              </option>
            ))}
          </select>
        </div>

        {/* Invoice Dates */}
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
