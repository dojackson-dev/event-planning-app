'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Mail, X } from 'lucide-react'
import type { Draft } from './assistantTypes'

/** The owner reviews and edits the message here; nothing is sent from EventEcos. */
export default function AssistantDraftModal({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const [to, setTo] = useState(draft.to)
  const [subject, setSubject] = useState(draft.subject)
  const [body, setBody] = useState(draft.body)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Draft follow-up">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Draft follow-up</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-3 text-xs text-gray-500">Review and edit before you send. Nothing is sent automatically.</p>

        <label className="block text-xs font-medium text-gray-600">To</label>
        <input value={to} onChange={e => setTo(e.target.value)} placeholder="Client email" className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <label className="block text-xs font-medium text-gray-600">Subject</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <label className="block text-xs font-medium text-gray-600">Message</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={10} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={copy} className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}
          </button>
          <a href={mailto} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Mail className="h-4 w-4" /> Open in email app
          </a>
        </div>
      </div>
    </div>
  )
}
