'use client'

import { useState } from 'react'
import api from '@/lib/api'
import ConfirmDialog from './ConfirmDialog'
import { ReportState, useReport } from './useReport'
import { BidderRow, errorMessage, formatUsd } from '../lib'

interface Props {
  auctionId: string
  canWrite: boolean
  refreshKey: number
}

const CARD_LABEL: Record<BidderRow['card_status'], string> = {
  none: 'No card',
  pending: 'Card pending',
  ready: 'Card ready',
  failed: 'Card failed',
}

export default function BiddersTab({ auctionId, canWrite, refreshKey }: Props) {
  const [version, setVersion] = useState(0)
  const { data, loading, error, reload } = useReport<BidderRow[]>(`/auctions/manage/${auctionId}/bidders?k=${refreshKey}-${version}`, [])
  const [target, setTarget] = useState<{ bidder: BidderRow; block: boolean } | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const close = () => {
    setTarget(null)
    setReason('')
    setActionError(null)
  }

  const confirm = async () => {
    if (!target) return
    setBusy(true)
    setActionError(null)
    try {
      if (target.block) await api.post(`/auctions/manage/bidders/${target.bidder.id}/block`, { reason: reason.trim() || undefined })
      else await api.post(`/auctions/manage/bidders/${target.bidder.id}/unblock`)
      close()
      setVersion((v) => v + 1)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <ReportState loading={loading} error={error} onRetry={reload} empty={!loading && !error && data.length === 0} emptyText="No bidders have registered yet." />
      {!loading && !error && data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2">Paddle</th>
                <th className="px-4 py-2">Bidder</th>
                <th className="px-4 py-2">Verified</th>
                <th className="px-4 py-2">Card</th>
                <th className="px-4 py-2 text-right">Limit</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((b) => (
                <tr key={b.id} className={b.blocked ? 'bg-red-50/50' : ''}>
                  <td className="px-4 py-2">{b.paddle_number ?? '-'}</td>
                  <td className="px-4 py-2">
                    <p className="font-medium text-gray-800">{b.display_name}</p>
                    <p className="text-xs text-gray-500">{b.email} | {b.phone_e164}</p>
                    {b.blocked && <p className="text-xs text-red-600">Blocked{b.blocked_reason ? `: ${b.blocked_reason}` : ''}</p>}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600">
                    <p>{b.email_verified_at ? 'Email verified' : 'Email unverified'}</p>
                    <p>{b.phone_verified_at ? 'Phone verified' : 'Phone unverified'}</p>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600">
                    {CARD_LABEL[b.card_status]}
                    {b.card_last4 && <span className="block">{b.card_brand} ending {b.card_last4}</span>}
                  </td>
                  <td className="px-4 py-2 text-right">{formatUsd(b.exposure_limit_cents)}</td>
                  <td className="px-4 py-2 text-right">
                    {canWrite && (
                      <button onClick={() => setTarget({ bidder: b, block: !b.blocked })} className={`text-xs font-medium hover:underline ${b.blocked ? 'text-purple-600' : 'text-red-600'}`}>
                        {b.blocked ? 'Unblock' : 'Block'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!target}
        title={target?.block ? 'Block bidder' : 'Unblock bidder'}
        message={
          target?.block
            ? `Block ${target?.bidder.display_name}? They can no longer bid or buy in this auction.`
            : `Allow ${target?.bidder.display_name} to bid again?`
        }
        confirmLabel={target?.block ? 'Block bidder' : 'Unblock'}
        danger={!!target?.block}
        busy={busy}
        error={actionError}
        onConfirm={confirm}
        onCancel={close}
      >
        {target?.block && (
          <div>
            <label htmlFor="block-reason" className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
            <input id="block-reason" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}
