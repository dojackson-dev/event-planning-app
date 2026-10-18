'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AlertCircle, ArrowLeft, Copy, ExternalLink, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import AuctionForm, { AuctionFormValues } from '../_components/AuctionForm'
import BiddersTab from '../_components/BiddersTab'
import BidsTab from '../_components/BidsTab'
import ConfirmDialog from '../_components/ConfirmDialog'
import ItemsTab from '../_components/ItemsTab'
import OrdersTab from '../_components/OrdersTab'
import OverviewTab from '../_components/OverviewTab'
import {
  AUCTION_STATUS_LABEL,
  AUCTION_STATUS_STYLE,
  AuctionDetail,
  EDITABLE_AUCTION_STATUSES,
  errorMessage,
  formatDateTime,
  httpStatus,
} from '../lib'

type Tab = 'overview' | 'items' | 'bids' | 'bidders' | 'orders' | 'settings'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'items', label: 'Items' },
  { id: 'bids', label: 'Bids' },
  { id: 'bidders', label: 'Bidders' },
  { id: 'orders', label: 'Orders' },
  { id: 'settings', label: 'Settings' },
]

interface PublishIssues {
  message: string
  issues: string[]
}

export default function ManageAuctionPage() {
  const { id } = useParams<{ id: string }>()
  const [auction, setAuction] = useState<AuctionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<Tab>('overview')
  const [refreshKey, setRefreshKey] = useState(0)
  const [canWrite, setCanWrite] = useState(true)
  const [confirm, setConfirm] = useState<'publish' | 'cancel' | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [issues, setIssues] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyPublicLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/auctions/${id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const load = useCallback(async () => {
    try {
      setError(null)
      const res = await api.get<AuctionDetail>(`/auctions/manage/${id}`)
      setAuction(res.data)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      if (httpStatus(err) === 404) setNotFound(true)
      else setError(errorMessage(err, 'Could not load this auction.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    // Staff see everything but cannot change anything; the API enforces this too.
    api
      .get<{ role: string | null }>('/promoter-team/me')
      .then((res) => setCanWrite(res.data?.role !== 'staff'))
      .catch(() => setCanWrite(true))
  }, [])

  const runAction = async () => {
    if (!confirm) return
    setBusy(true)
    setActionError(null)
    setIssues([])
    try {
      await api.post(`/auctions/manage/${id}/${confirm}`)
      setConfirm(null)
      await load()
    } catch (err) {
      const data = (err as { response?: { data?: PublishIssues } })?.response?.data
      if (data?.issues?.length) setIssues(data.issues)
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const saveSettings = async (values: AuctionFormValues) => {
    await api.put(`/auctions/manage/${id}`, values)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    await load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" aria-label="Loading auction" />
      </div>
    )
  }

  if (notFound || !auction) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <p className="text-gray-600 mb-3">{notFound ? 'Auction not found.' : error ?? 'Could not load this auction.'}</p>
        {!notFound && <button onClick={load} className="text-sm font-medium text-purple-600 underline mr-4">Try again</button>}
        <Link href="/dashboard/promoter/auctions" className="text-sm text-purple-600 hover:underline">Back to auctions</Link>
      </div>
    )
  }

  const editable = canWrite && EDITABLE_AUCTION_STATUSES.includes(auction.status)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/dashboard/promoter/auctions" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to auctions
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{auction.title}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${AUCTION_STATUS_STYLE[auction.status]}`}>{AUCTION_STATUS_LABEL[auction.status]}</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {formatDateTime(auction.starts_at)} to {formatDateTime(auction.ends_at)}
            {auction.event_title ? ` | ${auction.event_title}` : ''}
          </p>
          {!canWrite && <p className="mt-1 text-xs text-gray-400">You have view-only access.</p>}
          {auction.status === 'draft' ? (
            <p className="mt-2 text-sm text-gray-500">Not public yet. Publish the auction to get a bidder link.</p>
          ) : auction.status !== 'cancelled' ? (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              <a href={`/auctions/${auction.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-purple-600 hover:underline">
                <ExternalLink className="h-4 w-4" /> View public page
              </a>
              <button onClick={copyPublicLink} className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900">
                <Copy className="h-4 w-4" /> {copied ? 'Link copied' : 'Copy link'}
              </button>
            </div>
          ) : null}
        </div>
        {editable && (
          <div className="flex gap-2">
            {auction.status === 'draft' && (
              <button onClick={() => setConfirm('publish')} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700">
                Publish
              </button>
            )}
            <button onClick={() => setConfirm('cancel')} className="border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50">
              Cancel auction
            </button>
          </div>
        )}
      </div>

      <div role="tablist" aria-label="Auction sections" className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === t.id ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab auctionId={auction.id} refreshKey={refreshKey} />}
      {tab === 'items' && <ItemsTab auction={auction} canWrite={canWrite} onChanged={load} />}
      {tab === 'bids' && <BidsTab auctionId={auction.id} refreshKey={refreshKey} />}
      {tab === 'bidders' && <BiddersTab auctionId={auction.id} canWrite={canWrite} refreshKey={refreshKey} />}
      {tab === 'orders' && <OrdersTab auctionId={auction.id} canWrite={canWrite} refreshKey={refreshKey} />}
      {tab === 'settings' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-3xl">
          {!editable && (
            <p className="mb-4 flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              <AlertCircle className="h-4 w-4" />
              {canWrite ? `A ${AUCTION_STATUS_LABEL[auction.status].toLowerCase()} auction can no longer be edited.` : 'You have view-only access.'}
            </p>
          )}
          {saved && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">Saved.</p>}
          <AuctionForm
            key={`${auction.id}-${refreshKey}`}
            initial={auction}
            submitLabel="Save changes"
            startLocked={auction.status === 'live'}
            disabled={!editable}
            onSubmit={saveSettings}
          />
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm === 'publish' ? 'Publish this auction' : 'Cancel this auction'}
        message={
          confirm === 'publish'
            ? 'Publishing makes the auction visible to bidders. Items can still be added, but pricing locks once an item has bids. Make sure your Stripe account is connected.'
            : 'Cancelling stops all bidding. Bidders are not notified automatically, and orders that already exist must be cancelled or refunded first.'
        }
        confirmLabel={confirm === 'publish' ? 'Publish' : 'Cancel auction'}
        danger={confirm === 'cancel'}
        busy={busy}
        error={actionError}
        onConfirm={runAction}
        onCancel={() => { setConfirm(null); setActionError(null); setIssues([]) }}
      >
        {issues.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-red-600">
            {issues.map((i) => <li key={i}>{i}</li>)}
          </ul>
        )}
      </ConfirmDialog>
    </div>
  )
}
