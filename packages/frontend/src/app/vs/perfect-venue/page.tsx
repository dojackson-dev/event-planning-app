import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'EventEcos vs Perfect Venue | Pricing & Marketplace Comparison',
  description:
    'How EventEcos compares to Perfect Venue on pricing, multi-venue support, and marketplace discovery for venue booking and event management.',
}

export default function VsPerfectVenuePage() {
  return (
    <div className="min-h-screen bg-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-accent-600 hover:underline text-sm">&larr; Back to EventEcos</Link>

        <h1 className="text-4xl font-bold text-gray-900 mt-6 mb-4">EventEcos vs Perfect Venue</h1>
        <p className="text-lg text-gray-600 mb-10">
          Perfect Venue is a self-serve private-event management tool for single-location venue
          operators, publicly priced at $199–299 per month per location with a 14-day no-card
          trial. Here&apos;s how it compares to EventEcos.
        </p>

        <div className="overflow-x-auto mb-10">
          <table className="w-full text-left border border-gray-200 rounded-xl overflow-hidden text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 font-semibold text-gray-700">&nbsp;</th>
                <th className="p-4 font-semibold text-gray-700">EventEcos</th>
                <th className="p-4 font-semibold text-gray-700">Perfect Venue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="p-4 font-medium text-gray-900">Pricing</td>
                <td className="p-4 text-gray-600">$0 / $149 / $299 per month total, not per location</td>
                <td className="p-4 text-gray-600">$199–299 per month, per location</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-gray-900">Free trial</td>
                <td className="p-4 text-gray-600">30-day free trial, no credit card required</td>
                <td className="p-4 text-gray-600">14-day free trial, no credit card required</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-gray-900">Multi-venue support</td>
                <td className="p-4 text-gray-600">Up to 5 venues on Premium, unlimited on Enterprise, on one account</td>
                <td className="p-4 text-gray-600">Priced per location</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-gray-900">Venue/vendor marketplace</td>
                <td className="p-4 text-gray-600">Built-in — discover venues, vendors, and events</td>
                <td className="p-4 text-gray-600">Not offered publicly</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-gray-500 text-sm">
          Figures for Perfect Venue are drawn from its own public marketing pages at the time of
          writing and may have changed — confirm current details directly with Perfect Venue.
        </p>

        <Link
          href="https://eventecos.com/signup"
          className="inline-block mt-10 bg-accent-500 hover:bg-accent-600 text-white font-bold px-8 py-3 rounded-lg transition-colors"
        >
          Start free with EventEcos
        </Link>
      </div>
    </div>
  )
}
