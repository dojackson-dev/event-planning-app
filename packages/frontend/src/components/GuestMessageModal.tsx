'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Loader2, MessageSquare, X } from 'lucide-react'

type Audience = 'attending' | 'pending' | 'declined' | 'all'

interface Preview {
  recipients: number
  sms: number
  email: number
  skipped: number
  maxRecipients: number
}

interface SendResult {
  recipients: number
  smsSent: number
  emailSent: number
  reached: number
  failed: number
  skipped: number
}

interface RsvpClient {
  get: (path: string) => Promise<{ data: any }>
  post: (path: string, data?: unknown) => Promise<{ data: any }>
}

interface Props {
  intakeFormId: string
  eventName: string
  counts: { attending: number; declined: number; pending: number; total: number }
  api: RsvpClient
  onClose: () => void
}

const MAX_LENGTH = 320

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** Write one message and send it by text and email to a group of RSVP guests. */
export default function GuestMessageModal({ intakeFormId, eventName, counts, api, onClose }: Props) {
  const [audience, setAudience] = useState<Audience>('attending')
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SendResult | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !sending) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, sending])

  const loadPreview = useCallback(async (group: Audience) => {
    setPreview(null)
    setPreviewError('')
    try {
      const res = await api.get(`/message/${intakeFormId}/audience?audience=${group}`)
      setPreview(res.data)
    } catch (err: any) {
      setPreviewError(err?.response?.data?.message || 'Could not check who this reaches.')
    }
  }, [api, intakeFormId])

  useEffect(() => { loadPreview(audience) }, [audience, loadPreview])

  const options: Array<{ value: Audience; label: string; count: number }> = [
    { value: 'attending', label: 'Guests who are attending', count: counts.attending },
    { value: 'pending', label: "Guests who haven't replied yet", count: counts.pending },
    { value: 'declined', label: 'Guests who declined', count: counts.declined },
    { value: 'all', label: 'Everyone on the list', count: counts.total },
  ]

  const canSend = !!preview && preview.recipients > 0 && message.trim().length > 0 && !sending

  const handleSend = async () => {
    if (!preview || !canSend) return
    if (!window.confirm(`Send this message to ${plural(preview.recipients, 'guest')}? It cannot be unsent.`)) return
    setSending(true)
    setError('')
    try {
      const res = await api.post(`/message/${intakeFormId}`, { audience, message })
      setResult(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'The message could not be sent. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="guest-message-title">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div>
            <h2 id="guest-message-title" className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <MessageSquare className="h-5 w-5 text-indigo-600" /> Message your guests
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">{eventName}</p>
          </div>
          <button type="button" onClick={onClose} disabled={sending} aria-label="Close" className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        {result ? (
          <div className="p-5">
            <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
              <div className="text-sm text-green-900">
                <p className="font-semibold">Message sent to {plural(result.reached, 'guest')}.</p>
                <p className="mt-1">
                  {plural(result.smsSent, 'text')} and {plural(result.emailSent, 'email')} went out.
                  {result.failed > 0 && ` ${plural(result.failed, 'guest')} could not be reached (for example, a number that opted out).`}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="mt-5 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Done</button>
          </div>
        ) : (
          <div className="space-y-5 p-5">
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-gray-700">Send to</legend>
              <div className="space-y-2">
                {options.map(o => (
                  <label key={o.value} className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-sm ${audience === o.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <span className="flex items-center gap-2">
                      <input type="radio" name="audience" value={o.value} checked={audience === o.value} onChange={() => setAudience(o.value)} disabled={sending} />
                      {o.label}
                    </span>
                    <span className="text-gray-400">{o.count}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 min-h-[1.25rem] text-xs text-gray-500" aria-live="polite">
                {previewError ? (
                  <span className="text-red-600">{previewError}</span>
                ) : !preview ? (
                  <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Checking who this reaches…</span>
                ) : preview.recipients === 0 ? (
                  'Nobody in this group can be messaged yet. Guests need an invitation or a reply, plus a phone number or email.'
                ) : (
                  <>
                    Reaches <strong>{plural(preview.recipients, 'guest')}</strong> ({plural(preview.sms, 'text')}, {plural(preview.email, 'email')}).
                    {preview.skipped > 0 && ` ${plural(preview.skipped, 'guest')} cannot be reached.`}
                    {preview.recipients > preview.maxRecipients && <span className="text-red-600"> That is over the {preview.maxRecipients}-guest limit; pick a smaller group.</span>}
                  </>
                )}
              </p>
            </fieldset>

            <div>
              <label htmlFor="guest-message" className="mb-1 block text-sm font-medium text-gray-700">Your message</label>
              <textarea
                id="guest-message"
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                rows={5}
                maxLength={MAX_LENGTH}
                disabled={sending}
                placeholder="For example: Doors open at 6 PM. Parking is free behind the building."
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-400">
                <span>Texts say who it is from and end with &quot;Reply STOP to unsubscribe.&quot;</span>
                <span>{message.length}/{MAX_LENGTH}</span>
              </div>
            </div>

            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={onClose} disabled={sending} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleSend} disabled={!canSend || (preview?.recipients ?? 0) > (preview?.maxRecipients ?? Infinity)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                {sending ? 'Sending…' : preview && preview.recipients > 0 ? `Send to ${plural(preview.recipients, 'guest')}` : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
