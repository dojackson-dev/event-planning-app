'use client'

// Temporarily disabled authentication for development
// TODO: Re-enable authentication once backend is ready

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Authentication bypassed for now - allow all access
  return <>{children}</>
}
