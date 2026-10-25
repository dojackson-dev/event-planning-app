'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Mail, MessageSquare, Phone, Receipt, UserRound, FilePlus2, CreditCard } from 'lucide-react'

export interface EventVendorBooking {
  id: string
  vendor_account_id: string
  event_id?: string | null
  event_name: string
  event_date: string
  agreed_amount: number
  deposit_amount: number
  total_paid?: number | null
  status: string
  invoiceId?: string | null
  invoiceStatus?: string | null
  vendor_accounts?: {
    business_name: string
    category: string
    profile_image_url?: string
    phone?: string | null
    email?: string | null
  }
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
}

const actionClass =
  'inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50'

/** A booked vendor on an event; click it to text, call, email, chase or review their invoice. */
export default function EventVendorRow({ booking, eventId }: { booking: EventVendorBooking; eventId: string }) {
  const [open, setOpen] = useState(false)
  const vendor = booking.vendor_accounts
  const name = vendor?.business_name || 'Vendor'
  const phone = vendor?.phone || null
  const email = vendor?.email || null

  const worked = booking.status === 'confirmed' || booking.status === 'completed'
  const invoiceSent = !!booking.invoiceId && booking.invoiceStatus !== 'draft'
  const invoicePaid = booking.invoiceStatus === 'paid' || booking.status === 'paid'
  const smsHref = (extra = '') =>
    `/dashboard/messages/send?eventId=${eventId}&vendorBookingId=${booking.id}${extra}`
  const owed = Math.max(Number(booking.agreed_amount || 0) - Number(booking.total_paid || 0), 0)

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">{name}</p>
          <p className="text-xs capitalize text-gray-500">{vendor?.category?.replace(/_/g, ' ')}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {booking.agreed_amount > 0 && (
            <span className="text-sm font-semibold text-gray-900">${Number(booking.agreed_amount).toLocaleString()}</span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[booking.status] || 'bg-gray-100 text-gray-600'}`}>
            {booking.status}
          </span>
          {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-gray-200 px-3 pb-3 pt-3">
          <div className="text-xs text-gray-600">
            {phone ? <span className="mr-3">{phone}</span> : <span className="mr-3 italic text-gray-400">No phone on file</span>}
            {email ? <span>{email}</span> : <span className="italic text-gray-400">No email on file</span>}
            {worked && !invoicePaid && (
              <p className="mt-1">
                {invoiceSent
                  ? `Invoice ${booking.invoiceStatus}${owed > 0 ? ` · $${owed.toLocaleString()} still owed` : ''}`
                  : "No invoice from this vendor yet."}
              </p>
            )}
            {invoicePaid && <p className="mt-1 text-emerald-700">Paid</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            {phone ? (
              <Link href={smsHref()} className={actionClass}>
                <MessageSquare className="h-3.5 w-3.5" /> Text
              </Link>
            ) : null}
            {phone ? (
              <a href={`tel:${phone}`} className={actionClass}>
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
            ) : null}
            {email ? (
              <a href={`mailto:${email}`} className={actionClass}>
                <Mail className="h-3.5 w-3.5" /> Email
              </a>
            ) : null}
            {worked && !invoiceSent && phone ? (
              <Link href={smsHref('&intent=invoice-request')} className={`${actionClass} border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100`}>
                <Receipt className="h-3.5 w-3.5" /> Request invoice
              </Link>
            ) : null}
            {invoiceSent && booking.invoiceId ? (
              <Link href={`/dashboard/vendor-invoices/${booking.invoiceId}`} className={actionClass}>
                <Receipt className="h-3.5 w-3.5" /> View invoice
              </Link>
            ) : null}
            {invoiceSent && !invoicePaid ? (
              <Link href="/dashboard/vendors/payments" className={actionClass}>
                <CreditCard className="h-3.5 w-3.5" /> Pay vendor
              </Link>
            ) : null}
            {worked ? (
              <Link href={`/dashboard/invoices/new?vendorBookingId=${booking.id}`} className={actionClass}>
                <FilePlus2 className="h-3.5 w-3.5" /> Create invoice
              </Link>
            ) : null}
            <Link href={`/dashboard/vendors/${booking.vendor_account_id}`} className={actionClass}>
              <UserRound className="h-3.5 w-3.5" /> View profile
            </Link>
          </div>
          {!phone && !email && (
            <p className="text-xs text-gray-500">This vendor hasn&apos;t added contact details, so texting, calling and email aren&apos;t available.</p>
          )}
        </div>
      )}
    </div>
  )
}
