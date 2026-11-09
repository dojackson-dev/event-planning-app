'use client'

import CallsPanel from '@/components/calls/CallsPanel'
import CallsAdminPanel from '@/components/calls/CallsAdminPanel'
import { adminTokenGetter } from '@/lib/calls'

export default function AdminCallsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Calls</h1>
        <p className="mt-1 text-sm text-gray-600">
          Place and receive client calls through the shared EventEcos number. Calls are not recorded; voicemails are.
        </p>
      </header>
      <CallsPanel getToken={adminTokenGetter} />
      <CallsAdminPanel getToken={adminTokenGetter} />
    </div>
  )
}
