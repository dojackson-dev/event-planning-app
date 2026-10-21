'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Plus, Trash2, XCircle } from 'lucide-react'
import api from '@/lib/api'
import ImageUploadField from '../ImageUploadField'
import {
  AuctionOrganization,
  ImpactExample,
  usePublicOrigin,
  centsToDollars,
  dollarsToCents,
  errorMessage,
  httpStatus,
  normalizeOrganization,
  slugProblem,
  slugify,
} from '../../lib'

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:text-gray-500'

const SOCIALS = [
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['x', 'X (Twitter)'],
  ['youtube', 'YouTube'],
  ['linkedin', 'LinkedIn'],
] as const

const MAX_IMPACT_ROWS = 8

interface FormState {
  name: string
  tagline: string
  slug: string
  logo_url: string | null
  cover_image_url: string | null
  story: string
  beneficiaries: string
  goal: string
  impact: ImpactExample[]
  website_url: string
  contact_email: string
  ein: string
  social: Record<string, string>
  is_published: boolean
}

function fromOrg(org: AuctionOrganization | null): FormState {
  return {
    name: org?.name ?? '',
    tagline: org?.tagline ?? '',
    slug: org?.slug ?? '',
    logo_url: org?.logo_url ?? null,
    cover_image_url: org?.cover_image_url ?? null,
    story: org?.story ?? '',
    beneficiaries: org?.beneficiaries ?? '',
    goal: centsToDollars(org?.goal_cents),
    impact: (org?.impact_examples ?? []).map((i) => ({ title: i.title ?? '', text: i.text ?? '' })),
    website_url: org?.website_url ?? '',
    contact_email: org?.contact_email ?? '',
    ein: org?.ein ?? '',
    social: Object.fromEntries(SOCIALS.map(([k]) => [k, org?.social?.[k] ?? ''])),
    is_published: org?.is_published ?? false,
  }
}

const isHttpUrl = (v: string) => /^https?:\/\/\S+\.\S+/i.test(v)

type SlugState =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'taken'; reason?: string }
  | { state: 'invalid'; reason: string }
  | { state: 'unknown' }

interface Props {
  initial: AuctionOrganization | null
  onSaved: (org: AuctionOrganization) => void
  onDirtyChange: (dirty: boolean) => void
}

