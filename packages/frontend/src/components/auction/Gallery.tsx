'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { GalleryImage } from '@/lib/auctionApi'
import PhotoCarousel from './PhotoCarousel'

/** "Our Work" photo carousel with an accessible lightbox (focus trap, Esc, arrow keys). */
export default function Gallery({ images }: { images: GalleryImage[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const lastOpened = useRef<number>(0)

  const close = useCallback(() => {
    setOpen(null)
  }, [])
  const step = useCallback(
    (delta: number) => setOpen((i) => (i == null ? i : (i + delta + images.length) % images.length)),
    [images.length],
  )

  useEffect(() => {
    if (open == null) return
    closeRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])')
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open != null, close, step]) // eslint-disable-line react-hooks/exhaustive-deps

  if (images.length === 0) return null
  const current = open != null ? images[open] : null

  return (
    <section aria-labelledby="our-work" className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:p-8">
      <h2 id="our-work" className="text-2xl font-bold text-gray-900">Our Work</h2>
      <div className="mt-4">
        <PhotoCarousel
          photos={images.map((img, i) => ({ src: img.image_url, alt: img.caption || `Our work photo ${i + 1}`, caption: img.caption }))}
          label="Our Work photos"
          perView="multi"
          autoplayMs={6000}
          onSelect={(i) => { lastOpened.current = i; setOpen(i) }}
        />
      </div>

      {current && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <button ref={closeRef} type="button" onClick={close} aria-label="Close photo viewer" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white">
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
          {images.length > 1 && (
            <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white sm:left-4">
              <ChevronLeft className="h-7 w-7" aria-hidden="true" />
            </button>
          )}
          <figure className="max-h-full max-w-4xl text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.image_url} alt={current.caption || `Photo ${(open ?? 0) + 1} of ${images.length}`} className="mx-auto max-h-[75vh] rounded-lg object-contain" />
            <figcaption className="mt-3 text-sm text-white" aria-live="polite">
              {current.caption}
              <span className="block text-xs text-white/60">{(open ?? 0) + 1} / {images.length}</span>
            </figcaption>
          </figure>
          {images.length > 1 && (
            <button type="button" onClick={() => step(1)} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white sm:right-4">
              <ChevronRight className="h-7 w-7" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </section>
  )
}
