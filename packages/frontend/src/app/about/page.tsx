import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About | EventEcos',
  description: 'Built by a family that loves events. Designed for the people who make them happen.',
}

// Family photo lives at /public/lib/nixon-family.jpg — save the provided
// photo there (same folder as the other brand assets).
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-accent-600 hover:underline text-sm">&larr; Back to EventEcos</Link>

        <div className="mt-8 flex flex-col items-center text-center">
          <Image
            src="/lib/nixon-family.jpg"
            alt="The Nixon family — Larry, Dee, Jaden, and Makaila Nixon"
            width={320}
            height={320}
            className="rounded-2xl object-cover mb-6 w-full max-w-xs h-auto"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Larry &amp; Dee Nixon</h1>
          <p className="text-gray-500 mb-8">Founders, EventEcos — a product of DoVenue Suites</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-600">
          <h2 className="text-2xl font-bold text-gray-900">Built From a Passion for Bringing People Together</h2>

          <p>Long before there was EventEcos, there was a family that simply loved creating memorable experiences.</p>

          <p>For more than 30 years, Larry and Dee Nixon have been involved in planning, hosting, coordinating, and supporting events in many different forms. From intimate local gatherings and creative fundraisers to regional events and national conferences, their experience has always centered around one simple idea: people remember how an event made them feel.</p>

          <p>Over the years, Dee and Larry have experienced events from nearly every perspective — organizers, hosts, coordinators, venue operators, community supporters, and guests. They have seen the excitement behind a great event, but they have also experienced firsthand the countless details, conversations, vendors, schedules, payments, guest lists, and last-minute changes required to make that experience feel effortless.</p>

          <p>That experience became part of the inspiration for EventEcos.</p>

          <p>And for the Nixon family, entertaining has become a family tradition.</p>

          <p>Their children, Jaden and Makaila, grew up watching their parents bring people together and have developed that same passion for hospitality, entertainment, and creating moments people enjoy. What began with Larry and Dee has evolved into a family appreciation for experiences that create connection, celebration, and lasting memories.</p>

          <h2 className="text-2xl font-bold text-gray-900">Where Experience Meets Technology</h2>

          <p>EventEcos was created from the belief that the technology behind an event should make bringing people together easier — not more complicated.</p>

          <p>We understand that an event is rarely just an event.</p>

          <ul className="space-y-2 list-none pl-0">
            <li>It is a bride imagining her wedding day.</li>
            <li>A promoter building an unforgettable night.</li>
            <li>An artist connecting with an audience.</li>
            <li>A business bringing hundreds of people together for a conference.</li>
            <li>A venue owner trying to deliver exceptional service.</li>
            <li>A family celebrating a milestone they may only experience once.</li>
          </ul>

          <p>Behind every one of those moments is an entire ecosystem of people working together — venues, planners, vendors, artists, promoters, staff, and guests.</p>

          <p>EventEcos exists to connect that ecosystem.</p>

          <p>Our mission is to give the people who create experiences better tools to communicate, organize, collaborate, book, manage, and grow — while never losing sight of the reason events exist in the first place: to bring people together and help them enjoy life.</p>

          <p className="font-bold text-gray-900">EventEcos<br />Built by a family that loves events. Designed for the people who make them happen.</p>
        </div>
      </div>
    </div>
  )
}
