'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Ban, ChevronDown, ChevronRight, Mail, MessageSquare, Phone, Receipt, UserRound, FilePlus2, CreditCard } from 'lucide-react'
import api from '@/lib/api'

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
  cancelled: 'bg-red-100 text-red-700',
}

const actionClass =
  'inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50'

/** A booked vendor on an event; click it to text, call, email, chase or review their invoice. */
export default function EventVendorRow({
  booking,
  eventId,
  onChanged,
}: {
  booking: EventVendorBooking
  eventId: string
  /** Called after the booking was cancelled so the page can reload vendors and notes. */
  onChanged?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const vendor = booking.vendor_accounts
  const name = vendor?.business_name || 'Vendor'
  const phone = vendor?.phone || null
  const email = vendor?.email || null

  const worked = booking.status === 'confirmed' || booking.status === 'completed'
  const invoiceSent = !!booking.invoiceId && booking.invoiceStatus !== 'draft'
  const invoicePaid = booking.invoiceStatus === 'paid' || booking.status === 'paid'
  const smsHref = (extra = '') =>
    `/dashboard/messages/send?eventId=${eventId}&vendorBookingId=${booking.id}${extra}`
  // Money has already moved on paid bookings, so those can't be cancelled from here.
  const canCancel = (booking.status === 'pending' || booking.status === 'confirmed') && !invoicePaid
  const owed = Math.max(Number(booking.agreed_amount || 0) - Number(booking.total_paid || 0), 0)

  const closeCancel = () => { setCancelling(false); setReason(''); setError(null) }

  const cancelBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.put(`/vendors/bookings/${booking.id}`, { status: 'cancelled' })
      const why = reason.trim()
      try {
        await api.post(`/event-notes/event/${eventId}`, {
          content: `Vendor booking cancelled: ${name}${why ? ` \u2014 ${why}` : ''}`,
        })
      } catch {
        // The booking is already cancelled; a missing note shouldn't undo that.
      }
      closeCancel()
      onChanged?.()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Could not cancel this booking. Please try again.')
    } finally {
      setBusy(false)
    }
  }

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
            {canCancel ? (
              <button
                type="button"
                onClick={() => setCancelling(true)}
                className={`${actionClass} border-red-200 text-red-700 hover:bg-red-50`}
              >
                <Ban className="h-3.5 w-3.5" /> Cancel booking
              </button>
            ) : null}
          </div>
          {!phone && !email && (
            <p className="text-xs text-gray-500">This vendor hasn&apos;t added contact details, so texting, calling and email aren&apos;t available.</p>
          )}
        </div>
      )}

      {cancelling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby={`cancel-booking-${booking.id}`}>
          <form onSubmit={cancelBooking} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id={`cancel-booking-${booking.id}`} className="text-lg font-bold text-gray-900">Cancel {name}&apos;s booking?</h2>
            <p className="mt-1 text-sm text-gray-600">
              {name} is texted that the booking was cancelled, and a note is added to this event.
              {invoiceSent ? ' Their invoice stays open until it is cancelled or paid.' : ''}
            </p>
            <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor={`cancel-booking-reason-${booking.id}`}>Reason (optional)</label>
            <textarea
              id={`cancel-booking-reason-${booking.id}`}
              autoFocus
              rows={3}
              maxLength={500}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Switched to a different DJ"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={closeCancel} disabled={busy} className="rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Keep booking</button>
              <button type="submit" disabled={busy} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {busy ? 'Cancelling…' : 'Cancel booking'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
