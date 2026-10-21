'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import api from '@/lib/api'
import ImageUploadField from './ImageUploadField'
import { useOrganization } from './useOrganization'
import {
  Auction,
  PUBLIC_SITE_ORIGIN,
  centsToDollars,
  dollarsToCents,
  errorMessage,
  isoToLocalInput,
  localInputToIso,
  slugProblem,
  slugify,
  timezoneLabel,
} from '../lib'

interface EventOption {
  id: string
  title: string
  event_date: string
}

export interface AuctionFormValues {
  title: string
  description: string | null
  public_event_id?: string | null
  starts_at?: string | null
  ends_at: string | null
  anti_snipe_window_seconds: number
  anti_snipe_extension_seconds: number
  payment_grace_hours: number
  default_exposure_limit_cents: number
  // Only sent when the organization-page backend is available.
  slug?: string | null
  cover_image_url?: string | null
  accepts_donations?: boolean
  donations_close_at?: string | null
  page_published?: boolean
}

interface Props {
  initial?: Auction
  submitLabel: string
  /** Fields that cannot change once an auction is live. */
  startLocked?: boolean
  disabled?: boolean
  onSubmit: (values: AuctionFormValues) => Promise<void>
}

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:text-gray-500'

export default function AuctionForm({ initial, submitLabel, startLocked, disabled, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [eventId, setEventId] = useState(initial?.public_event_id ?? '')
  const [startsAt, setStartsAt] = useState(isoToLocalInput(initial?.starts_at))
  const [endsAt, setEndsAt] = useState(isoToLocalInput(initial?.ends_at))
  const [windowMinutes, setWindowMinutes] = useState(String((initial?.anti_snipe_window_seconds ?? 300) / 60))
  const [extensionMinutes, setExtensionMinutes] = useState(String((initial?.anti_snipe_extension_seconds ?? 300) / 60))
  const [graceHours, setGraceHours] = useState(String(initial?.payment_grace_hours ?? 72))
  const [exposure, setExposure] = useState(centsToDollars(initial?.default_exposure_limit_cents ?? 500000))
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(!!initial)
  const [coverUrl, setCoverUrl] = useState<string | null>(initial?.cover_image_url ?? null)
  const [acceptsDonations, setAcceptsDonations] = useState(initial?.accepts_donations ?? false)
  const [donationsCloseAt, setDonationsCloseAt] = useState(isoToLocalInput(initial?.donations_close_at))
  const [pagePublished, setPagePublished] = useState(initial?.page_published ?? false)
  const [uploading, setUploading] = useState(false)
  const { org, loading: orgLoading, failed: orgFailed } = useOrganization()
  const [events, setEvents] = useState<EventOption[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<EventOption[]>('/promoter-events/mine')
      .then((res) => setEvents(res.data ?? []))
      .catch(() => setEvents([]))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const exposureCents = dollarsToCents(exposure)
    const window = Number(windowMinutes)
    const extension = Number(extensionMinutes)
    const grace = Number(graceHours)

    if (!title.trim()) return setError('Enter a title.')
    if (exposureCents === null || exposureCents < 100) return setError('The bidder exposure limit must be at least $1.00.')
    if (![window, extension].every((n) => Number.isFinite(n) && n >= 0 && n <= 60)) {
      return setError('Anti-sniping minutes must be between 0 and 60.')
    }
    if (!Number.isInteger(grace) || grace < 1 || grace > 720) return setError('Payment grace must be 1 to 720 hours.')

    const endIso = localInputToIso(endsAt)
    const startIso = localInputToIso(startsAt)
    if (endsAt && !endIso) return setError('Enter a valid end time.')
    if (startsAt && !startIso) return setError('Enter a valid start time.')
    if (startIso && endIso && new Date(endIso) <= new Date(startIso)) return setError('The end time must be after the start time.')

    const values: AuctionFormValues = {
      title: title.trim(),
      description: description.trim() || null,
      ends_at: endIso,
      anti_snipe_window_seconds: Math.round(window * 60),
      anti_snipe_extension_seconds: Math.round(extension * 60),
      payment_grace_hours: grace,
      default_exposure_limit_cents: exposureCents,
    }
    if (!startLocked) {
      values.starts_at = startIso
      values.public_event_id = eventId || null
    }

    if (pageFieldsAvailable) {
      const trimmedSlug = slug.trim()
      if (trimmedSlug) {
        const problem = slugProblem(trimmedSlug)
        if (problem) return setError(`Auction URL: ${problem}`)
      } else if (pagePublished || acceptsDonations) {
        return setError('Enter an auction URL to publish the cause page or accept item donations.')
      }
      const closeIso = localInputToIso(donationsCloseAt)
      if (acceptsDonations && donationsCloseAt && !closeIso) return setError('Enter a valid donations close time.')
      values.slug = trimmedSlug || null
      values.cover_image_url = coverUrl
      values.accepts_donations = acceptsDonations
      values.donations_close_at = acceptsDonations ? closeIso : null
      values.page_published = pagePublished
    }

    try {
      setSaving(true)
      await onSubmit(values)
    } catch (err) {
      setError(errorMessage(err, 'Could not save the auction.'))
    } finally {
      setSaving(false)
    }
  }

  const locked = disabled || saving || uploading
  // Hidden entirely when the endpoint is missing (old backend) so existing auctions keep working.
  const pageFieldsAvailable = !orgFailed && !orgLoading && !!org
  const orgSlug = org?.slug ?? initial?.org_slug ?? ''

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div>
        <label htmlFor="auction-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input id="auction-title" className={inputClass} value={title} maxLength={200} onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)) }} disabled={locked} required />
      </div>

      <div>
        <label htmlFor="auction-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea id="auction-description" className={inputClass} rows={4} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} disabled={locked} />
      </div>

      <div>
        <label htmlFor="auction-event" className="block text-sm font-medium text-gray-700 mb-1">Linked event (optional)</label>
        <select id="auction-event" className={inputClass} value={eventId} onChange={(e) => setEventId(e.target.value)} disabled={locked || startLocked}>
          <option value="">No linked event</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.title} ({ev.event_date})</option>
          ))}
        </select>
        {startLocked && <p className="text-xs text-gray-400 mt-1">The linked event is locked once the auction is live.</p>}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="auction-start" className="block text-sm font-medium text-gray-700 mb-1">Starts</label>
          <input id="auction-start" type="datetime-local" className={inputClass} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} disabled={locked || startLocked} />
          <p className="text-xs text-gray-400 mt-1">Leave blank to start as soon as you publish. Times are in {timezoneLabel()}.</p>
        </div>
        <div>
          <label htmlFor="auction-end" className="block text-sm font-medium text-gray-700 mb-1">Ends</label>
          <input id="auction-end" type="datetime-local" className={inputClass} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} disabled={locked} />
          <p className="text-xs text-gray-400 mt-1">Required to publish. Must run at least 1 hour. A live auction can be extended, not shortened.</p>
        </div>
      </div>

      {!orgFailed && (
        <fieldset className="space-y-4 rounded-xl border border-gray-200 p-4" disabled={orgLoading}>
          <legend className="px-1 text-sm font-semibold text-gray-800">Public cause page</legend>
          {orgLoading ? (
            <p className="text-sm text-gray-500">Loading your organization...</p>
          ) : !org ? (
            <div className="rounded-lg bg-purple-50 p-3 text-sm text-purple-900">
              <p className="font-medium">Create your organization page first</p>
              <p className="mt-1 text-purple-800">
                A public auction page shows your cause story, photos and sponsors, and can collect item donations before bidding opens.{' '}
                <Link href="/dashboard/promoter/auctions/organization" className="font-medium underline">Set up your organization page</Link>, then come back to link this auction.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="auction-slug" className="block text-sm font-medium text-gray-700 mb-1">Auction URL</label>
                <input
                  id="auction-slug"
                  className={inputClass}
                  value={slug}
                  maxLength={60}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-describedby="auction-slug-help"
                  onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase()) }}
                  disabled={locked}
                />
                <p id="auction-slug-help" className="mt-1 break-all text-xs text-gray-500">
                  {PUBLIC_SITE_ORIGIN}/auctions/{orgSlug}/{slug.trim() || 'your-auction'}
                </p>
                {slug.trim() && slugProblem(slug.trim()) && <p role="alert" className="mt-1 text-xs text-red-600">{slugProblem(slug.trim())}</p>}
                <p className="mt-1 text-xs text-gray-400">Unique within your organization. If it is taken, saving will tell you.</p>
              </div>

              <ImageUploadField label="Auction cover image" value={coverUrl} onChange={setCoverUrl} disabled={disabled || saving} previewClass="h-24 w-44" hint="Shown at the top of this auction page and in social link previews. Falls back to your organization cover." onBusyChange={setUploading} />

              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600" checked={pagePublished} onChange={(e) => setPagePublished(e.target.checked)} disabled={locked} />
                <span>
                  <span className="block text-sm font-medium text-gray-900">Publish cause page</span>
                  <span className="block text-xs text-gray-500">Makes this auction page public now, before bidding opens. Bidding stays closed until the auction is live. Your organization page must also be published.</span>
                </span>
              </label>

              <div className="space-y-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600" checked={acceptsDonations} onChange={(e) => setAcceptsDonations(e.target.checked)} disabled={locked} />
                  <span>
                    <span className="block text-sm font-medium text-gray-900">Accept item donations</span>
                    <span className="block text-xs text-gray-500">Donors verify their phone and submit items for you to review. Needs the cause page to be published.</span>
                  </span>
                </label>
                {acceptsDonations && (
                  <div className="max-w-xs pl-7">
                    <label htmlFor="donations-close" className="block text-sm font-medium text-gray-700 mb-1">Donations close</label>
                    <input id="donations-close" type="datetime-local" className={inputClass} value={donationsCloseAt} onChange={(e) => setDonationsCloseAt(e.target.value)} disabled={locked} />
                    <p className="mt-1 text-xs text-gray-400">Optional. Leave blank to accept donations until bidding opens. Times are in {timezoneLabel()}.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </fieldset>
      )}

      <fieldset className="grid sm:grid-cols-2 gap-4 rounded-xl border border-gray-200 p-4">
        <legend className="px-1 text-sm font-semibold text-gray-800">Bidding rules</legend>
        <div>
          <label htmlFor="snipe-window" className="block text-sm font-medium text-gray-700 mb-1">Anti-sniping window (minutes)</label>
          <input id="snipe-window" type="number" min={0} max={60} step="any" className={inputClass} value={windowMinutes} onChange={(e) => setWindowMinutes(e.target.value)} disabled={locked} />
          <p className="text-xs text-gray-400 mt-1">A bid inside this window before an item closes extends it. 0 turns it off.</p>
        </div>
        <div>
          <label htmlFor="snipe-extension" className="block text-sm font-medium text-gray-700 mb-1">Extension per late bid (minutes)</label>
          <input id="snipe-extension" type="number" min={0} max={60} step="any" className={inputClass} value={extensionMinutes} onChange={(e) => setExtensionMinutes(e.target.value)} disabled={locked} />
        </div>
        <div>
          <label htmlFor="exposure" className="block text-sm font-medium text-gray-700 mb-1">Bidder exposure limit (USD)</label>
          <input id="exposure" inputMode="decimal" className={inputClass} value={exposure} onChange={(e) => setExposure(e.target.value)} disabled={locked} />
          <p className="text-xs text-gray-400 mt-1">The most any one bidder can have committed at once. Winners are charged automatically.</p>
        </div>
        <div>
          <label htmlFor="grace" className="block text-sm font-medium text-gray-700 mb-1">Payment grace (hours)</label>
          <input id="grace" type="number" min={1} max={720} className={inputClass} value={graceHours} onChange={(e) => setGraceHours(e.target.value)} disabled={locked} />
          <p className="text-xs text-gray-400 mt-1">How long a winner has to fix a failed card before the order defaults.</p>
        </div>
      </fieldset>

      <button type="submit" disabled={locked} className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-60">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </button>
    </form>
  )
}
