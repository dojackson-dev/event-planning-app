import type { Metadata } from 'next'
import { AffiliateAuthProvider } from '@/contexts/AffiliateAuthContext'

export const metadata: Metadata = {
  title: 'Sales Portal — EventEcos',
  description: 'Affiliate sales portal for EventEcos',
}

export default function SalesPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AffiliateAuthProvider>
      {children}
    </AffiliateAuthProvider>
  )
}