export default function OrgProfileForm({ initial, onSaved, onDirtyChange }: Props) {
  const [baseline, setBaseline] = useState<FormState>(() => fromOrg(initial))
  const [form, setForm] = useState<FormState>(baseline)
  const [savedSlug, setSavedSlug] = useState(initial?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug)
  const [slugCheck, setSlugCheck] = useState<SlugState>({ state: 'idle' })
  const [uploads, setUploads] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const checkSeq = useRef(0)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setSuccess(false)
    setForm((f) => ({ ...f, [key]: value }))
  }

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline])
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  // Debounced availability check; the promoter's own saved slug is always fine.
  useEffect(() => {
    const slug = form.slug.trim()
    if (!slug) return setSlugCheck({ state: 'idle' })
    const problem = slugProblem(slug)
    if (problem) return setSlugCheck({ state: 'invalid', reason: problem })
    if (slug === savedSlug) return setSlugCheck({ state: 'available' })
    setSlugCheck({ state: 'checking' })
    const seq = ++checkSeq.current
    const timer = setTimeout(async () => {
      try {
        const res = await api.get<{ available: boolean; reason?: string }>('/auctions/manage/organization/slug-available', { params: { slug } })
        if (seq !== checkSeq.current) return
        setSlugCheck(res.data?.available ? { state: 'available' } : { state: 'taken', reason: res.data?.reason })
      } catch {
        // Older backends lack this endpoint; the save call still validates the slug.
        if (seq === checkSeq.current) setSlugCheck({ state: 'unknown' })
      }
    }, 450)
    return () => clearTimeout(timer)
  }, [form.slug, savedSlug])

  const onNameChange = (name: string) => {
    setSuccess(false)
    setForm((f) => ({ ...f, name, ...(slugTouched ? {} : { slug: slugify(name) }) }))
  }

  const updateImpact = (index: number, patch: Partial<ImpactExample>) => {
    setSuccess(false)
    setForm((f) => ({ ...f, impact: f.impact.map((row, i) => (i === index ? { ...row, ...patch } : row)) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const name = form.name.trim()
    const slug = form.slug.trim()
    if (!name) return setError('Enter your organization name.')
    const problem = slugProblem(slug)
    if (problem) return setError(`Page URL: ${problem}`)
    if (slugCheck.state === 'taken') return setError(slugCheck.reason || 'That page URL is already taken. Choose another.')
    if (slugCheck.state === 'checking') return setError('Wait for the page URL check to finish.')

    let goalCents: number | null = null
    if (form.goal.trim()) {
      goalCents = dollarsToCents(form.goal)
      if (goalCents === null || goalCents < 100) return setError('The fundraising goal must be a dollar amount of at least $1.00.')
    }
    if (form.website_url.trim() && !isHttpUrl(form.website_url.trim())) return setError('The website must start with http:// or https://.')
    if (form.contact_email.trim() && !/^\S+@\S+\.\S+$/.test(form.contact_email.trim())) return setError('Enter a valid contact email.')
    if (form.ein.trim() && !/^\d{2}-?\d{7}$/.test(form.ein.trim())) return setError('EIN must look like 12-3456789.')

    const social: Record<string, string> = {}
    for (const [key, label] of SOCIALS) {
      const v = form.social[key].trim()
      if (!v) continue
      if (!isHttpUrl(v)) return setError(`${label} link must start with http:// or https://.`)
      social[key] = v
    }

    const impact: ImpactExample[] = []
    for (const [i, row] of form.impact.entries()) {
      const title = row.title.trim()
      const text = row.text.trim()
      if (!title && !text) continue
      if (!title || !text) return setError(`Impact example ${i + 1} needs both a title and a description (or remove it).`)
      impact.push({ title, text })
    }

    const body = {
      name,
      slug,
      tagline: form.tagline.trim() || null,
      logo_url: form.logo_url,
      cover_image_url: form.cover_image_url,
      story: form.story.trim() || null,
      beneficiaries: form.beneficiaries.trim() || null,
      goal_cents: goalCents,
      impact_examples: impact,
      website_url: form.website_url.trim() || null,
      contact_email: form.contact_email.trim() || null,
      ein: form.ein.trim() || null,
      social,
      is_published: form.is_published,
    }

    try {
      setSaving(true)
      const res = await api.put('/auctions/manage/organization', body)
      const org = normalizeOrganization(res.data)
      const next = fromOrg(org ?? ({ ...body, impact_examples: impact, social } as unknown as AuctionOrganization))
      setBaseline(next)
      setForm(next)
      setSavedSlug(next.slug)
      setSlugTouched(true)
      setSuccess(true)
      if (org) onSaved(org)
    } catch (err) {
      setError(
        httpStatus(err) === 409
          ? errorMessage(err, 'That page URL is already taken. Choose another.')
          : errorMessage(err, 'Could not save your organization page.'),
      )
    } finally {
      setSaving(false)
    }
  }

  const locked = saving
  const origin = usePublicOrigin()
  const publicUrl = `${origin}/auctions/${form.slug.trim() || 'your-organization'}`

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" /> Saved. {form.is_published ? 'Your page is live.' : 'Your page is saved but not public yet.'}
        </p>
      )}

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Basics</h2>
        <div>
          <label htmlFor="org-name" className="block text-sm font-medium text-gray-700 mb-1">Organization name</label>
          <input id="org-name" className={inputClass} value={form.name} maxLength={200} onChange={(e) => onNameChange(e.target.value)} disabled={locked} required />
        </div>
        <div>
          <label htmlFor="org-tagline" className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
          <input id="org-tagline" className={inputClass} value={form.tagline} maxLength={200} onChange={(e) => set('tagline', e.target.value)} disabled={locked} />
          <p className="mt-1 text-xs text-gray-400">One short line shown under your name.</p>
        </div>
        <div>
          <label htmlFor="org-slug" className="block text-sm font-medium text-gray-700 mb-1">Page URL</label>
          <input
            id="org-slug"
            className={inputClass}
            value={form.slug}
            maxLength={60}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby="org-slug-status org-slug-preview"
            aria-invalid={slugCheck.state === 'invalid' || slugCheck.state === 'taken'}
            onChange={(e) => { setSlugTouched(true); set('slug', e.target.value.toLowerCase()) }}
            disabled={locked}
            required
          />
          <p id="org-slug-preview" className="mt-1 break-all text-xs text-gray-500">{publicUrl}</p>
          <p id="org-slug-status" aria-live="polite" className="mt-1 min-h-[1rem] text-xs">
            {slugCheck.state === 'checking' && <span className="inline-flex items-center gap-1 text-gray-500"><Loader2 className="h-3 w-3 animate-spin" /> Checking availability...</span>}
            {slugCheck.state === 'available' && <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> {form.slug.trim() === savedSlug ? 'This is your current URL.' : 'Available.'}</span>}
            {slugCheck.state === 'taken' && <span className="inline-flex items-center gap-1 text-red-600"><XCircle className="h-3.5 w-3.5" /> {slugCheck.reason || 'That URL is taken or reserved.'}</span>}
            {slugCheck.state === 'invalid' && <span className="inline-flex items-center gap-1 text-red-600"><XCircle className="h-3.5 w-3.5" /> {slugCheck.reason}</span>}
          </p>
          {savedSlug && form.slug.trim() !== savedSlug && (
            <p className="mt-1 text-xs text-amber-700">Changing your URL breaks links you have already shared.</p>
          )}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <ImageUploadField label="Logo" value={form.logo_url} onChange={(u) => set('logo_url', u)} disabled={locked} contain previewClass="h-24 w-24" hint="Square works best. JPEG, PNG or WebP under 5 MB." onBusyChange={(b) => setUploads((n) => n + (b ? 1 : -1))} />
          <ImageUploadField label="Cover image" value={form.cover_image_url} onChange={(u) => set('cover_image_url', u)} disabled={locked} previewClass="h-24 w-44" hint="Wide image (about 3:1). Also used for social link previews." onBusyChange={(b) => setUploads((n) => n + (b ? 1 : -1))} />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Your cause</h2>
        <div>
          <label htmlFor="org-story" className="block text-sm font-medium text-gray-700 mb-1">Cause story</label>
          <textarea id="org-story" rows={6} className={inputClass} value={form.story} maxLength={10000} onChange={(e) => set('story', e.target.value)} disabled={locked} />
          <p className="mt-1 text-xs text-gray-400">Why you exist and why this auction matters. The first lines are used in social previews.</p>
        </div>
        <div>
          <label htmlFor="org-beneficiaries" className="block text-sm font-medium text-gray-700 mb-1">Who benefits</label>
          <textarea id="org-beneficiaries" rows={3} className={inputClass} value={form.beneficiaries} maxLength={5000} onChange={(e) => set('beneficiaries', e.target.value)} disabled={locked} />
        </div>
        <div className="max-w-xs">
          <label htmlFor="org-goal" className="block text-sm font-medium text-gray-700 mb-1">Fundraising goal (USD)</label>
          <input id="org-goal" inputMode="decimal" className={inputClass} value={form.goal} placeholder="25000" onChange={(e) => set('goal', e.target.value)} disabled={locked} />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-gray-700">Impact examples</legend>
          <p className="text-xs text-gray-400">Show what gifts accomplish, for example &quot;$50 - Feeds a family for a week&quot;.</p>
          {form.impact.map((row, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr_2fr_auto] sm:items-start">
              <div>
                <label htmlFor={`impact-title-${i}`} className="sr-only">Impact example {i + 1} title</label>
                <input id={`impact-title-${i}`} className={inputClass} placeholder="Title" maxLength={100} value={row.title} onChange={(e) => updateImpact(i, { title: e.target.value })} disabled={locked} />
              </div>
              <div>
                <label htmlFor={`impact-text-${i}`} className="sr-only">Impact example {i + 1} description</label>
                <input id={`impact-text-${i}`} className={inputClass} placeholder="What it makes possible" maxLength={300} value={row.text} onChange={(e) => updateImpact(i, { text: e.target.value })} disabled={locked} />
              </div>
              <button type="button" onClick={() => { setSuccess(false); setForm((f) => ({ ...f, impact: f.impact.filter((_, idx) => idx !== i) })) }} aria-label={`Remove impact example ${i + 1}`} disabled={locked} className="justify-self-end rounded p-2 text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {form.impact.length < MAX_IMPACT_ROWS && (
            <button type="button" onClick={() => { setSuccess(false); setForm((f) => ({ ...f, impact: [...f.impact, { title: '', text: '' }] })) }} disabled={locked} className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-600 hover:underline">
              <Plus className="h-4 w-4" /> Add impact example
            </button>
          )}
        </fieldset>
      </section>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Contact and links</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="org-website" className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input id="org-website" type="url" className={inputClass} value={form.website_url} placeholder="https://" onChange={(e) => set('website_url', e.target.value)} disabled={locked} />
          </div>
          <div>
            <label htmlFor="org-email" className="block text-sm font-medium text-gray-700 mb-1">Contact email</label>
            <input id="org-email" type="email" className={inputClass} value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} disabled={locked} />
            <p className="mt-1 text-xs text-gray-400">Shown publicly so supporters can reach you.</p>
          </div>
          <div>
            <label htmlFor="org-ein" className="block text-sm font-medium text-gray-700 mb-1">EIN (optional)</label>
            <input id="org-ein" className={inputClass} value={form.ein} placeholder="12-3456789" onChange={(e) => set('ein', e.target.value)} disabled={locked} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIALS.map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`org-social-${key}`} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input id={`org-social-${key}`} type="url" className={inputClass} value={form.social[key]} placeholder="https://" onChange={(e) => { setSuccess(false); setForm((f) => ({ ...f, social: { ...f.social, [key]: e.target.value } })) }} disabled={locked} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600" checked={form.is_published} onChange={(e) => set('is_published', e.target.checked)} disabled={locked} />
          <span>
            <span className="block text-sm font-semibold text-gray-900">Published</span>
            <span className="block text-xs text-gray-500">
              When off, your organization page and its auction story pages return &quot;not found&quot; for the public. Turn it on when your story, photos and sponsors are ready.
            </span>
          </span>
        </label>
      </section>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 border-t border-gray-200 bg-gray-50/95 px-1 py-3 backdrop-blur">
        <button type="submit" disabled={locked || uploads > 0} className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial || savedSlug ? 'Save changes' : 'Create organization page'}
        </button>
        {dirty && !saving && <span className="text-xs text-amber-700">You have unsaved changes.</span>}
        {uploads > 0 && <span className="text-xs text-gray-500">Uploading image...</span>}
      </div>
    </form>
  )
}
