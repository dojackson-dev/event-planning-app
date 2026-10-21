'use client'

import { useState } from 'react'
import { EyeOff, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import ConfirmDialog from '../ConfirmDialog'
import ImageUploadField from '../ImageUploadField'
import ReorderButtons from '../ReorderButtons'
import { OrgSponsor, errorMessage } from '../../lib'

const TIERS = ['Presenting', 'Gold', 'Silver', 'Bronze', 'Supporter']

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100'

interface DraftState {
  name: string
  logo_url: string | null
  website_url: string
  tier: string
  permission_confirmed: boolean
}

const emptyDraft: DraftState = { name: '', logo_url: null, website_url: '', tier: '', permission_confirmed: false }

function SponsorForm({
  sponsor, onCancel, onSaved,
}: {
  sponsor: OrgSponsor | null
  onCancel: () => void
  onSaved: (sponsor: OrgSponsor) => void
}) {
  const [draft, setDraft] = useState<DraftState>(
    sponsor
      ? { name: sponsor.name, logo_url: sponsor.logo_url, website_url: sponsor.website_url ?? '', tier: sponsor.tier ?? '', permission_confirmed: sponsor.permission_confirmed }
      : emptyDraft,
  )
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const idSuffix = sponsor?.id ?? 'new'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const name = draft.name.trim()
    const website = draft.website_url.trim()
    if (!name) return setError('Enter the sponsor name.')
    if (website && !/^https?:\/\/\S+\.\S+/i.test(website)) return setError('The sponsor website must start with http:// or https://.')
    const body = {
      name,
      logo_url: draft.logo_url,
      website_url: website || null,
      tier: draft.tier.trim() || null,
      permission_confirmed: draft.permission_confirmed,
    }
    setSaving(true)
    try {
      const res = sponsor
        ? await api.put<OrgSponsor>(`/auctions/manage/organization/sponsors/${sponsor.id}`, body)
        : await api.post<OrgSponsor>('/auctions/manage/organization/sponsors', body)
      onSaved({ ...sponsor, ...body, ...(res.data ?? {}), id: res.data?.id ?? sponsor?.id ?? '' } as OrgSponsor)
    } catch (err) {
      setError(errorMessage(err, 'Could not save the sponsor.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-purple-200 bg-white p-4" aria-label={sponsor ? 'Edit sponsor' : 'Add sponsor'} noValidate>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`sp-name-${idSuffix}`} className="block text-sm font-medium text-gray-700 mb-1">Sponsor name</label>
          <input id={`sp-name-${idSuffix}`} className={inputClass} value={draft.name} maxLength={200} onChange={(e) => setDraft({ ...draft, name: e.target.value })} disabled={saving} required />
        </div>
        <div>
          <label htmlFor={`sp-tier-${idSuffix}`} className="block text-sm font-medium text-gray-700 mb-1">Tier (optional)</label>
          <input id={`sp-tier-${idSuffix}`} list={`sp-tiers-${idSuffix}`} className={inputClass} value={draft.tier} maxLength={50} onChange={(e) => setDraft({ ...draft, tier: e.target.value })} disabled={saving} />
          <datalist id={`sp-tiers-${idSuffix}`}>{TIERS.map((t) => <option key={t} value={t} />)}</datalist>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`sp-web-${idSuffix}`} className="block text-sm font-medium text-gray-700 mb-1">Website (optional)</label>
          <input id={`sp-web-${idSuffix}`} type="url" className={inputClass} placeholder="https://" value={draft.website_url} onChange={(e) => setDraft({ ...draft, website_url: e.target.value })} disabled={saving} />
        </div>
      </div>
      <ImageUploadField label="Logo" value={draft.logo_url} onChange={(u) => setDraft({ ...draft, logo_url: u })} disabled={saving} contain previewClass="h-16 w-32" onBusyChange={setUploading} />
      <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-amber-50 p-3">
        <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600" checked={draft.permission_confirmed} onChange={(e) => setDraft({ ...draft, permission_confirmed: e.target.checked })} disabled={saving} />
        <span className="text-sm text-gray-800">
          I have permission to publicly recognize this sponsor.
          <span className="mt-0.5 block text-xs text-gray-600">Required for the sponsor to appear on your public page. Without it the sponsor stays hidden.</span>
        </span>
      </label>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60">Cancel</button>
        <button type="submit" disabled={saving || uploading} className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {sponsor ? 'Save sponsor' : 'Add sponsor'}
        </button>
      </div>
    </form>
  )
}

export default function SponsorsManager({ initial }: { initial: OrgSponsor[] }) {
  const [sponsors, setSponsors] = useState<OrgSponsor[]>(initial)
  const [formFor, setFormFor] = useState<OrgSponsor | 'new' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<OrgSponsor | null>(null)

  const saved = (s: OrgSponsor) => {
    setSponsors((prev) => (prev.some((p) => p.id === s.id) ? prev.map((p) => (p.id === s.id ? s : p)) : [...prev, s]))
    setFormFor(null)
  }

  const move = async (from: number, to: number) => {
    const before = sponsors
    const next = [...sponsors]
    const [row] = next.splice(from, 1)
    next.splice(to, 0, row)
    setSponsors(next)
    setBusy(true)
    setError(null)
    try {
      await api.put('/auctions/manage/organization/sponsors-order', { ids: next.map((s) => s.id) })
    } catch (err) {
      setSponsors(before)
      setError(errorMessage(err, 'Could not reorder the sponsors.'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    setError(null)
    try {
      await api.delete(`/auctions/manage/organization/sponsors/${deleting.id}`)
      setSponsors((prev) => prev.filter((s) => s.id !== deleting.id))
      setDeleting(null)
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the sponsor.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 p-5" aria-labelledby="sponsors-heading">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="sponsors-heading" className="text-base font-semibold text-gray-900">Sponsors</h2>
          <p className="text-xs text-gray-500">Only sponsors with confirmed permission are shown publicly. Changes here save immediately.</p>
        </div>
        {formFor === null && (
          <button type="button" onClick={() => setFormFor('new')} className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">
            <Plus className="h-4 w-4" /> Add sponsor
          </button>
        )}
      </div>
      {error && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {formFor === 'new' && <div className="mb-3"><SponsorForm sponsor={null} onCancel={() => setFormFor(null)} onSaved={saved} /></div>}
      {sponsors.length === 0 && formFor !== 'new' ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white py-8 text-center text-sm text-gray-500">No sponsors yet.</p>
      ) : (
        <ul className="grid gap-3">
          {sponsors.map((s, i) =>
            formFor && formFor !== 'new' && formFor.id === s.id ? (
              <li key={s.id}><SponsorForm sponsor={s} onCancel={() => setFormFor(null)} onSaved={saved} /></li>
            ) : (
              <li key={s.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                <ReorderButtons index={i} count={sponsors.length} label={s.name} disabled={busy} onMove={move} />
                <div className="flex h-14 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-gray-50">
                  {s.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logo_url} alt={`${s.name} logo`} className="max-h-full max-w-full object-contain" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{s.name}</p>
                  <p className="truncate text-xs text-gray-500">{[s.tier, s.website_url].filter(Boolean).join(' | ') || 'No tier or website'}</p>
                  {!s.permission_confirmed && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      <EyeOff className="h-3 w-3" /> Hidden until permission is confirmed
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button type="button" onClick={() => setFormFor(s)} disabled={busy} className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:underline disabled:opacity-60"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                  <button type="button" onClick={() => setDeleting(s)} disabled={busy} className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline disabled:opacity-60"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
      <ConfirmDialog open={!!deleting} title="Delete sponsor" message={`Remove ${deleting?.name ?? 'this sponsor'} from your page? This cannot be undone.`} confirmLabel="Delete sponsor" danger busy={busy} error={error} onConfirm={remove} onCancel={() => { setDeleting(null); setError(null) }} />
    </section>
  )
}
