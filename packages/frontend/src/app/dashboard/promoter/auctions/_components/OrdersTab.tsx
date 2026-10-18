'use client'

import { useState } from 'react'
import api from '@/lib/api'
import ConfirmDialog from './ConfirmDialog'
import { ReportState, useReport } from './useReport'
import {
  OrderRow,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  RETRYABLE_ORDER_STATUSES,
  UNPAID_ORDER_STATUSES,
  errorMessage,
  formatDateTime,
  formatUsd,
} from '../lib'

interface Props {
  auctionId: string
  canWrite: boolean
  refreshKey: number
}

type Action = 'retry' | 'paylink' | 'offline' | 'cancel'

const COPY: Record<Action, { title: string; label: string; danger: boolean; text: (o: OrderRow) => string }> = {
  retry: {
    title: 'Retry the charge',
    label: 'Retry charge',
    danger: false,
    text: (o) => `Charge ${o.buyer_name}'s saved card ${formatUsd(o.total_cents || o.subtotal_cents)} again now?`,
  },
  paylink: {
    title: 'Send a pay link',
    label: 'Send pay link',
    danger: false,
    text: (o) => `Email and text ${o.buyer_name} a secure link to pay ${formatUsd(o.total_cents || o.subtotal_cents)}.`,
  },
  offline: {
    title: 'Mark as paid offline',
    label: 'Mark as paid',
    danger: false,
    text: (o) => `Record that ${o.buyer_name} paid ${formatUsd(o.subtotal_cents)} outside the platform (cash, check). No card is charged and no receipt is sent by the platform.`,
  },
  cancel: {
    title: 'Cancel the order',
    label: 'Cancel order',
    danger: true,
    text: (o) => `Cancel ${o.buyer_name}'s order? The item is not re-offered automatically. This cannot be undone.`,
  },
}

export default function OrdersTab({ auctionId, canWrite, refreshKey }: Props) {
  const [version, setVersion] = useState(0)
  const { data, loading, error, reload } = useReport<OrderRow[]>(`/auctions/manage/${auctionId}/orders?k=${refreshKey}-${version}`, [])
  const [target, setTarget] = useState<{ order: OrderRow; action: Action } | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const close = () => {
    setTarget(null)
    setNote('')
    setActionError(null)
  }

  const confirm = async () => {
    if (!target) return
    const { order, action } = target
    setBusy(true)
    setActionError(null)
    try {
      const base = `/auctions/manage/orders/${order.id}`
      if (action === 'retry') {
        const res = await api.post<{ status?: string }>(`${base}/retry-charge`)
        setNotice(`Charge attempted. Result: ${res.data?.status ?? 'unknown'}.`)
      } else if (action === 'paylink') {
        await api.post(`${base}/send-pay-link`)
        setNotice('Pay link sent.')
      } else if (action === 'offline') {
        await api.post(`${base}/mark-paid-offline`, { note: note.trim() || undefined })
        setNotice('Order marked as paid.')
      } else {
        await api.post(`${base}/cancel`)
        setNotice('Order cancelled.')
      }
      close()
      setVersion((v) => v + 1)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const download = async () => {
    try {
      const res = await api.get<Blob>(`/auctions/manage/${auctionId}/export.csv`, { params: { type: 'orders' }, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'auction-orders.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setNotice(errorMessage(err, 'Could not download the export.'))
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-green-700">{notice}</p>
        <button onClick={download} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Download CSV</button>
      </div>

      <ReportState loading={loading} error={error} onRetry={reload} empty={!loading && !error && data.length === 0} emptyText="No orders yet. Orders are created when items sell or the auction settles." />
      {!loading && !error && data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2">Buyer</th>
                <th className="px-4 py-2">Items</th>
                <th className="px-4 py-2 text-right">Amounts</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((o) => {
                const unpaid = UNPAID_ORDER_STATUSES.includes(o.status)
                return (
                  <tr key={o.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{o.buyer_name}</p>
                      <p className="text-xs text-gray-500">{o.buyer_email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {o.items.map((l) => (
                        <p key={l.id}>{l.lot_number ? `Lot ${l.lot_number}: ` : ''}{l.title}{l.quantity > 1 ? ` x${l.quantity}` : ''}</p>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600">
                      <p className="text-sm font-medium text-gray-800">{formatUsd(o.total_cents || o.subtotal_cents)}</p>
                      <p>Items {formatUsd(o.subtotal_cents)}</p>
                      {o.tax_cents > 0 && <p>Tax {formatUsd(o.tax_cents)}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ORDER_STATUS_STYLE[o.status] ?? 'bg-gray-100 text-gray-700'}`}>{ORDER_STATUS_LABEL[o.status] ?? o.status}</span>
                      {o.status === 'paid' && <p className="mt-1 text-xs text-gray-500">{formatDateTime(o.paid_at)}</p>}
                      {unpaid && <p className="mt-1 text-xs text-gray-500">Pay by {formatDateTime(o.pay_by_at)}</p>}
                      {o.last_error_code && unpaid && <p className="mt-1 text-xs text-red-600">Last error: {o.last_error_code}</p>}
                      {o.charge_attempts > 0 && unpaid && <p className="text-xs text-gray-400">{o.charge_attempts} attempt{o.charge_attempts === 1 ? '' : 's'}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canWrite && unpaid && (
                        <div className="flex flex-col items-end gap-1 text-xs font-medium">
                          {RETRYABLE_ORDER_STATUSES.includes(o.status) && <button onClick={() => setTarget({ order: o, action: 'retry' })} className="text-purple-600 hover:underline">Retry charge</button>}
                          <button onClick={() => setTarget({ order: o, action: 'paylink' })} className="text-purple-600 hover:underline">Send pay link</button>
                          <button onClick={() => setTarget({ order: o, action: 'offline' })} className="text-gray-600 hover:underline">Mark paid offline</button>
                          <button onClick={() => setTarget({ order: o, action: 'cancel' })} className="text-red-600 hover:underline">Cancel order</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!target}
        title={target ? COPY[target.action].title : ''}
        message={target ? COPY[target.action].text(target.order) : ''}
        confirmLabel={target ? COPY[target.action].label : ''}
        danger={target ? COPY[target.action].danger : false}
        busy={busy}
        error={actionError}
        onConfirm={confirm}
        onCancel={close}
      >
        {target?.action === 'offline' && (
          <div>
            <label htmlFor="offline-note" className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <input id="offline-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Check #1042" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}
