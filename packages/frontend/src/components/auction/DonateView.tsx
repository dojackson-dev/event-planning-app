'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, X } from 'lucide-react'
import {
  auctionApi,
  AuctionStoryData,
  clearDonorToken,
  DonationSubmission,
  FulfillmentMethod,
  getAuctionStory,
  getDonorToken,
  isUnavailable,
  parseApiError,
  PublicAuction,
  requestDonorCode,
  setDonorToken,
  submitDonation,
  uploadDonationImage,
  verifyDonorCode,
} from '@/lib/auctionApi'
import { compressImage } from '@/lib/compressImage'
import { dollarsToCents } from './format'
import { FULFILLMENT_LABELS, FULFILLMENT_METHODS } from './itemFields'
import OtpInput from './OtpInput'
import { ItemPhotoPlaceholder } from './PhotoPlaceholder'

const MAX_PHOTOS = 6
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100 disabled:text-gray-600'

type Step = 'start' | 'code' | 'form' | 'done'

interface Photo {
  key: string
  preview: string
  url: string | null
  status: 'uploading' | 'done' | 'error'
  error?: string
}

interface FormState {
  donorName: string
  business: string
  email: string
  title: string
  description: string
  value: string
  restrictions: string
  expiresOn: string
  fulfillmentMethod: FulfillmentMethod | ''
  fulfillmentDetails: string
  condition: string
  specifications: string
  whatsIncluded: string
  isExperience: boolean
  scheduling: string
  blackout: string
  recognitionOk: boolean
  website: string
}

const EMPTY: FormState = {
  donorName: '', business: '', email: '', title: '', description: '', value: '', restrictions: '', expiresOn: '',
  fulfillmentMethod: '', fulfillmentDetails: '', condition: '', specifications: '', whatsIncluded: '', isExperience: false,
  scheduling: '', blackout: '', recognitionOk: false, website: '',
}

function friendlyError(err: unknown, context: 'code' | 'verify' | 'submit' | 'upload'): { message: string; status: number | null } {
  const failure = parseApiError(err)
  if (failure.status === 429 || failure.data.limited) {
    const message =
      context === 'code'
        ? 'Too many codes have been requested. Please wait a few minutes before trying again.'
        : context === 'verify'
          ? 'Too many incorrect attempts. Please wait a few minutes, then request a new code.'
          : 'You have reached the limit for donations right now. Please try again later or contact the organizers.'
    return { message, status: 429 }
  }
  return { message: failure.message, status: failure.status }
}

