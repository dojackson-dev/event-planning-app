'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import ConfirmDialog from '../ConfirmDialog'
import ReorderButtons from '../ReorderButtons'
import { OrgGalleryItem, errorMessage, uploadAuctionImage } from '../../lib'

const MAX_PHOTOS = 24

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100'

function GalleryRow({
  photo, index, count, busy, onMove, onSaveCaption, onDelete,
}: {
  photo: OrgGalleryItem
  index: number
  count: number
  busy: boolean
  onMove: (from: number, to: number) => void
  onSaveCaption: (photo: OrgGalleryItem, caption: string) => Promise<void>
  onDelete: (photo: OrgGalleryItem) => void
}) {
  const [caption, setCaption] = useState(photo.caption ?? '')
  const [saving, setSaving] = useState(false)
  const changed = caption.trim() !== (photo.caption ?? '')

  const save = async () => {
    setSaving(true)
    try {
      await onSaveCaption(photo, caption.trim())
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <ReorderButtons index={index} count={count} label={`photo ${index + 1}`} disabled={busy} onMove={onMove} />
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.image_url} alt={photo.caption || `Gallery photo ${index + 1}`} className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <label htmlFor={`caption-${photo.id}`} className="sr-only">Caption for photo {index + 1}</label>
        <input id={`caption-${photo.id}`} className={inputClass} placeholder="Caption (optional)" maxLength={300} value={caption} onChange={(e) => setCaption(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && changed) { e.preventDefault(); save() } }} disabled={busy || saving} />
        <div className="mt-2 flex items-center gap-3">
          {changed && (
            <button type="button" onClick={save} disabled={busy || saving} className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-60">
              {saving && <Loader2 className="h-3 w-3 animate-spin" />} Save caption
            </button>
          )}
          <button type="button" onClick={() => onDelete(photo)} disabled={busy} className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline disabled:opacity-60">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>
    </li>
  )
}

export default function GalleryManager({ initial }: { initial: OrgGalleryItem[] }) {
  const [photos, setPhotos] = useState<OrgGalleryItem[]>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<OrgGalleryItem | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const upload = async (files: FileList) => {
    setError(null)
    setBusy(true)
    try {
      for (const file of Array.from(files)) {
        if (photos.length >= MAX_PHOTOS) {
          setError(`You can add up to ${MAX_PHOTOS} photos.`)
          break
        }
        const url = await uploadAuctionImage(file)
        const res = await api.post<OrgGalleryItem>('/auctions/manage/organization/gallery', { image_url: url, caption: '' })
        setPhotos((prev) => [...prev, { ...res.data, image_url: res.data?.image_url ?? url }])
      }
    } catch (err) {
      setError(err instanceof Error && !('response' in err) ? err.message : errorMessage(err, 'Could not add the photo.'))
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const saveCaption = async (photo: OrgGalleryItem, caption: string) => {
    setError(null)
    try {
      await api.put(`/auctions/manage/organization/gallery/${photo.id}`, { caption })
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, caption: caption || null } : p)))
    } catch (err) {
      setError(errorMessage(err, 'Could not save the caption.'))
    }
  }

  const move = async (from: number, to: number) => {
    const before = photos
    const next = [...photos]
    const [row] = next.splice(from, 1)
    next.splice(to, 0, row)
    setPhotos(next)
    setBusy(true)
    setError(null)
    try {
      await api.put('/auctions/manage/organization/gallery-order', { ids: next.map((p) => p.id) })
    } catch (err) {
      setPhotos(before)
      setError(errorMessage(err, 'Could not reorder the photos.'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    setError(null)
    try {
      await api.delete(`/auctions/manage/organization/gallery/${deleting.id}`)
      setPhotos((prev) => prev.filter((p) => p.id !== deleting.id))
      setDeleting(null)
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the photo.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 p-5" aria-labelledby="gallery-heading">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="gallery-heading" className="text-base font-semibold text-gray-900">Photo gallery</h2>
          <p className="text-xs text-gray-500">Photos of your work and the people you serve. Changes here save immediately.</p>
        </div>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || photos.length >= MAX_PHOTOS} className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Add photos
        </button>
        <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Add gallery photos" onChange={(e) => e.target.files?.length && upload(e.target.files)} />
      </div>
      {error && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {photos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white py-8 text-center text-sm text-gray-500">No photos yet.</p>
      ) : (
        <ul className="grid gap-3">
          {photos.map((photo, i) => (
            <GalleryRow key={photo.id} photo={photo} index={i} count={photos.length} busy={busy} onMove={move} onSaveCaption={saveCaption} onDelete={setDeleting} />
          ))}
        </ul>
      )}
      <ConfirmDialog open={!!deleting} title="Delete photo" message="Remove this photo from your gallery? This cannot be undone." confirmLabel="Delete photo" danger busy={busy} error={error} onConfirm={remove} onCancel={() => { setDeleting(null); setError(null) }} />
    </section>
  )
}
