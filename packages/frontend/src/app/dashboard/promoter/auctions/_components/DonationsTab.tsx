'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, CheckCircle2, ExternalLink, Pencil, X } from 'lucide-react'
import api from '@/lib/api'
import ConfirmDialog from './ConfirmDialog'
import DonationApproveModal from './DonationApproveModal'
import DonationEditModal from './DonationEditModal'
import { DonorAvatar, ItemPhotoPlaceholder } from '@/components/auction/PhotoPlaceholder'
import { ReportState } from './useReport'
import {
  AuctionItem,
  Donation,
  DonationStatus,
  FULFILLMENT_LABEL,
  errorMessage,
  formatDateTime,
  formatUsd,
} from '../lib'

const STATUSES: Array<{ id: DonationStatus; label: string }> = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'declined', label: 'Declined' },
]

const EMPTY_TEXT: Record<DonationStatus, string> = {
  pending: 'No donations waiting for review.',
  approved: 'No approved donations yet.',
  declined: 'No declined donations.',
}

interface Props {
  auctionId: string
  canWrite: boolean
  acceptsDonations: boolean
  /** Reload the auction (items and the pending badge) after a change. */
  onChanged: () => void
  onViewItems: () => void
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === '' || children === false) return null
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line break-words text-sm text-gray-800">{children}</dd>
    </div>
  )
}

