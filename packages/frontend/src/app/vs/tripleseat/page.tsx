import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'EventEcos vs Tripleseat | Transparent Pricing Comparison',
  description:
    'How EventEcos compares to Tripleseat on pricing, marketplace discovery, and self-serve setup for venue booking and event management.',
}

export default function VsTripleseatPage() {
  return (
    <div className="min-h-screen bg-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-accent-600 hover:underline text-sm">&larr; Back to EventEcos</Link>

        <h1 className="text-4xl font-bold text-gray-900 mt-6 mb-4">EventEcos vs Tripleseat</h1>
        <p className="text-lg text-gray-600 mb-10">
          Tripleseat is a well-known hospitality venue management platform, publicly described as
          trusted by more than 20,000 hospitality venues worldwide. Here&apos;s how it compares to
          EventEcos on pricing transparency and marketplace discovery — the two areas buyers ask
          about most.
        </p>

        <div className="overflow-x-auto mb-10">
          <table className="w-full text-left border border-gray-200 rounded-xl overflow-hidden text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 font-semibold text-gray-700">&nbsp;</th>
                <th className="p-4 font-semibold text-gray-700">EventEcos</th>
                <th className="p-4 font-semibold text-gray-700">Tripleseat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="p-4 font-medium text-gray-900">Pricing</td>
                <td className="p-4 text-gray-600">Published online: $0 / $149 / $299 per month, plus a custom Enterprise tier</td>
                <td className="p-4 text-gray-600">Not published — contact-led quote process</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-gray-900">Free trial</td>
                <td className="p-4 text-gray-600">30-day free trial, no credit card required</td>
                <td className="p-4 text-gray-600">Not stated on public pages</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-gray-900">Venue/vendor marketplace</td>
                <td className="p-4 text-gray-600">Built-in — discover venues, vendors, and events</td>
                <td className="p-4 text-gray-600">Not offered publicly</td>
              </tr>
              <tr>
                <td className="p-4 font-medium text-gray-900">Platform fee</td>
                <td className="p-4 text-gray-600">1–3% on direct payments, depending on plan</td>
                <td className="p-4 text-gray-600">Not published</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-gray-500 text-sm">
          Figures for Tripleseat are drawn from its own public marketing pages at the time of
          writing and may have changed — confirm current details directly with Tripleseat.
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
