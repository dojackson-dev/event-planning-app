'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { FileText, Calendar, ChevronDown } from 'lucide-react'
import VendorDocumentForm, {
  type VendorDocumentPrefill,
  type VendorDocumentValues,
} from '@/components/vendor/VendorDocumentForm'
import { newLine } from '@/components/vendor/LineItemsEditor'

// Unified booking option (from either vendor_bookings or vendor_booking_requests)
interface BookingOption {
  id: string
  source: 'booking' | 'request'
  label: string
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  event_name: string | null
  event_date: string | null
  amount: number | null
}

/** Today (in the vendor's own time zone) plus `days`, as YYYY-MM-DD. */
const localDate = (days = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 10)
}

const SAVE_TIMEOUT_MS = 45000

function NewVendorInvoicePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [bookingOptions, setBookingOptions] = useState<BookingOption[]>([])
  const [selectedBookingId, setSelectedBookingId] = useState<string>('')
  const [prefill, setPrefill] = useState<VendorDocumentPrefill | undefined>()

  const [initial] = useState<VendorDocumentValues>(() => ({
    client_name: searchParams.get('clientName') || '',
    client_email: searchParams.get('clientEmail') || '',
    client_phone: searchParams.get('clientPhone') || '',
    issue_date: localDate(0),
    end_date: localDate(30),
    tax_rate: '0',
    discount_amount: '0',
    notes: '',
    terms: '',
    lines: [newLine()],
  }))

  const preselectedBookingId = searchParams.get('bookingId') || ''

  const applyBooking = (opt: BookingOption, version: number) => {
    setPrefill({
      version,
      client_name: opt.client_name || '',
      client_email: opt.client_email || '',
      client_phone: opt.client_phone || '',
      lines: opt.amount
        ? [newLine({ description: opt.event_name || 'Vendor Services', unit_price: String(opt.amount) })]
        : undefined,
    })
  }

  useEffect(() => {
    const fetchAll = async () => {
      const combined: BookingOption[] = []
      try {
        // Owner-created bookings (vendor_bookings)
        const res1 = await api.get('/vendors/bookings/mine')
        const bookings: any[] = res1.data || []
        bookings
          .filter(b => b.status !== 'cancelled')
          .forEach(b => {
            const clientLabel = b.client_name || b.event_name || 'Unnamed Booking'
            combined.push({
              id: b.id,
              source: 'booking',
              label: `${clientLabel}${b.event_name && b.client_name ? ` — ${b.event_name}` : ''}${b.event_date ? ` (${b.event_date})` : ''}${b.agreed_amount ? ` · $${Number(b.agreed_amount).toFixed(2)}` : ''}`,
              client_name: b.client_name,
              client_email: b.client_email,
              client_phone: b.client_phone,
              event_name: b.event_name,
              event_date: b.event_date,
              amount: b.agreed_amount ? Number(b.agreed_amount) : null,
            })
          })
      } catch { /* the picker is optional */ }
      try {
        // Client-direct booking requests (vendor_booking_requests)
        const res2 = await api.get('/vendors/booking-requests/mine')
        const requests: any[] = res2.data || []
        requests
          .filter(r => r.status !== 'declined' && r.status !== 'cancelled')
          .forEach(r => {
            combined.push({
              id: r.id,
              source: 'request',
              label: `${r.client_name}${r.event_name ? ` — ${r.event_name}` : ''}${r.event_date ? ` (${r.event_date})` : ''}${r.quoted_amount ? ` · $${Number(r.quoted_amount).toFixed(2)}` : ''} [Request]`,
              client_name: r.client_name,
              client_email: r.client_email,
              client_phone: r.client_phone,
              event_name: r.event_name,
              event_date: r.event_date,
              amount: r.quoted_amount ? Number(r.quoted_amount) : null,
            })
          })
      } catch { /* the picker is optional */ }
      setBookingOptions(combined)
      if (preselectedBookingId) {
        setSelectedBookingId(preselectedBookingId)
        const opt = combined.find(o => o.id === preselectedBookingId)
        if (opt) applyBooking(opt, 1)
      }
    }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBookingSelect = (bookingId: string) => {
    setSelectedBookingId(bookingId)
    const opt = bookingOptions.find(o => o.id === bookingId)
    if (opt) applyBooking(opt, (prefill?.version ?? 1) + 1)
  }

  const bookingPicker = (
    <div className="bg-white rounded-xl border border-primary-200 p-5 shadow-sm">
      <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary-500" />
        Link to a booking request{' '}
        <span className="text-xs font-normal text-gray-400">(optional, fills in the client)</span>
      </h2>
      {bookingOptions.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No active bookings found.</p>
      ) : (
        <div className="relative">
          <select
            value={selectedBookingId}
            onChange={e => handleBookingSelect(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none pr-8 bg-white"
          >
            <option value="">-- Select a booking --</option>
            {bookingOptions.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/vendor-portal/invoices" className="text-sm text-gray-400 hover:text-gray-600 mb-1 inline-block">
          ← Back to Invoices
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <FileText className="w-6 h-6 text-primary-600" />
          New Invoice
        </h1>

        <VendorDocumentForm
          kind="invoice"
          initial={initial}
          prefill={prefill}
          top={bookingPicker}
          submitLabel="Create Invoice"
          savingLabel="Saving…"
          cancelHref="/vendor-portal/invoices"
          onSubmit={async p => {
            const res = await api.post(
              '/vendor-invoices',
              {
                client_name: p.client_name,
                client_email: p.client_email,
                client_phone: p.client_phone ?? undefined,
                issue_date: p.issue_date,
                due_date: p.end_date,
                tax_rate: p.tax_rate,
                discount_amount: p.discount_amount,
                notes: p.notes ?? undefined,
                terms: p.terms ?? undefined,
                items: p.items,
              },
              { timeout: SAVE_TIMEOUT_MS },
            )
            router.push(`/vendor-portal/invoices/${res.data.id}`)
          }}
        />
      </div>
    </div>
  )
}

export default function NewVendorInvoicePage() {
  return (
    <Suspense>
      <NewVendorInvoicePageContent />
    </Suspense>
  )
}
