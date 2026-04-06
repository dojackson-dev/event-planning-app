'use client'

import { useRef, useState } from 'react'
import api from '@/lib/api'

type UploadType = 'vendor-logo' | 'vendor-cover' | 'service-item' | 'owner-logo'

interface ImageUploadProps {
  currentUrl?: string | null
  uploadType: UploadType
  onUpload: (url: string) => void
  /** Shape of the preview: 'square' (1:1) or 'landscape' (4:3) */
  shape?: 'square' | 'landscape'
  /** Placeholder shown when no image is set */
  placeholder?: React.ReactNode
  className?: string
}

const SPECS: Record<UploadType, { label: string; size: string; dims: string; maxMB: number; accept: string }> = {
  'vendor-logo': {
    label: 'Business Logo',
    size: 'Max 2 MB',
    dims: '400 × 400 px recommended',
    maxMB: 2,
    accept: 'image/jpeg,image/png,image/webp',
  },
  'vendor-cover': {
    label: 'Cover Photo',
    size: 'Max 5 MB',
    dims: '1200 × 400 px recommended (3:1 landscape)',
    maxMB: 5,
    accept: 'image/jpeg,image/png,image/webp',
  },
  'service-item': {
    label: 'Item Image',
    size: 'Max 5 MB',
    dims: '800 × 600 px recommended (4:3)',
    maxMB: 5,
    accept: 'image/jpeg,image/png,image/webp',
  },
  'owner-logo': {
    label: 'Venue Logo',
    size: 'Max 3 MB',
    dims: 'Any size — landscape logos work best',
    maxMB: 3,
    accept: 'image/jpeg,image/png,image/webp',
  },
}

export default function ImageUpload({
  currentUrl,
  uploadType,
  onUpload,
  shape = 'square',
  placeholder,
  className = '',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const spec = SPECS[uploadType]
  const aspectClass = shape === 'landscape' ? 'aspect-[4/3]' : 'aspect-square'

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    // Client-side validation
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Please use JPEG, PNG, or WebP format.')
      return
    }
    if (file.size > spec.maxMB * 1024 * 1024) {
      setError(`File must be under ${spec.maxMB} MB.`)
      return
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    setUploading(true)

    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post(`/upload/${uploadType}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPreview(res.data.url)
      onUpload(res.data.url)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.')
      setPreview(currentUrl || null)
    } finally {
      setUploading(false)
      // Reset so same file can be re-selected
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={`flex flex-col items-start gap-2 ${className}`}>
      {/* Preview / Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`
          relative group ${aspectClass} overflow-hidden rounded-xl border-2 border-dashed
          border-gray-300 hover:border-primary-400 bg-gray-50 hover:bg-primary-50
          transition-all disabled:opacity-60 disabled:cursor-not-allowed
          ${shape === 'landscape' ? 'w-full' : 'w-32'}
        `}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-semibold">Change</span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-1 p-2">
            {placeholder ?? (
              <>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-center leading-tight">Click to upload</span>
              </>
            )}
          </div>
        )}

        {/* Upload spinner overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </button>

      {/* Specs hint */}
      <div className="text-xs text-gray-400 leading-relaxed">
        <span className="font-medium text-gray-500">Format:</span> JPEG, PNG, WebP
        <br />
        <span className="font-medium text-gray-500">Size:</span> {spec.size}
        <br />
        <span className="font-medium text-gray-500">Dimensions:</span> {spec.dims}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 font-medium">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={spec.accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
