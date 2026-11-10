'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import api from '@/lib/api'
import { errorMessage, fmtWhen } from './types'

interface SentEmail {
  id: string
  recipient_type: 'lead' | 'user' | 'email' | 'test'
  to_email: string
  to_name: string | null
  subject: string
  status: 'sent' | 'failed'
  error: string | null
  created_at: string
  sender_name: string | null
}

const TYPE_LABEL: Record<SentEmail['recipient_type'], string> = { lead: 'Lead', user: 'User', email: 'Address', test: 'Test' }

export default function OutreachHistory({ isManager }: { isManager: boolean }) {
  const [emails, setEmails] = useState<SentEmail[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const res = await api.get<{ emails: SentEmail[] }>('/affiliates/outreach/history')
      setEmails(res.data.emails)
    } catch (err) {
      setError(errorMessage(err, 'Could not load sent emails.'))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return (
      <div className="py-12 text-center">
        <p role="alert" className="mb-3 text-sm text-gray-600">{error}</p>
        <button onClick={load} className="text-sm font-medium text-indigo-600 underline">Try again</button>
      </div>
    )
  }
  if (!emails) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" aria-label="Loading sent emails" /></div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-600">{isManager ? 'The last 100 emails sent by anyone on the team.' : 'The last 100 emails you sent.'} Select leads on the Leads page, or users on All Users, to send more.</p>
        <button onClick={load} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </div>
      {emails.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-500">No emails sent yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {emails.map(email => (
            <li key={email.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{email.subject}</p>
                <p className="truncate text-xs text-gray-500">To {email.to_name ? `${email.to_name} <${email.to_email}>` : email.to_email}{isManager && email.sender_name ? ` · from ${email.sender_name}` : ''}</p>
                {email.error && <p className="text-xs text-red-600">{email.error}</p>}
              </div>
              <div className="text-right">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${email.status === 'sent' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{email.status === 'sent' ? 'Sent' : 'Failed'}</span>
                <p className="mt-1 text-xs text-gray-400">{TYPE_LABEL[email.recipient_type]} · {fmtWhen(email.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
