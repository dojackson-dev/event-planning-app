'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2, Mail, Send, X } from 'lucide-react'
import api from '@/lib/api'
import { errorMessage } from './types'

export interface OutreachTarget {
  type: 'lead' | 'user'
  id: string
  name: string
  business: string | null
  email: string | null
}

interface Config {
  templates: Array<{ id: 'intro_demo' | 'custom'; label: string; subject: string }>
  sender_name: string
  reply_to: string
  daily_limit: number
  sent_today: number
  remaining_today: number
  max_recipients: number
  email_configured: boolean
  postal_address_configured: boolean
}

interface SendResult {
  sent: number
  failed: number
  skipped: Array<{ name: string; reason: string }>
  errors: string[]
}

interface Props {
  targets: OutreachTarget[]
  onClose: () => void
  onDone: (message: string) => void
}

const SKIP_LABEL: Record<string, string> = {
  no_email: 'no email address',
  invalid_email: 'not a valid email address',
  not_yours: 'claimed by another agent',
  not_found: 'could not be found',
  unsubscribed: 'unsubscribed',
  recently_emailed: 'emailed in the last 14 days',
  duplicate: 'listed twice',
}

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

/** One address per line or comma separated. "Name <email>" sets the greeting name. */
function parseTypedAddresses(text: string): Array<{ type: 'email'; email: string; name: string }> {
  return text
    .split(/[\n,;]+/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const match = /^(.*?)<([^>]+)>$/.exec(part)
      return match ? { type: 'email' as const, email: match[2].trim(), name: match[1].trim().replace(/^"|"$/g, '') } : { type: 'email' as const, email: part, name: '' }
    })
}

