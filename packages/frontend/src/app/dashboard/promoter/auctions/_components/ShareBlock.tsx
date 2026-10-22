'use client'

import { useState } from 'react'
import { Copy, ExternalLink, Gift, Share2 } from 'lucide-react'
import { useOrganization } from './useOrganization'
import {
  Auction,
  PHASE_LABEL,
  PHASE_STYLE,
  usePublicOrigin,
  auctionPhase,
  donationPath,
  donationsOpen,
  publicAuctionPath,
} from '../lib'

function CopyRow({ label, path, icon }: { label: string; path: string; icon?: React.ReactNode }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const origin = usePublicOrigin()
  const url = `${origin}${path}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setState('copied')
    } catch {
      setState('failed')
    }
    setTimeout(() => setState('idle'), 2500)
  }

  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">{icon}{label}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input readOnly aria-label={label} value={url} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800" />
        <div className="flex gap-2">
          <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700">
            <Copy className="h-4 w-4" /> {state === 'copied' ? 'Copied' : 'Copy'}
          </button>
          <a href={path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <ExternalLink className="h-4 w-4" /> Open
          </a>
        </div>
      </div>
      <p role="status" className="mt-1 min-h-[1rem] text-xs text-gray-500">
        {state === 'copied' && 'Link copied to your clipboard.'}
        {state === 'failed' && 'Could not copy automatically. Select the link and copy it.'}
      </p>
    </div>
  )
}

/** Prominent sharing block for the auction overview. */
export default function ShareBlock({ auction, itemCount }: { auction: Auction; itemCount?: number }) {
  const { org } = useOrganization()
  const phase = auctionPhase(auction, itemCount)
  const canonical = !!(auction.slug && (auction.org_slug || org?.slug))
  const mainPath = publicAuctionPath(auction, org?.slug)
  const showDonate = canonical && donationsOpen(auction)

  return (
    <section aria-labelledby="share-heading" className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 id="share-heading" className="flex items-center gap-2 text-base font-semibold text-gray-900"><Share2 className="h-4 w-4 text-purple-600" /> Share this auction</h2>
        {phase ? (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PHASE_STYLE[phase]}`}>Public: {PHASE_LABEL[phase]}</span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">Not public yet</span>
        )}
      </div>

      {!phase ? (
        <p className="text-sm text-gray-600">
          {auction.status === 'cancelled'
            ? 'A cancelled auction has no public page.'
            : 'This auction has no public page yet. Publish the auction, or turn on "Publish cause page" in Settings to share it before bidding opens.'}
        </p>
      ) : (
        <div className="space-y-4">
          <CopyRow label="Public auction link" path={mainPath} />
          {!canonical && (
            <p className="text-xs text-gray-500">
              This is the legacy link. Set an auction URL in Settings (and create your organization page) for a shorter link that is easier to share.
            </p>
          )}
          {showDonate && <CopyRow label="Item donation form" path={donationPath(auction, org?.slug)} icon={<Gift className="h-3.5 w-3.5" />} />}
          {auction.accepts_donations && !canonical && (
            <p className="text-xs text-amber-700">Set an auction URL in Settings to get a shareable item donation link.</p>
          )}
          {auction.accepts_donations && canonical && !showDonate && (
            <p className="text-xs text-gray-500">The donation form is closed, so donors can no longer submit items.</p>
          )}
        </div>
      )}
    </section>
  )
}
