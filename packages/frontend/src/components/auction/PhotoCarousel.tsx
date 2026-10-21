'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ItemPhotoPlaceholder } from './PhotoPlaceholder'

export interface CarouselPhoto {
  src: string
  alt: string
  caption?: string | null
}

interface PhotoCarouselProps {
  photos: CarouselPhoto[]
  label: string
  /** 'single' shows one photo at a time; 'multi' shows 1 / 2 / 3 per view by screen width. */
  perView?: 'single' | 'multi'
  aspect?: string
  fit?: 'cover' | 'contain'
  showThumbnails?: boolean
  /** Advance on a timer; paused on hover/focus and disabled when the visitor prefers reduced motion. */
  autoplayMs?: number
  onSelect?: (index: number) => void
}

const SLIDE_WIDTH: Record<NonNullable<PhotoCarouselProps['perView']>, string> = {
  single: 'basis-full',
  multi: 'basis-full sm:basis-[calc(50%-0.375rem)] lg:basis-[calc(33.333%-0.5rem)]',
}

/** Swipeable photo carousel (native scroll-snap) with arrows, dots, keyboard and optional autoplay. */
export default function PhotoCarousel({
  photos,
  label,
  perView = 'single',
  aspect = 'aspect-[4/3]',
  fit = 'cover',
  showThumbnails = false,
  autoplayMs,
  onSelect,
}: PhotoCarouselProps) {
  const track = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = photos.length

  const slideStep = useCallback(() => {
    const slides = track.current?.children
    if (!slides || slides.length === 0) return 0
    const first = slides[0] as HTMLElement
    const second = slides[1] as HTMLElement | undefined
    return second ? second.offsetLeft - first.offsetLeft : first.offsetWidth
  }, [])

  const goTo = useCallback((index: number, smooth = true) => {
    const el = track.current
    if (!el) return
    const step = slideStep()
    el.scrollTo({ left: step * index, behavior: smooth ? 'smooth' : 'auto' })
  }, [slideStep])

  const onScroll = useCallback(() => {
    const el = track.current
    const step = slideStep()
    if (!el || step === 0) return
    const maxScroll = el.scrollWidth - el.clientWidth
    const index = el.scrollLeft >= maxScroll - 2 ? count - 1 : Math.round(el.scrollLeft / step)
    setActive(Math.min(Math.max(index, 0), count - 1))
  }, [count, slideStep])

  const move = useCallback((delta: number) => {
    const el = track.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    const step = slideStep()
    const atEnd = el.scrollLeft >= maxScroll - 2
    if (delta > 0 && atEnd) goTo(0)
    else if (delta < 0 && el.scrollLeft <= 2) el.scrollTo({ left: maxScroll, behavior: 'smooth' })
    else el.scrollBy({ left: delta * step, behavior: 'smooth' })
  }, [goTo, slideStep])

  useEffect(() => {
    if (!autoplayMs || count < 2 || paused) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => {
      if (!document.hidden) move(1)
    }, autoplayMs)
    return () => window.clearInterval(id)
  }, [autoplayMs, count, paused, move])

  if (count === 0) {
    return <div className={`${aspect} overflow-hidden rounded-xl`}><ItemPhotoPlaceholder /></div>
  }

  const imgClass = `h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative">
        <ul
          ref={track}
          onScroll={onScroll}
          tabIndex={0}
          aria-label={`${label}, use the arrow keys to browse`}
          onKeyDown={(e) => {
            if (count < 2) return
            if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1) }
            else if (e.key === 'ArrowRight') { e.preventDefault(); move(1) }
          }}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((photo, i) => (
            <li
              key={`${photo.src}-${i}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              className={`${SLIDE_WIDTH[perView]} shrink-0 snap-start`}
            >
              {(() => {
                const content = (
                  <>
                    <span className={`block ${aspect} overflow-hidden rounded-xl bg-gray-100`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.src} alt={photo.alt} loading={i === 0 ? 'eager' : 'lazy'} draggable={false} className={imgClass} />
                    </span>
                    {photo.caption && <span className="mt-1.5 block px-1 text-sm text-gray-600">{photo.caption}</span>}
                  </>
                )
                return onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(i)}
                    aria-label={`View larger: ${photo.caption || photo.alt}`}
                    className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  >
                    {content}
                  </button>
                ) : (
                  <div>{content}</div>
                )
              })()}
            </li>
          ))}
        </ul>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous photo"
              className="absolute left-2 top-[40%] -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next photo"
              className="absolute right-2 top-[40%] -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {count > 1 && !showThumbnails && (
        <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label={`${label} slides`}>
          {photos.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Go to photo ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${i === active ? 'w-6 bg-purple-600' : 'w-2 bg-gray-300 hover:bg-gray-400'}`}
            />
          ))}
        </div>
      )}

      {count > 1 && showThumbnails && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, i) => (
            <button
              key={`${photo.src}-${i}`}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-purple-500 ${i === active ? 'border-purple-600' : 'border-transparent'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <p className="sr-only" aria-live="polite">Photo {active + 1} of {count}</p>
    </div>
  )
}
