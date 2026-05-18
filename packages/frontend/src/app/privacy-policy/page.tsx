'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-28">
            <div className="flex items-center">
              <Link href="/">
                <img src="/lib/EventEcos-Logo.jpg" alt="EventEcos Logo" style={{ height: '110px', width: 'auto' }} />
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 leading-relaxed mb-8">
            <strong>EventEcos</strong> respects your privacy and is committed to protecting the personal information you provide to us. This Privacy Policy explains what information we collect, how we use it, and how we protect it.
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">SMS Privacy Policy</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              EventEcos may collect phone numbers from users who provide consent to receive SMS messages related to events, bookings, account updates, or service notifications.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              <strong>Phone numbers collected for SMS consent will not be shared, sold, rented, or disclosed to third parties or affiliates for marketing purposes.</strong>
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              SMS consent is not shared with third parties.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Users may opt out of SMS communications at any time by replying <strong>STOP</strong> to any SMS message received from EventEcos.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We may collect information you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Name and contact information, such as email address and phone number</li>
              <li>Account credentials</li>
              <li>Event and booking information</li>
              <li>Payment information</li>
              <li>Communications you send to us</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices, updates, and support messages</li>
              <li>Respond to comments, questions, and requests</li>
              <li>Send SMS notifications about your events and bookings, with your consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We take reasonable measures to help protect your personal information from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:support@eventecos.com" className="text-primary-600 hover:underline">support@eventecos.com</a>.
            </p>
          </section>

          <p className="text-gray-500 text-sm mt-12">
            Last updated: May 2026
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center mb-6">
            <Link href="/">
              <div className="inline-block bg-white rounded-xl p-2">
                <img src="/lib/EventEcos-Logo.jpg" alt="EventEcos" style={{ height: '90px', width: 'auto' }} />
              </div>
            </Link>
          </div>
          <div className="flex justify-center space-x-6 mb-4">
            <Link href="/privacy-policy" className="text-gray-400 hover:text-gray-300 text-sm">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="text-gray-400 hover:text-gray-300 text-sm">
              Terms of Service
            </Link>
          </div>
          <p className="text-center text-base text-gray-400">
            &copy; 2026 EventEcos. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
