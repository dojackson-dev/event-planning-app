import type { Metadata, Viewport } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import DemoModeBanner from '@/components/DemoModeBanner'
import HeyCatchInit from '@/components/HeyCatchInit'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const SITE_URL = 'https://eventecos.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Venue Booking & Event Management Software | EventEcos',
  description:
    'EventEcos is the venue booking and event management platform for venue owners, event planners, and promoters. Streamline bookings, payments, and ticket sales — start free, 30-day trial, no credit card required.',
  icons: {
    icon: '/lib/EventEcos-Logo-Only.jpg',
  },
  openGraph: {
    title: 'Venue Booking & Event Management Software | EventEcos',
    description:
      'The venue booking and event management platform for venue owners, event planners, and promoters. Start free — 30-day trial, no credit card required.',
    url: SITE_URL,
    siteName: 'EventEcos',
    images: [{ url: '/lib/EventEcos-Web-Banner.jpg', width: 1200, height: 630, alt: 'EventEcos' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Venue Booking & Event Management Software | EventEcos',
    description:
      'The venue booking and event management platform for venue owners, event planners, and promoters. Start free — 30-day trial, no credit card required.',
    images: ['/lib/EventEcos-Web-Banner.jpg'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // @ts-ignore - mobileWebAppCapable is not in the types yet but is valid
  mobileWebAppCapable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'EventEcos',
        url: SITE_URL,
        logo: `${SITE_URL}/lib/EventEcos-Logo.jpg`,
        sameAs: [
          'https://www.facebook.com/people/EventEcos/61580708045237/',
          'https://www.linkedin.com/company/eventecos/',
        ],
      },
      {
        '@type': 'SoftwareApplication',
        name: 'EventEcos',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description:
          'Venue booking and event management platform for venue owners, event planners, and promoters.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: '30-day free trial, no credit card required',
        },
      },
    ],
  }

  return (
    <html lang="en">
      <body className={`${poppins.className} overflow-x-hidden`} suppressHydrationWarning>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <HeyCatchInit />
        <AuthProvider>
          <DemoModeBanner />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
