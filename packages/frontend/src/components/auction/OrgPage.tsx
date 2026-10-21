import Link from 'next/link'
import { notFound } from 'next/navigation'
import { serverGetOrganization } from '@/lib/auctionApi'
import AuctionCard from './AuctionCard'
import Gallery from './Gallery'
import { AboutCause, GoalProgress, OrgHero, OrgLinks, SponsorsSection } from './OrgSections'
import ShareButton from './ShareButton'

/** Server component: the public organization page. 404s unless the organization is published. */
export default async function OrgPage({ slug }: { slug: string }) {
  const result = await serverGetOrganization(slug)
  if (result.status === 'not_found') notFound()
  if (result.status === 'error') {
    return (
      <div className="py-16 text-center">
        <p role="alert" className="mb-3 text-gray-600">We could not load this page right now. Please try again in a moment.</p>
        <Link href={`/auctions/${encodeURIComponent(slug)}`} className="font-medium text-purple-600 underline">Reload</Link>
      </div>
    )
  }

  const { organization: org, gallery, sponsors, auctions } = result.data
  // Only counts when every auction reports a total, so a partial figure is never presented as progress.
  const reported = auctions.filter((a) => typeof a.bid_total_cents === 'number')
  const raised = auctions.length > 0 && reported.length === auctions.length ? reported.reduce((sum, a) => sum + (a.bid_total_cents ?? 0), 0) : null

  return (
    <div className="space-y-8">
      <OrgHero
        org={org}
        title={org.name}
        subtitle={org.tagline}
        aside={org.goal_cents ? <GoalProgress goalCents={org.goal_cents} raisedCents={raised} /> : undefined}
      >
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <OrgLinks org={org} />
          <ShareButton path={`/auctions/${org.slug}`} title={org.name} />
        </div>
      </OrgHero>

      <AboutCause org={org} />
      <Gallery images={gallery} />

      <section aria-labelledby="org-auctions">
        <h2 id="org-auctions" className="text-2xl font-bold text-gray-900">Our Auctions</h2>
        {auctions.length === 0 ? (
          <p className="mt-4 rounded-xl bg-white p-8 text-center text-gray-500 ring-1 ring-gray-200">No auctions have been announced yet. Check back soon.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {auctions.map((a) => <li key={a.id}><AuctionCard auction={a} orgSlug={org.slug} /></li>)}
          </ul>
        )}
      </section>

      <SponsorsSection sponsors={sponsors} />
    </div>
  )
}
