import type { Metadata } from 'next'
import { AffiliateAuthProvider } from '@/contexts/AffiliateAuthContext'

export const metadata: Metadata = {
  title: 'Sales Portal — Eventecos',
  description: 'Affiliate sales portal for Eventecos',
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
