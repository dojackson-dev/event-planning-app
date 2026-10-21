'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, ExternalLink, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import ConfirmDialog from '../_components/ConfirmDialog'
import GalleryManager from '../_components/organization/GalleryManager'
import OrgProfileForm from '../_components/organization/OrgProfileForm'
import SponsorsManager from '../_components/organization/SponsorsManager'
import { AuctionOrganization, errorMessage, normalizeOrganization } from '../lib'

export default function OrganizationPage() {
  const router = useRouter()
  const [org, setOrg] = useState<AuctionOrganization | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [leaveTo, setLeaveTo] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/auctions/manage/organization')
      setOrg(normalizeOrganization(res.data))
    } catch (err) {
      setError(errorMessage(err, 'Could not load your organization page.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const handleSaved = useCallback((saved: AuctionOrganization) => {
    // The save response may omit the gallery and sponsors; keep what the managers already hold.
    setOrg((prev) => (prev ? { ...saved, gallery: prev.gallery, sponsors: prev.sponsors } : saved))
  }, [])

  const goBack = (e: React.MouseEvent) => {
    if (!dirty) return
    e.preventDefault()
    setLeaveTo('/dashboard/promoter/auctions')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" aria-label="Loading organization page" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{error}</p>
            <button onClick={load} className="mt-2 font-medium underline">Try again</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <Link href="/dashboard/promoter/auctions" onClick={goBack} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to auctions
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization page</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your cause story, photos and sponsors. It is shared by every auction you run, so supporters see the same story everywhere.
          </p>
        </div>
        {org?.is_published && org.slug && (
          <a href={`/auctions/${org.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:underline">
            <ExternalLink className="h-4 w-4" /> View public page
          </a>
        )}
      </div>

      <div className="space-y-6">
        <OrgProfileForm initial={org} onSaved={handleSaved} onDirtyChange={setDirty} />
        {org ? (
          <>
            <GalleryManager key={`gallery-${org.id}`} initial={org.gallery} />
            <SponsorsManager key={`sponsors-${org.id}`} initial={org.sponsors} />
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-500">
            Save your organization page to add a photo gallery and sponsors.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={!!leaveTo}
        title="Discard unsaved changes?"
        message="You have changes to your organization page that are not saved."
        confirmLabel="Discard and leave"
        danger
        onConfirm={() => { const to = leaveTo; setDirty(false); setLeaveTo(null); if (to) router.push(to) }}
        onCancel={() => setLeaveTo(null)}
      />
    </div>
  )
}
