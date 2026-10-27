'use client'

import Link from 'next/link'
import { Calendar, CalendarDays, Heart, MapPin, Ticket } from 'lucide-react'

export interface EventListingCardProps {
  title: string
  /** YYYY-MM-DD */
  date: string | null
  time: string | null
  venue: string | null
  city: string | null
  state: string | null
  imageUrl: string | null
  price?: string | null
  priceTone?: 'normal' | 'danger'
  /** Small line under the price, e.g. "See seats & tickets". */
  note?: string
  href: string | null
  external?: boolean
  placeholder?: 'calendar' | 'ticket'
  /** Corner badges over the photo (age limit, non-profit, ...). */
  badges?: React.ReactNode
  favorited: boolean
  onToggleFavorite: () => void
}

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

/** 19:00 -> 7 PM, 19:30 -> 7:30 PM; text that already has AM/PM is left alone. */
export const formatTime = (value: string | null): string | null => {
  if (!value) return null
  if (/[ap]\.?m/i.test(value)) return value
  const m = value.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return value
  const hour = Number(m[1])
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return m[2] === '00' ? `${h12} ${suffix}` : `${h12}:${m[2]} ${suffix}`
}

/** One event in the feed: photo with a favourite heart, title and price, when and where. */
export default function EventListingCard(p: EventListingCardProps) {
  const when = [p.date ? formatDate(p.date) : null, formatTime(p.time)].filter(Boolean).join(' · ')
  const where = [p.venue, [p.city, p.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
  const linkClass = 'after:absolute after:inset-0 after:content-[""] focus-visible:outline-none'

  const title = p.href ? (
    p.external ? (
      <a href={p.href} target="_blank" rel="noopener noreferrer" className={linkClass}>{p.title}</a>
    ) : (
      <Link href={p.href} className={linkClass}>{p.title}</Link>
    )
  ) : (
    p.title
  )

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-indigo-400 hover:shadow-md">
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-100">
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center">
            {p.placeholder === 'ticket'
              ? <Ticket className="h-12 w-12 text-indigo-300" />
              : <Calendar className="h-12 w-12 text-indigo-300" />}
          </div>
        )}
        {p.badges && <div className="absolute left-3 top-3 flex max-w-[70%] flex-col items-start gap-1">{p.badges}</div>}
        <button
          type="button"
          onClick={p.onToggleFavorite}
          aria-pressed={p.favorited}
          aria-label={p.favorited ? `Remove ${p.title} from favorites` : `Save ${p.title} to favorites`}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow hover:bg-white"
        >
          <Heart className={`h-5 w-5 ${p.favorited ? 'fill-rose-500 text-rose-500' : 'text-gray-700'}`} />
        </button>
      </div>

      <div className="space-y-1.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-gray-900">{title}</h3>
          {p.price && (
            <span className={`shrink-0 text-base font-bold ${p.priceTone === 'danger' ? 'text-red-500' : 'text-gray-900'}`}>
              {p.price}
            </span>
          )}
        </div>
        {when && (
          <p className="flex items-center gap-2 text-sm text-gray-600">
            <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" />
            {when}
          </p>
        )}
        {where && (
          <p className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="truncate">{where}</span>
          </p>
        )}
        {p.note && <p className="pt-0.5 text-xs font-medium text-indigo-600">{p.note}</p>}
      </div>
    </article>
  )
}
