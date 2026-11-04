import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface VenueBookingLink {
  owner_accounts?: { business_name?: string; intake_slug?: string | null } | null
}

/**
 * A venue has one public link: its client intake link. Booking links that were already shared
 * (/book-venue/<name>) go straight to it, because the intake form is where booking requests are taken.
 */
export default async function VenueBookingLinkPage({ params }: { params: { slug: string } }) {
  let link: VenueBookingLink | null = null
  try {
    const res = await fetch(`${API_URL}/owner/booking-link/${encodeURIComponent(params.slug)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) link = await res.json()
  } catch {
    // treated like an unknown link below
  }
  if (!link) notFound()

  const intakeSlug = link.owner_accounts?.intake_slug
  if (intakeSlug) redirect(`/intake/${encodeURIComponent(intakeSlug)}`)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Booking form unavailable</h1>
        <p className="text-gray-500 text-sm">
          This booking form is temporarily unavailable. Please contact {link.owner_accounts?.business_name ?? 'the venue'} directly.
        </p>
      </div>
    </div>
  )
}
