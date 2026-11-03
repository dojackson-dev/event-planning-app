'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import api from '@/lib/api'

interface ManagedPhoto {
  id: string
  url: string
}

interface PhotoManagerProps {
  /** List/add/delete endpoint, e.g. /listing-photos/vendor or /listing-photos/venue/<id>. */
  endpoint: string
  uploadType: 'vendor-photo' | 'venue-photo'
  max?: number
}

const MAX_MB = 8
const TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

/** Upload, view and remove the photos (up to 5) that appear on the Find pages. */
export default function PhotoManager({ endpoint, uploadType, max = 5 }: PhotoManagerProps) {
  const [photos, setPhotos] = useState<ManagedPhoto[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    setLoadError('')
    api
      .get<ManagedPhoto[]>(endpoint)
      .then(res => setPhotos(res.data))
      .catch(err => setLoadError(err.response?.data?.message || 'Could not load photos.'))
  }, [endpoint])

  useEffect(() => {
    setPhotos(null)
    load()
  }, [load])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    setError('')
    if (!TYPES.includes(file.type)) return setError('Please use a JPEG, PNG or WebP photo.')
    if (file.size > MAX_MB * 1024 * 1024) return setError(`Photos must be under ${MAX_MB} MB.`)

    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const uploaded = await api.post<{ url: string }>(`/upload/${uploadType}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const res = await api.post<ManagedPhoto[]>(endpoint, { imageUrl: uploaded.data.url })
      setPhotos(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (photo: ManagedPhoto) => {
    if (!window.confirm('Remove this photo?')) return
    setError('')
    setBusy(true)
    try {
      const res = await api.delete<ManagedPhoto[]>(`${endpoint}/${photo.id}`)
      setPhotos(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not remove the photo.')
    } finally {
      setBusy(false)
    }
  }

  if (loadError) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {loadError}{' '}
        <button type="button" onClick={load} className="font-medium underline">Try again</button>
      </div>
    )
  }
  if (photos === null) {
    return <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading photos…</div>
  }

  const full = photos.length >= max
  return (
    <div>
      <p className="mb-3 text-sm text-gray-600">
        {photos.length} of {max} photos. They appear as a slideshow on your card on the Find page. JPEG, PNG or WebP, up to {MAX_MB} MB each.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo, i) => (
          <div key={photo.id} className="group relative aspect-[3/2] overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
            <img src={photo.url} alt={`Photo ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => handleDelete(photo)}
              disabled={busy}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        {!full && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex aspect-[3/2] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-primary-400 hover:bg-primary-50 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
            <span className="text-xs font-medium">{busy ? 'Uploading…' : 'Add photo'}</span>
          </button>
        )}
      </div>
      {photos.length === 0 && (
        <p className="mt-3 text-xs text-gray-500">No photos yet. Until you add some, your card shows a placeholder.</p>
      )}
      {full && <p className="mt-3 text-xs text-gray-500">You have {max} photos. Remove one to add another.</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      <input ref={inputRef} type="file" accept={TYPES.join(',')} className="hidden" onChange={handleFile} />
    </div>
  )
}