function DonationCard({
  donation, canWrite, onEdit, onApprove, onDecline, onViewItems,
}: {
  donation: Donation
  canWrite: boolean
  onEdit: () => void
  onApprove: () => void
  onDecline: () => void
  onViewItems: () => void
}) {
  const d = donation
  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold text-gray-900">{d.title}</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Submitted {formatDateTime(d.created_at)} | Est. value {formatUsd(d.estimated_value_cents)}
          </p>
        </div>
        {d.status === 'pending' && canWrite && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"><Pencil className="h-3.5 w-3.5" /> Edit</button>
            <button type="button" onClick={onDecline} className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"><X className="h-3.5 w-3.5" /> Decline</button>
            <button type="button" onClick={onApprove} className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"><Check className="h-3.5 w-3.5" /> Approve</button>
          </div>
        )}
        {d.status === 'approved' && (
          <button type="button" onClick={onViewItems} className="inline-flex items-center gap-1 rounded-lg border border-purple-300 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50">
            <ExternalLink className="h-3.5 w-3.5" /> View item in Items tab
          </button>
        )}
      </div>

      {(!d.image_urls || d.image_urls.length === 0) && (
        <div className="mt-3 h-20 w-20 overflow-hidden rounded-lg border border-gray-200">
          <ItemPhotoPlaceholder compact label="No photos submitted" />
        </div>
      )}
      {d.image_urls?.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Photos">
          {d.image_urls.map((url, i) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="block h-20 w-20 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`${d.title} photo ${i + 1}`} className="h-full w-full object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <Detail label="Donor">
          <span className="flex items-center gap-2">
            <DonorAvatar name={d.donor_name} business={d.donor_business} size="sm" />
            <span>{d.donor_name}{d.donor_business ? ` (${d.donor_business})` : ''}</span>
          </span>
        </Detail>
        <Detail label="Contact">
          {d.donor_email && <a href={`mailto:${d.donor_email}`} className="block text-purple-700 hover:underline">{d.donor_email}</a>}
          {d.donor_phone && (
            <a href={`tel:${d.donor_phone}`} className="block text-purple-700 hover:underline">
              {d.donor_phone}{d.phone_verified_at ? ' (verified)' : ''}
            </a>
          )}
        </Detail>
        <div className="sm:col-span-2"><Detail label="Description">{d.description}</Detail></div>
        <Detail label="Category">{d.category}</Detail>
        <Detail label="Condition">{d.condition}</Detail>
        <Detail label="Specifications / size">{d.specifications}</Detail>
        <Detail label="What is included">{d.whats_included}</Detail>
        <Detail label="Restrictions">{d.restrictions}</Detail>
        <Detail label="Expires">{d.expires_on ? new Date(`${d.expires_on.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { dateStyle: 'medium' }) : null}</Detail>
        <Detail label="Fulfillment">
          {d.fulfillment_method ? FULFILLMENT_LABEL[d.fulfillment_method] ?? d.fulfillment_method : null}
          {d.fulfillment_details ? `${d.fulfillment_method ? ': ' : ''}${d.fulfillment_details}` : ''}
        </Detail>
        {d.is_experience && (
          <>
            <Detail label="Experience scheduling">{d.scheduling_requirements || 'Experience (no scheduling notes)'}</Detail>
            <Detail label="Blackout dates">{d.blackout_dates}</Detail>
          </>
        )}
        <Detail label="Public recognition">{d.recognition_ok ? 'Donor agreed to be recognized publicly.' : 'Donor asked NOT to be named publicly.'}</Detail>
        {d.status === 'declined' && <Detail label="Decline reason">{d.decline_reason || 'No reason given.'}</Detail>}
      </dl>
    </li>
  )
}

export default function DonationsTab({ auctionId, canWrite, acceptsDonations, onChanged, onViewItems }: Props) {
  const [status, setStatus] = useState<DonationStatus>('pending')
  const [rows, setRows] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState<Donation | null>(null)
  const [approving, setApproving] = useState<Donation | null>(null)
  const [declining, setDeclining] = useState<Donation | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [declineError, setDeclineError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<Donation[] | { donations?: Donation[] }>(`/auctions/manage/${auctionId}/donations`, { params: { status } })
      const data = res.data
      setRows(Array.isArray(data) ? data : data?.donations ?? [])
    } catch (err) {
      setError(errorMessage(err, 'Could not load donations.'))
    } finally {
      setLoading(false)
    }
  }, [auctionId, status])

  useEffect(() => {
    load()
  }, [load])

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id))

  const decline = async () => {
    if (!declining) return
    setBusy(true)
    setDeclineError(null)
    try {
      await api.post(`/auctions/manage/donations/${declining.id}/decline`, reason.trim() ? { reason: reason.trim() } : {})
      removeRow(declining.id)
      setNotice(`Declined "${declining.title}".`)
      setDeclining(null)
      setReason('')
      onChanged()
    } catch (err) {
      setDeclineError(errorMessage(err, 'Could not decline the donation.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {!acceptsDonations && (
        <p className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
          This auction is not accepting item donations right now. Turn on &quot;Accept item donations&quot; in Settings to share a donation form. Past submissions appear here.
        </p>
      )}

      <div role="tablist" aria-label="Donation status" className="mb-4 flex gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={status === s.id}
            onClick={() => { setStatus(s.id); setNotice(null) }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${status === s.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {notice && (
        <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4" /> {notice}
          {notice.startsWith('Approved') && (
            <button type="button" onClick={onViewItems} className="font-medium underline">View in Items tab</button>
          )}
        </div>
      )}

      {loading || error || rows.length === 0 ? (
        <ReportState loading={loading} error={error} onRetry={load} empty={rows.length === 0} emptyText={EMPTY_TEXT[status]} />
      ) : (
        <ul className="grid gap-4">
          {rows.map((d) => (
            <DonationCard
              key={d.id}
              donation={d}
              canWrite={canWrite}
              onEdit={() => setEditing(d)}
              onApprove={() => setApproving(d)}
              onDecline={() => { setDeclining(d); setReason(''); setDeclineError(null) }}
              onViewItems={onViewItems}
            />
          ))}
        </ul>
      )}

      {editing && (
        <DonationEditModal
          donation={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)))
            setEditing(null)
            setNotice(null)
          }}
        />
      )}

      {approving && (
        <DonationApproveModal
          donation={approving}
          onClose={() => setApproving(null)}
          onApproved={(donation: Donation, item: AuctionItem | null) => {
            removeRow(donation.id)
            setApproving(null)
            setNotice(`Approved "${donation.title}"${item?.title ? ` and added it as item "${item.title}"` : ''}.`)
            onChanged()
          }}
        />
      )}

      <ConfirmDialog
        open={!!declining}
        title="Decline this donation"
        message={`Decline "${declining?.title ?? ''}"? It is not added to the auction.`}
        confirmLabel="Decline donation"
        danger
        busy={busy}
        error={declineError}
        onConfirm={decline}
        onCancel={() => { setDeclining(null); setDeclineError(null) }}
      >
        <label htmlFor="decline-reason" className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
        <textarea id="decline-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
      </ConfirmDialog>
    </div>
  )
}
