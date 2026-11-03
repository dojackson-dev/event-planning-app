'use client'

import { useCallback, useRef, useState } from 'react'

interface PhotoCarouselProps {
  photos?: string[] | null
  alt: string
  /** Shown when there are no photos (or none load): an emoji or short text. */
  placeholder: React.ReactNode
  /** Show images whole (for logos) instead of filling and cropping the frame. */
  contain?: boolean
  /** Frame shape; defaults to 16:10. */
  aspectClass?: string
  className?: string
}

const MAX_PHOTOS = 5
const SWIPE_PX = 40

/** Up to 5 photos with arrows, dots and swipe; a placeholder when there are none. Safe to place inside a card. */
export default function PhotoCarousel({ photos, alt, placeholder, contain = false, aspectClass = 'aspect-[16/10]', className = '' }: PhotoCarouselProps) {
  const [index, setIndex] = useState(0)
  const [broken, setBroken] = useState<Set<string>>(() => new Set())
  const touchStartX = useRef<number | null>(null)

  const visible = (photos ?? []).filter(url => url && !broken.has(url)).slice(0, MAX_PHOTOS)
  const count = visible.length
  const current = Math.min(index, Math.max(count - 1, 0))

  const go = useCallback(
    (delta: number) => setIndex(((current + delta) % count + count) % count),
    [current, count],
  )

  if (count === 0) {
    return (
      <div
        className={`flex ${aspectClass} w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400 ${className}`}
        role="img"
        aria-label={`No photos yet for ${alt}`}
      >
        <span className="select-none text-4xl">{placeholder}</span>
        <span className="text-xs">Photos coming soon</span>
      </div>
    )
  }

  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div
      className={`group relative ${aspectClass} w-full overflow-hidden bg-gray-100 ${className}`}
      role="group"
      aria-roledescription="carousel"
      aria-label={`${alt} photos`}
      tabIndex={count > 1 ? 0 : undefined}
      onKeyDown={e => {
        if (count < 2) return
        if (e.key === 'ArrowLeft') { stop(e); go(-1) }
        if (e.key === 'ArrowRight') { stop(e); go(1) }
      }}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (touchStartX.current === null || count < 2) return
        const dx = e.changedTouches[0].clientX - touchStartX.current
        touchStartX.current = null
        if (Math.abs(dx) >= SWIPE_PX) go(dx < 0 ? 1 : -1)
      }}
    >
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {visible.map((url, i) => (
          <div
            key={url}
            className="h-full w-full flex-shrink-0"
            aria-hidden={i !== current}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
          >
            <img
              src={url}
              alt={i === current ? `${alt} photo ${i + 1} of ${count}` : ''}
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={() => setBroken(prev => new Set(prev).add(url))}
              className={`h-full w-full ${contain ? 'object-contain p-4' : 'object-cover'}`}
            />
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={e => { stop(e); go(-1) }}
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow transition-opacity hover:bg-white focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={e => { stop(e); go(1) }}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow transition-opacity hover:bg-white focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            ›
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {visible.map((url, i) => (
              <button
                key={url}
                type="button"
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === current}
                onClick={e => { stop(e); setIndex(i) }}
                className={`h-1.5 rounded-full transition-all ${i === current ? 'w-4 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/90'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
