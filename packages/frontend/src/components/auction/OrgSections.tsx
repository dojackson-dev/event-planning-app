import { Facebook, Globe, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react'
import type { AuctionStoryData, PublicOrg, Sponsor } from '@/lib/auctionApi'
import { formatUsd } from './format'
import { safeUrl } from './seo'

const SOCIAL: Array<{ key: keyof PublicOrg['social']; label: string; Icon: typeof Globe }> = [
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'x', label: 'X', Icon: Twitter },
  { key: 'youtube', label: 'YouTube', Icon: Youtube },
  { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
]

export function OrgLinks({ org }: { org: PublicOrg }) {
  const website = safeUrl(org.website_url)
  const socials = SOCIAL.map((s) => ({ ...s, url: safeUrl(org.social[s.key]) })).filter((s) => s.url)
  if (!website && socials.length === 0) return null
  const cls = 'inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-purple-300 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500'
  return (
    <ul className="flex flex-wrap gap-2" aria-label={`${org.name} links`}>
      {website && (
        <li><a href={website} target="_blank" rel="noopener noreferrer" className={cls}><Globe className="h-4 w-4" aria-hidden="true" /> Website</a></li>
      )}
      {socials.map(({ key, label, Icon, url }) => (
        <li key={key}><a href={url!} target="_blank" rel="noopener noreferrer" className={cls}><Icon className="h-4 w-4" aria-hidden="true" /> {label}</a></li>
      ))}
    </ul>
  )
}

export function GoalProgress({ goalCents, raisedCents }: { goalCents: number | null; raisedCents?: number | null }) {
  if (!goalCents) return null
  const hasRaised = typeof raisedCents === 'number'
  const pct = hasRaised ? Math.min(100, Math.round((raisedCents / goalCents) * 100)) : 0
  return (
    <div className="rounded-xl bg-white/95 p-4 shadow-sm ring-1 ring-gray-200">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Fundraising goal</p>
      <p className="text-2xl font-bold text-gray-900">{formatUsd(goalCents)}</p>
      {hasRaised && (
        <>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Progress toward fundraising goal"
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-200"
          >
            <div className="h-full rounded-full bg-purple-600" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-sm text-gray-600">{formatUsd(raisedCents)} raised ({pct}%)</p>
        </>
      )}
    </div>
  )
}

export function OrgHero({
  org,
  coverImage,
  eyebrow,
  title,
  subtitle,
  children,
  aside,
}: {
  org: PublicOrg | null
  coverImage?: string | null
  eyebrow?: React.ReactNode
  title: string
  subtitle?: string | null
  children?: React.ReactNode
  aside?: React.ReactNode
}) {
  const cover = coverImage || org?.cover_image_url
  return (
    <header className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
      <div className="relative h-44 bg-gradient-to-br from-purple-600 to-indigo-700 sm:h-64">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={`${org?.name ?? title} cover`} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="relative px-5 pb-6 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="-mt-12 flex items-end gap-4 sm:-mt-14">
            {org?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo_url} alt={`${org.name} logo`} className="h-24 w-24 shrink-0 rounded-xl border-4 border-white bg-white object-contain shadow sm:h-28 sm:w-28" />
            ) : (
              <div aria-hidden="true" className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border-4 border-white bg-purple-100 text-3xl font-bold text-purple-700 shadow sm:h-28 sm:w-28">
                {(org?.name || title).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {aside && <div className="w-full sm:w-72">{aside}</div>}
        </div>
        <div className="mt-4">
          {eyebrow}
          <h1 className="mt-1 text-3xl font-bold text-gray-900 sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-3xl text-lg text-gray-600">{subtitle}</p>}
        </div>
        {children}
      </div>
    </header>
  )
}

export function AboutCause({ org }: { org: PublicOrg }) {
  if (!org.story && !org.beneficiaries && org.impact_examples.length === 0) return null
  return (
    <section aria-labelledby="about-cause" className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:p-8">
      <h2 id="about-cause" className="text-2xl font-bold text-gray-900">About the Cause</h2>
      {org.story && <p className="mt-3 max-w-3xl whitespace-pre-line leading-relaxed text-gray-700">{org.story}</p>}
      {org.beneficiaries && (
        <div className="mt-6">
          <h3 className="font-semibold text-gray-900">Who benefits</h3>
          <p className="mt-1 max-w-3xl whitespace-pre-line text-gray-700">{org.beneficiaries}</p>
        </div>
      )}
      {org.impact_examples.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-gray-900">Your impact</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {org.impact_examples.map((e, i) => (
              <li key={`${e.title}-${i}`} className="rounded-xl bg-purple-50 p-4">
                {e.title && <p className="font-semibold text-purple-900">{e.title}</p>}
                {e.text && <p className="mt-1 text-sm text-purple-900/80">{e.text}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  const url = safeUrl(sponsor.website_url)
  const body = (
    <>
      {sponsor.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={sponsor.logo_url} alt={`${sponsor.name} logo`} loading="lazy" className="h-16 w-full object-contain" />
      ) : (
        <span className="flex h-16 items-center justify-center text-center font-semibold text-gray-700">{sponsor.name}</span>
      )}
      {sponsor.logo_url && <span className="mt-2 block text-center text-sm font-medium text-gray-700">{sponsor.name}</span>}
    </>
  )
  const cls = 'block rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500'
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer sponsored" className={cls}>{body}</a>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export function SponsorsSection({ sponsors }: { sponsors: Sponsor[] }) {
  if (sponsors.length === 0) return null
  // Preserve the organizer's ordering: tiers appear in the order their first sponsor appears.
  const groups = new Map<string, Sponsor[]>()
  for (const s of sponsors) {
    const tier = s.tier?.trim() || 'Supporters'
    groups.set(tier, [...(groups.get(tier) ?? []), s])
  }
  return (
    <section aria-labelledby="sponsors" className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:p-8">
      <h2 id="sponsors" className="text-2xl font-bold text-gray-900">Supporters &amp; Sponsors</h2>
      <p className="mt-1 text-gray-600">Thank you to the businesses and individuals who make this work possible.</p>
      <div className="mt-5 space-y-6">
        {Array.from(groups.entries()).map(([tier, list]) => (
          <div key={tier}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-purple-700">{tier}</h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {list.map((s) => <li key={s.id}><SponsorCard sponsor={s} /></li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

export type StoryBits = Pick<AuctionStoryData, 'organization' | 'gallery' | 'sponsors'>
