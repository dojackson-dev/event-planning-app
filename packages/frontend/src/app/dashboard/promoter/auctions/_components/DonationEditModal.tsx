'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import api from '@/lib/api'
import {
  Donation,
  FULFILLMENT_LABEL,
  FulfillmentMethod,
  centsToDollars,
  dollarsToCents,
  errorMessage,
} from '../lib'

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100'

interface Props {
  donation: Donation
  onClose: () => void
  onSaved: (donation: Donation) => void
}

/** Lets the organizer fix a submission's text and value before approving it. */
export default function DonationEditModal({ donation, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(donation.title)
  const [description, setDescription] = useState(donation.description ?? '')
  const [category, setCategory] = useState(donation.category ?? '')
  const [value, setValue] = useState(centsToDollars(donation.estimated_value_cents))
  const [condition, setCondition] = useState(donation.condition ?? '')
  const [specifications, setSpecifications] = useState(donation.specifications ?? '')
  const [whatsIncluded, setWhatsIncluded] = useState(donation.whats_included ?? '')
  const [restrictions, setRestrictions] = useState(donation.restrictions ?? '')
  const [expiresOn, setExpiresOn] = useState(donation.expires_on ? donation.expires_on.slice(0, 10) : '')
  const [fulfillment, setFulfillment] = useState<FulfillmentMethod | ''>(donation.fulfillment_method ?? '')
  const [fulfillmentDetails, setFulfillmentDetails] = useState(donation.fulfillment_details ?? '')
  const [isExperience, setIsExperience] = useState(donation.is_experience)
  const [scheduling, setScheduling] = useState(donation.scheduling_requirements ?? '')
  const [blackout, setBlackout] = useState(donation.blackout_dates ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim()) return setError('Enter a title.')
    let valueCents: number | null = null
    if (value.trim()) {
      valueCents = dollarsToCents(value)
      if (valueCents === null) return setError('Enter a valid estimated value.')
    }
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      estimated_value_cents: valueCents,
      condition: condition.trim() || null,
      specifications: specifications.trim() || null,
      whats_included: whatsIncluded.trim() || null,
      restrictions: restrictions.trim() || null,
      expires_on: expiresOn || null,
      fulfillment_method: fulfillment || null,
      fulfillment_details: fulfillmentDetails.trim() || null,
      is_experience: isExperience,
      scheduling_requirements: isExperience ? scheduling.trim() || null : null,
      blackout_dates: isExperience ? blackout.trim() || null : null,
    }
    setSaving(true)
    try {
      const res = await api.put<Donation>(`/auctions/manage/donations/${donation.id}`, body)
      onSaved({ ...donation, ...body, ...(res.data && typeof res.data === 'object' ? res.data : {}) })
    } catch (err) {
      setError(errorMessage(err, 'Could not save the donation.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="donation-edit-title">
      <form onSubmit={submit} className="mx-auto my-6 w-full max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-xl" noValidate>
        <div className="flex items-center justify-between">
          <h2 id="donation-edit-title" className="text-lg font-semibold text-gray-900">Edit donation</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-xs text-gray-500">Fix wording or value before approving. Donor contact details can&apos;t be changed.</p>
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div>
          <label htmlFor="de-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input id="de-title" className={inputClass} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} disabled={saving} required />
        </div>
        <div>
          <label htmlFor="de-desc" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea id="de-desc" rows={4} className={inputClass} value={description} maxLength={5000} onChange={(e) => setDescription(e.target.value)} disabled={saving} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="de-value" className="block text-sm font-medium text-gray-700 mb-1">Estimated value (USD)</label>
            <input id="de-value" inputMode="decimal" className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} disabled={saving} />
          </div>
          <div>
            <label htmlFor="de-category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input id="de-category" className={inputClass} value={category} maxLength={100} onChange={(e) => setCategory(e.target.value)} disabled={saving} />
          </div>
          <div>
            <label htmlFor="de-condition" className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
            <input id="de-condition" className={inputClass} value={condition} maxLength={200} onChange={(e) => setCondition(e.target.value)} disabled={saving} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="de-specs" className="block text-sm font-medium text-gray-700 mb-1">Specifications / size</label>
            <textarea id="de-specs" rows={2} className={inputClass} value={specifications} maxLength={2000} onChange={(e) => setSpecifications(e.target.value)} disabled={saving} />
          </div>
          <div>
            <label htmlFor="de-included" className="block text-sm font-medium text-gray-700 mb-1">What is included</label>
            <textarea id="de-included" rows={2} className={inputClass} value={whatsIncluded} maxLength={2000} onChange={(e) => setWhatsIncluded(e.target.value)} disabled={saving} />
          </div>
          <div>
            <label htmlFor="de-restrictions" className="block text-sm font-medium text-gray-700 mb-1">Restrictions</label>
            <textarea id="de-restrictions" rows={2} className={inputClass} value={restrictions} maxLength={2000} onChange={(e) => setRestrictions(e.target.value)} disabled={saving} />
          </div>
          <div>
            <label htmlFor="de-expires" className="block text-sm font-medium text-gray-700 mb-1">Expires on</label>
            <input id="de-expires" type="date" className={inputClass} value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} disabled={saving} />
          </div>
          <div>
            <label htmlFor="de-fulfillment" className="block text-sm font-medium text-gray-700 mb-1">Fulfillment</label>
            <select id="de-fulfillment" className={inputClass} value={fulfillment} onChange={(e) => setFulfillment(e.target.value as FulfillmentMethod | '')} disabled={saving}>
              <option value="">Not specified</option>
              {(Object.keys(FULFILLMENT_LABEL) as FulfillmentMethod[]).map((m) => <option key={m} value={m}>{FULFILLMENT_LABEL[m]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="de-fdetails" className="block text-sm font-medium text-gray-700 mb-1">Fulfillment details</label>
            <input id="de-fdetails" className={inputClass} value={fulfillmentDetails} maxLength={1000} onChange={(e) => setFulfillmentDetails(e.target.value)} disabled={saving} />
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600" checked={isExperience} onChange={(e) => setIsExperience(e.target.checked)} disabled={saving} />
          <span className="text-sm text-gray-800">This is an experience</span>
        </label>
        {isExperience && (
          <div className="grid gap-4 pl-7 sm:grid-cols-2">
            <div>
              <label htmlFor="de-sched" className="block text-sm font-medium text-gray-700 mb-1">Scheduling requirements</label>
              <textarea id="de-sched" rows={2} className={inputClass} value={scheduling} maxLength={1000} onChange={(e) => setScheduling(e.target.value)} disabled={saving} />
            </div>
            <div>
              <label htmlFor="de-blackout" className="block text-sm font-medium text-gray-700 mb-1">Blackout dates</label>
              <textarea id="de-blackout" rows={2} className={inputClass} value={blackout} maxLength={1000} onChange={(e) => setBlackout(e.target.value)} disabled={saving} />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </button>
        </div>
      </form>
    </div>
  )
}
