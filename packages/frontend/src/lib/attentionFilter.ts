'use client'

import { useEffect, useState } from 'react'

/** Reads ?attention= (set by the dashboard assistant's links) and lets the page clear it. */
export function useAttentionFilter(): [string | null, () => void] {
  const [attention, setAttention] = useState<string | null>(null)

  useEffect(() => {
    setAttention(new URLSearchParams(window.location.search).get('attention'))
  }, [])

  const clear = () => {
    setAttention(null)
    window.history.replaceState(null, '', window.location.pathname)
  }

  return [attention, clear]
}

const todayIso = () => new Date().toISOString().slice(0, 10)
const plusDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)

/** These mirror the assistant's task definitions on the backend so the list matches the count shown. */
export const INVOICE_ATTENTION: Record<string, { label: string; match: (inv: any) => boolean }> = {
  overdue: {
    label: 'Overdue invoices',
    match: inv => isOpenInvoice(inv) && !!inv.due_date && String(inv.due_date).slice(0, 10) < todayIso(),
  },
  'due-soon': {
    label: 'Invoices due in the next 7 days',
    match: inv => {
      const due = inv.due_date ? String(inv.due_date).slice(0, 10) : ''
      return isOpenInvoice(inv) && due >= todayIso() && due <= plusDays(7)
    },
  },
  unsent: { label: 'Draft invoices not yet sent', match: inv => inv.status === 'draft' },
}

export const ESTIMATE_ATTENTION: Record<string, { label: string; match: (e: any) => boolean }> = {
  approved: { label: 'Approved estimates ready to turn into invoices', match: e => e.status === 'approved' },
  awaiting: { label: 'Estimates waiting on a client response', match: e => e.status === 'sent' },
  unsent: { label: 'Draft estimates not yet sent', match: e => e.status === 'draft' },
}

export const CONTRACT_ATTENTION: Record<string, { label: string; match: (c: any) => boolean }> = {
  unsigned: { label: 'Contracts waiting for a signature', match: c => c.status === 'sent' },
  unsent: { label: 'Draft contracts not yet sent', match: c => c.status === 'draft' },
}

function isOpenInvoice(inv: any) {
  return inv.status !== 'draft' && inv.status !== 'paid' && inv.status !== 'cancelled' && Number(inv.amount_due ?? 0) > 0
}