function Field({ id, label, hint, error, required, children }: { id: string; label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}{required && <span aria-hidden="true" className="text-red-600"> *</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export default function DonateView({ auctionId: id, basePath }: { auctionId: string; basePath: string }) {
  const [story, setStory] = useState<AuctionStoryData | null>(null)
  const [auction, setAuction] = useState<PublicAuction | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const [step, setStep] = useState<Step>('start')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>(EMPTY)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState | 'photos', string>>>({})
  const headingRef = useRef<HTMLHeadingElement>(null)
  const photosRef = useRef<Photo[]>([])
  photosRef.current = photos

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const s = await getAuctionStory(id)
      if (s) setStory(s)
      else {
        const res = await auctionApi.get<{ auction: PublicAuction; items: unknown[] }>(`/${id}`)
        setAuction(res.data.auction)
      }
    } catch (err) {
      if (isUnavailable(err)) setNotFound(true)
      else setLoadError(parseApiError(err).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // Resume a still-valid verification (e.g. after a page refresh).
  useEffect(() => {
    const saved = getDonorToken(id)
    if (saved) {
      setToken(saved.token)
      setPhone(saved.phone)
      setStep('form')
    }
  }, [id])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  useEffect(() => {
    if (step === 'form' || step === 'done') headingRef.current?.focus()
  }, [step])

  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), [])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    setInfo(null)
    if (name.trim().length < 2) return setError('Enter your name.')
    if (phone.replace(/\D/g, '').length < 10) return setError('Enter a valid mobile phone number so we can text you a code.')
    setBusy(true)
    try {
      const { devCode } = await requestDonorCode(id, phone.trim(), name.trim())
      setCooldown(60)
      setCode(devCode ?? '')
      setInfo(
        devCode
          ? `Test mode: no text was sent. Your code is ${devCode} (filled in for you).`
          : `We texted a 6-digit code to ${phone.trim()}.`,
      )
      setStep('code')
    } catch (err) {
      setError(friendlyError(err, 'code').message)
    } finally {
      setBusy(false)
    }
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await verifyDonorCode(id, phone.trim(), code)
      setDonorToken(id, res.donorToken, phone.trim(), res.expiresInSeconds)
      setToken(res.donorToken)
      setForm((f) => ({ ...f, donorName: f.donorName || name.trim() }))
      setInfo(null)
      setStep('form')
    } catch (err) {
      setError(friendlyError(err, 'verify').message)
    } finally {
      setBusy(false)
    }
  }

  const expireSession = () => {
    clearDonorToken(id)
    setToken(null)
    setCode('')
    setInfo(null)
    setError('Your phone verification expired. Please verify again; your item details are kept.')
    setStep('start')
  }

  const addPhotos = async (files: FileList | null) => {
    if (!files || !token) return
    const room = MAX_PHOTOS - photos.length
    const chosen = Array.from(files).slice(0, Math.max(room, 0))
    setFieldErrors((fe) => ({ ...fe, photos: files.length > room ? `You can add up to ${MAX_PHOTOS} photos.` : undefined }))
    for (const file of chosen) {
      const key = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`
      const preview = URL.createObjectURL(file)
      if (!PHOTO_TYPES.includes(file.type)) {
        setPhotos((p) => [...p, { key, preview, url: null, status: 'error', error: 'Photos must be JPEG, PNG or WebP.' }])
        continue
      }
      setPhotos((p) => [...p, { key, preview, url: null, status: 'uploading' }])
      try {
        const small = await compressImage(file, { maxBytes: MAX_PHOTO_BYTES })
        const url = await uploadDonationImage(id, token, small)
        setPhotos((p) => p.map((x) => (x.key === key ? { ...x, url, status: 'done' } : x)))
      } catch (err) {
        if (err instanceof Error && !('response' in err)) {
          setPhotos((p) => p.map((x) => (x.key === key ? { ...x, status: 'error', error: err.message } : x)))
          continue
        }
        const f = friendlyError(err, 'upload')
        if (f.status === 401) {
          expireSession()
          return
        }
        setPhotos((p) => p.map((x) => (x.key === key ? { ...x, status: 'error', error: f.message } : x)))
      }
    }
  }

  const removePhoto = (key: string) => {
    setPhotos((p) => {
      const target = p.find((x) => x.key === key)
      if (target) URL.revokeObjectURL(target.preview)
      return p.filter((x) => x.key !== key)
    })
  }

  const validate = (): { ok: true; body: DonationSubmission } | { ok: false } => {
    const errs: typeof fieldErrors = {}
    const valueCents = dollarsToCents(form.value)
    if (form.donorName.trim().length < 2) errs.donorName = 'Enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email address.'
    if (!form.title.trim()) errs.title = 'Give the item a title.'
    else if (form.title.trim().length > 200) errs.title = 'Keep the title under 200 characters.'
    if (!form.description.trim()) errs.description = 'Describe the item.'
    else if (form.description.length > 5000) errs.description = 'Keep the description under 5,000 characters.'
    if (valueCents == null || valueCents < 1) errs.value = 'Enter the estimated value, for example 150 or 150.00.'
    if (!form.fulfillmentMethod) errs.fulfillmentMethod = 'Choose how the winner receives the item.'
    if (form.expiresOn && form.expiresOn < new Date().toISOString().slice(0, 10)) errs.expiresOn = 'The expiration date must be in the future.'
    if (photos.some((p) => p.status === 'uploading')) errs.photos = 'Please wait for photos to finish uploading.'
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      const firstId = (['donorName', 'email', 'title', 'description', 'value', 'fulfillmentMethod', 'expiresOn', 'photos'] as const).find((k) => errs[k])
      if (firstId) document.getElementById(`donate-${firstId}`)?.focus()
      return { ok: false }
    }
    setFieldErrors({})
    const opt = (v: string) => (v.trim() ? v.trim() : undefined)
    return {
      ok: true,
      body: {
        donor_name: form.donorName.trim(),
        donor_business: opt(form.business),
        donor_email: form.email.trim(),
        donor_phone: phone.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        estimated_value_cents: valueCents as number,
        image_urls: photos.filter((p) => p.status === 'done' && p.url).map((p) => p.url as string),
        restrictions: opt(form.restrictions),
        expires_on: opt(form.expiresOn),
        fulfillment_method: form.fulfillmentMethod as FulfillmentMethod,
        fulfillment_details: opt(form.fulfillmentDetails),
        condition: opt(form.condition),
        specifications: opt(form.specifications),
        whats_included: opt(form.whatsIncluded),
        is_experience: form.isExperience,
        scheduling_requirements: form.isExperience ? opt(form.scheduling) : undefined,
        blackout_dates: form.isExperience ? opt(form.blackout) : undefined,
        recognition_ok: form.recognitionOk,
        website: form.website,
      },
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!token) return expireSession()
    const result = validate()
    if (!result.ok) return
    setBusy(true)
    try {
      await submitDonation(id, token, result.body)
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview))
      setPhotos([])
      setStep('done')
    } catch (err) {
      const f = friendlyError(err, 'submit')
      if (f.status === 401) expireSession()
      else setError(f.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-purple-600" aria-label="Loading" /></div>
  }
  if (notFound) {
    return (
      <div className="py-16 text-center">
        <p className="mb-3 text-gray-600">This auction could not be found or is not available.</p>
        <Link href="/auctions" className="font-medium text-purple-600 underline">See all auctions</Link>
      </div>
    )
  }
  if (loadError) {
    return (
      <div className="py-16 text-center">
        <p role="alert" className="mb-3 text-gray-600">{loadError}</p>
        <button onClick={load} className="font-medium text-purple-600 underline">Try again</button>
      </div>
    )
  }

  const accepting = story
    ? (story.auction.donations_open ?? story.auction.phase === 'accepting_donations')
    : (auction?.donations_open ?? auction?.phase === 'accepting_donations')
  const auctionTitle = story?.auction.title ?? auction?.title ?? 'this auction'

  if (!accepting && step !== 'done') {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-gray-900 focus:outline-none">Item donations are closed</h1>
        <p className="mt-2 text-gray-600">
          {auctionTitle} is not accepting item donations right now. Thank you for your generosity.
        </p>
        <Link href={basePath} className="mt-5 inline-block rounded-lg bg-purple-600 px-6 py-2.5 font-medium text-white hover:bg-purple-700">Back to the auction</Link>
      </div>
    )
  }

  const orgName = story?.organization?.name
  const stepIndex = step === 'start' ? 0 : step === 'code' ? 1 : 2
  const steps = ['Your details', 'Verify phone', 'Item details']

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={basePath} className="text-sm text-gray-500 hover:text-gray-700">Back to the auction</Link>
      <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-2xl font-bold text-gray-900 focus:outline-none">Donate an item</h1>
      <p className="mt-1 text-sm text-gray-600">Support {orgName ? `${orgName}'s` : 'the'} auction <strong>{auctionTitle}</strong> by donating an item or experience.</p>

      {step !== 'done' && (
        <ol className="mt-4 flex gap-2 text-xs" aria-label="Progress">
          {steps.map((label, i) => (
            <li key={label} aria-current={i === stepIndex ? 'step' : undefined} className={`flex-1 rounded-full px-3 py-1.5 text-center font-medium ${i <= stepIndex ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{label}</li>
          ))}
        </ol>
      )}

      <div className="mt-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        {error && step !== 'form' && <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}</p>}

        {step === 'start' && (
          <form onSubmit={sendCode} className="space-y-4" noValidate>
            <p className="text-sm text-gray-600">To keep donations genuine, we verify your phone number with a text message before you submit an item.</p>
            <Field id="donor-name" label="Your name" required>
              <input id="donor-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" className={INPUT} />
            </Field>
            <Field id="donor-phone" label="Mobile phone" required hint="Message and data rates may apply.">
              <input id="donor-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" placeholder="(555) 555-1234" className={INPUT} />
            </Field>
            <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-2.5 font-medium text-white hover:bg-purple-700 disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Text me a code
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={verify} className="space-y-4">
            {info && <p role="status" className="text-sm text-gray-600">{info}</p>}
            <OtpInput id="donor-code" label="6-digit code" value={code} onChange={setCode} disabled={busy} />
            <button type="submit" disabled={busy || code.length !== 6} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-2.5 font-medium text-white hover:bg-purple-700 disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Verify
            </button>
            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => sendCode()} disabled={cooldown > 0 || busy} className="text-purple-700 underline disabled:text-gray-400 disabled:no-underline">
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
              <button type="button" onClick={() => { setStep('start'); setError(null) }} className="text-gray-500 underline">Use a different number</button>
            </div>
          </form>
        )}

        {step === 'form' && (
          <form onSubmit={submit} className="space-y-8" noValidate>
            {error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}</p>}

            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="donate-website">Website</label>
              <input id="donate-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} />
            </div>

            <fieldset className="space-y-4">
              <legend className="mb-1 text-lg font-semibold text-gray-900">About you</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="donate-donorName" label="Your name" required error={fieldErrors.donorName}>
                  <input id="donate-donorName" value={form.donorName} onChange={(e) => set('donorName', e.target.value)} maxLength={100} autoComplete="name" aria-invalid={!!fieldErrors.donorName} aria-describedby={fieldErrors.donorName ? 'donate-donorName-error' : undefined} className={INPUT} />
                </Field>
                <Field id="donate-business" label="Business name" hint="Optional. Shown only if you allow recognition below.">
                  <input id="donate-business" value={form.business} onChange={(e) => set('business', e.target.value)} maxLength={150} autoComplete="organization" className={INPUT} />
                </Field>
                <Field id="donate-email" label="Email" required error={fieldErrors.email}>
                  <input id="donate-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'donate-email-error' : undefined} className={INPUT} />
                </Field>
                <Field id="donate-phone" label="Phone (verified)" hint="Verified by text message.">
                  <input id="donate-phone" type="tel" value={phone} readOnly className={INPUT} />
                </Field>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="mb-1 text-lg font-semibold text-gray-900">The item</legend>
              <Field id="donate-title" label="Item title" required error={fieldErrors.title}>
                <input id="donate-title" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={200} aria-invalid={!!fieldErrors.title} aria-describedby={fieldErrors.title ? 'donate-title-error' : undefined} className={INPUT} />
              </Field>
              <Field id="donate-description" label="Description" required error={fieldErrors.description}>
                <textarea id="donate-description" value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} maxLength={5000} aria-invalid={!!fieldErrors.description} aria-describedby={fieldErrors.description ? 'donate-description-error' : undefined} className={INPUT} />
              </Field>
              <Field id="donate-value" label="Estimated value (USD)" required error={fieldErrors.value} hint="Fair market value of the item.">
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500" aria-hidden="true">$</span>
                  <input id="donate-value" inputMode="decimal" value={form.value} onChange={(e) => set('value', e.target.value)} aria-invalid={!!fieldErrors.value} aria-describedby={fieldErrors.value ? 'donate-value-error' : 'donate-value-hint'} className={`${INPUT} pl-7`} />
                </div>
              </Field>

              <div>
                <p className="mb-1 text-sm font-medium text-gray-700">Photos <span className="font-normal text-gray-500">({photos.length}/{MAX_PHOTOS})</span></p>
                {photos.length === 0 && (
                  <div className="mb-3 h-28 w-28 overflow-hidden rounded-lg ring-1 ring-gray-200">
                    <ItemPhotoPlaceholder label="Your photos will appear here" />
                  </div>
                )}
                {photos.length > 0 && (
                  <ul className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {photos.map((p, i) => (
                      <li key={p.key} className="relative">
                        <div className={`aspect-square overflow-hidden rounded-lg bg-gray-100 ring-1 ${p.status === 'error' ? 'ring-red-400' : 'ring-gray-200'}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.preview} alt={`Photo ${i + 1} preview`} className="h-full w-full object-cover" />
                          {p.status === 'uploading' && <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70"><Loader2 className="h-5 w-5 animate-spin text-purple-600" aria-label="Uploading" /></div>}
                        </div>
                        <button type="button" onClick={() => removePhoto(p.key)} aria-label={`Remove photo ${i + 1}`} className="absolute -right-2 -top-2 rounded-full bg-gray-900 p-1 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        {p.status === 'error' && <p role="alert" className="mt-1 text-xs text-red-600">{p.error}</p>}
                      </li>
                    ))}
                  </ul>
                )}
                {photos.length < MAX_PHOTOS && (
                  <label htmlFor="donate-photos" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-400 px-4 py-2.5 text-sm font-medium text-gray-700 focus-within:ring-2 focus-within:ring-purple-500 hover:border-purple-500 hover:text-purple-700">
                    <ImagePlus className="h-4 w-4" aria-hidden="true" /> Add photos
                    <input
                      id="donate-photos"
                      type="file"
                      accept={PHOTO_TYPES.join(',')}
                      multiple
                      className="sr-only"
                      onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }}
                    />
                  </label>
                )}
                <p className="mt-1 text-xs text-gray-500">JPEG, PNG or WebP. Large photos are shrunk automatically. Good photos help items sell.</p>
                {fieldErrors.photos && <p id="donate-photos-error" role="alert" className="mt-1 text-sm text-red-600">{fieldErrors.photos}</p>}
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="mb-1 text-lg font-semibold text-gray-900">Details for bidders</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="donate-condition" label="Condition" hint="For example: new, gently used.">
                  <input id="donate-condition" value={form.condition} onChange={(e) => set('condition', e.target.value)} maxLength={200} className={INPUT} />
                </Field>
                <Field id="donate-expiresOn" label="Expiration date" error={fieldErrors.expiresOn} hint="If the gift certificate or offer expires.">
                  <input id="donate-expiresOn" type="date" value={form.expiresOn} onChange={(e) => set('expiresOn', e.target.value)} aria-invalid={!!fieldErrors.expiresOn} aria-describedby={fieldErrors.expiresOn ? 'donate-expiresOn-error' : 'donate-expiresOn-hint'} className={INPUT} />
                </Field>
              </div>
              <Field id="donate-specifications" label="Size / specifications">
                <textarea id="donate-specifications" value={form.specifications} onChange={(e) => set('specifications', e.target.value)} rows={2} maxLength={1000} className={INPUT} />
              </Field>
              <Field id="donate-whatsIncluded" label="What's included">
                <textarea id="donate-whatsIncluded" value={form.whatsIncluded} onChange={(e) => set('whatsIncluded', e.target.value)} rows={2} maxLength={1000} className={INPUT} />
              </Field>
              <Field id="donate-restrictions" label="Restrictions">
                <textarea id="donate-restrictions" value={form.restrictions} onChange={(e) => set('restrictions', e.target.value)} rows={2} maxLength={1000} className={INPUT} />
              </Field>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="mb-1 text-lg font-semibold text-gray-900">Pickup, delivery or shipping</legend>
              <Field id="donate-fulfillmentMethod" label="How will the winner receive it?" required error={fieldErrors.fulfillmentMethod}>
                <select id="donate-fulfillmentMethod" value={form.fulfillmentMethod} onChange={(e) => set('fulfillmentMethod', e.target.value as FulfillmentMethod | '')} aria-invalid={!!fieldErrors.fulfillmentMethod} aria-describedby={fieldErrors.fulfillmentMethod ? 'donate-fulfillmentMethod-error' : undefined} className={INPUT}>
                  <option value="">Choose one</option>
                  {FULFILLMENT_METHODS.map((m) => <option key={m} value={m}>{FULFILLMENT_LABELS[m]}</option>)}
                </select>
              </Field>
              <Field id="donate-fulfillmentDetails" label="Details" hint="Location, hours, shipping limits, or how to redeem.">
                <textarea id="donate-fulfillmentDetails" value={form.fulfillmentDetails} onChange={(e) => set('fulfillmentDetails', e.target.value)} rows={2} maxLength={1000} className={INPUT} />
              </Field>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="mb-1 text-lg font-semibold text-gray-900">Experiences</legend>
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input type="checkbox" checked={form.isExperience} onChange={(e) => set('isExperience', e.target.checked)} className="mt-1" />
                <span>This is an experience (a service, event, trip, lesson, or similar) rather than a physical item.</span>
              </label>
              {form.isExperience && (
                <div className="space-y-4">
                  <Field id="donate-scheduling" label="Scheduling requirements" hint="For example: book 2 weeks ahead, weekdays only.">
                    <textarea id="donate-scheduling" value={form.scheduling} onChange={(e) => set('scheduling', e.target.value)} rows={2} maxLength={1000} className={INPUT} />
                  </Field>
                  <Field id="donate-blackout" label="Blackout dates">
                    <textarea id="donate-blackout" value={form.blackout} onChange={(e) => set('blackout', e.target.value)} rows={2} maxLength={1000} className={INPUT} />
                  </Field>
                </div>
              )}
            </fieldset>

            <label className="flex items-start gap-3 rounded-lg bg-purple-50 p-4 text-sm text-purple-900">
              <input type="checkbox" checked={form.recognitionOk} onChange={(e) => set('recognitionOk', e.target.checked)} className="mt-1" />
              <span>Yes, publicly recognize me or my business as the donor of this item. If unchecked, your name and business are kept private and not shown on the item page.</span>
            </label>

            <div>
              <button type="submit" disabled={busy || photos.some((p) => p.status === 'uploading')} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700 disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Submit donation
              </button>
              <p className="mt-2 text-center text-xs text-gray-500">Your email and phone are only shared with the organizers, never shown publicly.</p>
            </div>
          </form>
        )}

        {step === 'done' && (
          <div className="py-4 text-center" role="status">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-semibold text-gray-900">Thank you for your donation!</h2>
            <p className="mx-auto mt-2 max-w-md text-gray-600">
              {orgName ?? 'The organizers'} will review your item. Once approved it will be added to the auction, and they may contact you at the email or phone you provided with any questions.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => { setForm({ ...EMPTY, donorName: name, }); setStep('form'); setError(null) }}
                className="rounded-lg border border-purple-300 px-5 py-2.5 font-medium text-purple-700 hover:bg-purple-50"
              >
                Donate another item
              </button>
              <Link href={basePath} className="rounded-lg bg-purple-600 px-5 py-2.5 font-medium text-white hover:bg-purple-700">Back to the auction</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
