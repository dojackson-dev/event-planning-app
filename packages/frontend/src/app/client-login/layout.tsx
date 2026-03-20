import { ClientAuthProvider } from '@/contexts/ClientAuthContext'

// Wrap so the login page has access to ClientAuthContext (for redirect after auth)
export default function ClientLoginLayout({ children }: { children: React.ReactNode }) {
  return <ClientAuthProvider>{children}</ClientAuthProvider>
}