export default function OutreachModal({ targets, onClose, onDone }: Props) {
  const [config, setConfig] = useState<Config | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [template, setTemplate] = useState<'intro_demo' | 'custom'>('intro_demo')
  const [subject, setSubject] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [typed, setTyped] = useState('')
  const [allowRepeat, setAllowRepeat] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'test' | 'send' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SendResult | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  useEffect(() => {
    api
      .get<Config>('/affiliates/outreach/config')
      .then(res => setConfig(res.data))
      .catch(err => setConfigError(errorMessage(err, 'Could not load email settings.')))
  }, [])

  const typedAddresses = useMemo(() => parseTypedAddresses(typed), [typed])
  const withEmail = targets.filter(t => t.email)
  const withoutEmail = targets.length - withEmail.length
  const total = targets.length + typedAddresses.length
  const sample = targets[0] ?? (typedAddresses[0] ? { name: typedAddresses[0].name, business: null } : null)

  const payload = () => ({
    template,
    subject,
    note: template === 'intro_demo' ? note : undefined,
    message: template === 'custom' ? message : undefined,
    cta_label: template === 'custom' ? ctaLabel : undefined,
    cta_url: template === 'custom' ? ctaUrl || undefined : undefined,
  })

  // Keep the preview in step with the form so branding and personalisation can be checked before sending.
  useEffect(() => {
    if (template === 'custom' && !message.trim()) {
      setPreview(null)
      setPreviewError(null)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.post<{ html: string }>('/affiliates/outreach/preview', {
          ...payload(),
          sample: sample ? { name: sample.name, business: sample.business } : undefined,
        })
        setPreview(res.data.html)
        setPreviewError(null)
      } catch (err) {
        setPreview(null)
        setPreviewError(errorMessage(err, 'Could not build the preview.'))
      }
    }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, subject, note, message, ctaLabel, ctaUrl, sample?.name, sample?.business])

  const sendTest = async () => {
    setBusy('test')
    setError(null)
    setNotice(null)
    try {
      const res = await api.post<{ sent_to: string }>('/affiliates/outreach/test', payload())
      setNotice(`A test email is on its way to ${res.data.sent_to}.`)
    } catch (err) {
      setError(errorMessage(err, 'Could not send the test email.'))
    } finally {
      setBusy(null)
    }
  }

  const send = async () => {
    if (!confirm(`Send this email to ${total} recipient${total === 1 ? '' : 's'}? This cannot be undone.`)) return
    setBusy('send')
    setError(null)
    setNotice(null)
    try {
      const res = await api.post<SendResult>('/affiliates/outreach/send', {
        ...payload(),
        allow_repeat: allowRepeat,
        recipients: [...targets.map(t => ({ type: t.type, id: t.id })), ...typedAddresses],
      })
      setResult(res.data)
    } catch (err) {
      setError(errorMessage(err, 'Could not send. Nothing was sent.'))
    } finally {
      setBusy(null)
    }
  }

  const canSend =
    !!config?.email_configured && total > 0 && total <= config.max_recipients && (template === 'intro_demo' ? true : !!message.trim() && !!subject.trim()) && busy === null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onMouseDown={e => e.target === e.currentTarget && !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="outreach-title" className="my-8 w-full max-w-5xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 id="outreach-title" className="flex items-center gap-2 text-lg font-semibold text-gray-900"><Mail className="h-5 w-5 text-indigo-600" aria-hidden="true" /> Send email</h2>
          <button type="button" onClick={onClose} disabled={busy !== null} aria-label="Close" className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        {result ? (
          <div className="space-y-4 px-5 py-6" aria-live="polite">
            <p className="text-base font-semibold text-gray-900">
              {result.sent} email{result.sent === 1 ? '' : 's'} sent{result.failed > 0 && `, ${result.failed} failed`}.
            </p>
            {result.errors.length > 0 && <p role="alert" className="text-sm text-red-600">{result.errors.join(' ')}</p>}
            {result.skipped.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700">Skipped</p>
                <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto text-sm text-gray-600">
                  {result.skipped.map((s, i) => <li key={i}>{s.name}: {SKIP_LABEL[s.reason] ?? s.reason}</li>)}
                </ul>
              </div>
            )}
            <button type="button" onClick={() => onDone(`${result.sent} email${result.sent === 1 ? '' : 's'} sent.`)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Done</button>
          </div>
        ) : (
          <div className="grid gap-6 px-5 py-4 lg:grid-cols-2">
            <div className="space-y-4">
              {configError && <p role="alert" className="text-sm text-red-600">{configError}</p>}
              {config && !config.email_configured && (
                <p role="alert" className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> Email sending is not set up on the server yet, so you can preview but not send.</p>
              )}
              {config && config.email_configured && !config.postal_address_configured && (
                <p className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> No business mailing address is set, so emails go out without one in the footer. Marketing email in the US should include it. Ask an admin to set OUTREACH_POSTAL_ADDRESS.</p>
              )}

              <div>
                <p className="text-xs font-medium text-gray-600">To</p>
                <p className="mt-1 text-sm text-gray-800">
                  {targets.length > 0 ? `${targets.length} selected` : 'No one selected'}
                  {typedAddresses.length > 0 && `${targets.length > 0 ? ' + ' : ''}${typedAddresses.length} typed`}
                  {withoutEmail > 0 && <span className="text-amber-700"> ({withoutEmail} without an email will be skipped)</span>}
                </p>
                {targets.length > 0 && (
                  <p className="mt-1 max-h-16 overflow-y-auto text-xs text-gray-500">{targets.map(t => t.business || t.name).join(', ')}</p>
                )}
              </div>

              <div>
                <label htmlFor="ob-typed" className="mb-1 block text-xs font-medium text-gray-600">Other email addresses (optional)</label>
                <textarea id="ob-typed" rows={2} value={typed} onChange={e => setTyped(e.target.value)} className={`${inputClass} resize-none`} placeholder={'one per line, or Pat Lee <pat@example.com>'} />
              </div>

              <div>
                <label htmlFor="ob-template" className="mb-1 block text-xs font-medium text-gray-600">Template</label>
                <select id="ob-template" value={template} onChange={e => setTemplate(e.target.value as 'intro_demo' | 'custom')} className={inputClass}>
                  {(config?.templates ?? [{ id: 'intro_demo', label: 'Intro and live demo', subject: '' }, { id: 'custom', label: 'Personal message', subject: '' }]).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="ob-subject" className="mb-1 block text-xs font-medium text-gray-600">Subject</label>
                <input id="ob-subject" maxLength={150} value={subject} onChange={e => setSubject(e.target.value)} className={inputClass} placeholder={template === 'intro_demo' ? 'See EventEcos in action' : 'A quick idea for {{business}}'} />
              </div>

              {template === 'intro_demo' ? (
                <div>
                  <label htmlFor="ob-note" className="mb-1 block text-xs font-medium text-gray-600">Personal note (optional)</label>
                  <textarea id="ob-note" rows={4} maxLength={1500} value={note} onChange={e => setNote(e.target.value)} className={`${inputClass} resize-none`} placeholder="Saw {{business}} at the expo and thought of you..." />
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="ob-message" className="mb-1 block text-xs font-medium text-gray-600">Message</label>
                    <textarea id="ob-message" rows={8} maxLength={5000} value={message} onChange={e => setMessage(e.target.value)} className={`${inputClass} resize-none`} placeholder={'Hi {{firstName}},\n\nI help event businesses like {{business}} ...'} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="ob-cta-label" className="mb-1 block text-xs font-medium text-gray-600">Button text (optional)</label>
                      <input id="ob-cta-label" maxLength={40} value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} className={inputClass} placeholder="Book a call" />
                    </div>
                    <div>
                      <label htmlFor="ob-cta-url" className="mb-1 block text-xs font-medium text-gray-600">Button link</label>
                      <input id="ob-cta-url" type="url" maxLength={500} value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} className={inputClass} placeholder="https://" />
                    </div>
                  </div>
                </>
              )}
              <p className="text-xs text-gray-500">Use {'{{firstName}}'}, {'{{name}}'}, {'{{business}}'} and {'{{senderName}}'} to personalise each email. Every email includes your name, the EventEcos branding and an unsubscribe link. Replies come to {config?.reply_to ?? 'you'}.</p>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={allowRepeat} onChange={e => setAllowRepeat(e.target.checked)} /> Send even if they were emailed in the last 14 days
              </label>

              {config && <p className="text-xs text-gray-500">{config.remaining_today} of {config.daily_limit} emails left today.</p>}
              <p aria-live="polite" className="min-h-[1.25rem] text-sm text-indigo-700">{notice}</p>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

              <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                <button type="button" onClick={sendTest} disabled={!config?.email_configured || busy !== null || (template === 'custom' && !message.trim())} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                  {busy === 'test' && <Loader2 className="h-4 w-4 animate-spin" />} Send test to me
                </button>
                <button type="button" onClick={send} disabled={!canSend} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                  {busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" aria-hidden="true" />} Send to {total}
                </button>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-gray-600">Preview{sample?.name ? ` for ${sample.name}` : ''}</p>
              {previewError ? (
                <p role="alert" className="text-sm text-red-600">{previewError}</p>
              ) : preview ? (
                <iframe title="Email preview" sandbox="" srcDoc={preview} className="h-[560px] w-full rounded-lg border border-gray-200 bg-gray-100" />
              ) : (
                <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">Write your message to see the preview.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
