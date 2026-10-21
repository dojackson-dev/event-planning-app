'use client'

import { useId, useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { errorMessage, uploadAuctionImage } from '../lib'

interface Props {
  label: string
  value: string | null
  onChange: (url: string | null) => void
  hint?: string
  disabled?: boolean
  /** Tailwind classes for the preview box, e.g. "h-24 w-24" or "h-32 w-full". */
  previewClass?: string
  /** Show the preview image fully instead of cropping it (logos). */
  contain?: boolean
  onBusyChange?: (busy: boolean) => void
}

/** Single-image uploader that reuses the organizer item-image upload endpoint. */
export default function ImageUploadField({ label, value, onChange, hint, disabled, previewClass = 'h-24 w-24', contain, onBusyChange }: Props) {
  const id = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pick = async (file: File) => {
    setError(null)
    setUploading(true)
    onBusyChange?.(true)
    try {
      onChange(await uploadAuctionImage(file))
    } catch (err) {
      setError(err instanceof Error && !('response' in err) ? err.message : errorMessage(err, 'Photo upload failed.'))
    } finally {
      setUploading(false)
      onBusyChange?.(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <span id={`${id}-label`} className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <div className="flex flex-wrap items-center gap-3">
        <div className={`relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 ${previewClass}`}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={`${label} preview`} className={`h-full w-full ${contain ? 'object-contain' : 'object-cover'}`} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300">
              <ImagePlus className="h-6 w-6" aria-hidden="true" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" aria-label="Uploading" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || uploading}
            aria-describedby={`${id}-label`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <ImagePlus className="h-4 w-4" /> {value ? 'Replace' : 'Upload'}
          </button>
          {value && (
            <button type="button" onClick={() => onChange(null)} disabled={disabled || uploading} className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline disabled:opacity-60">
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-labelledby={`${id}-label`}
        onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
