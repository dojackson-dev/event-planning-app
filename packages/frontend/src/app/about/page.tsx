import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About | EventEcos',
  description: 'The story behind EventEcos and the team building it.',
}

// TODO(D3.3, D1.4): Replace the placeholder photo, story, and social link
// below with the founder's real photo, a first-person ~150-word "why I
// built this" story, and a real LinkedIn or X profile link. Name and legal
// entity (DoVenue Suites, confirmed via repo-wide usage) are real — confirm
// the name is correct before publishing. Do not invent quotes, metrics, or
// history beyond what's provided here.
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-accent-600 hover:underline text-sm">&larr; Back to EventEcos</Link>

        <div className="mt-8 flex flex-col items-center text-center">
          {/* TODO: replace with a real founder photo */}
          <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm mb-6">
            Photo
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Larry Nixon</h1>
          <p className="text-gray-500 mb-8">Founder, EventEcos — a product of DoVenue Suites</p>
        </div>

        <div className="prose prose-gray max-w-none">
          {/* TODO: replace with a real first-person ~150-word story */}
          <p className="text-gray-600 italic">
            [Founder story placeholder — add a first-person account of why EventEcos was built, in Larry&apos;s own words.]
          </p>
        </div>

        {/* TODO: add a real LinkedIn or X profile link */}
        <p className="mt-8 text-sm text-gray-500">
          Connect: <span className="italic">[LinkedIn or X link pending]</span>
        </p>
      </div>
    </div>
  )
}
