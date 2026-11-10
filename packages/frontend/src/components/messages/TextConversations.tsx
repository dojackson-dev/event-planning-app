'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import api from '@/lib/api'

interface ConversationSummary {
  phone: string
  name: string | null
  lastMessage: string
  lastMessageAt: string
  lastDirection: 'inbound' | 'outbound'
  unreadCount: number
}

interface ConversationMessage {
  id: string
  direction: 'inbound' | 'outbound'
  content: string
  status: string
  createdAt: string
  error: string | null
}

const POLL_MS = 8000

const formatShort = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

function Initials({ name }: { name: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
      {initials || '#'}
    </div>
  )
}

/** Text messages with each person as one conversation: what you sent and what they replied. */
export default function TextConversations({ onUnreadChange }: { onUnreadChange?: (count: number) => void }) {
  const [threads, setThreads] = useState<ConversationSummary[] | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<ConversationSummary | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadThreads = useCallback(async () => {
    try {
      const res = await api.get<ConversationSummary[]>('/messages/conversations')
      setThreads(res.data || [])
      setError('')
      onUnreadChange?.((res.data || []).reduce((sum, t) => sum + t.unreadCount, 0))
    } catch {
      setError('Could not load your text conversations. Please try again.')
    }
  }, [onUnreadChange])

  const loadMessages = useCallback(async (phone: string) => {
    const res = await api.get<ConversationMessage[]>('/messages/conversations/thread', { params: { phone } })
    setMessages(res.data || [])
  }, [])

  useEffect(() => {
    loadThreads()
    const timer = setInterval(loadThreads, POLL_MS * 2)
    return () => clearInterval(timer)
  }, [loadThreads])

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    setLoadingThread(true)
    setMessages([])
    loadMessages(selected.phone)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingThread(false)
      })
    api
      .patch('/messages/conversations/read', { phone: selected.phone })
      .then(() => loadThreads())
      .catch(() => undefined)
    const timer = setInterval(() => {
      loadMessages(selected.phone).catch(() => undefined)
    }, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.phone])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !draft.trim()) return
    setSending(true)
    setSendError('')
    try {
      await api.post('/messages/send', {
        recipientPhone: selected.phone,
        recipientName: selected.name || undefined,
        recipientType: 'client',
        messageType: 'custom',
        content: draft.trim(),
        skipOptInCheck: true,
      })
      setDraft('')
      await loadMessages(selected.phone)
      loadThreads()
    } catch (err: any) {
      setSendError(err?.response?.data?.message || 'Could not send that text.')
    } finally {
      setSending(false)
    }
  }

  if (error && !threads) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
        {error}{' '}
        <button type="button" onClick={loadThreads} className="underline">
          Try again
        </button>
      </div>
    )
  }
  if (!threads) return <p className="text-sm text-gray-500">Loading conversations…</p>

  return (
    <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" style={{ minHeight: '60vh' }}>
      {/* People */}
      <div className={`w-full flex-shrink-0 border-r border-gray-200 md:w-80 ${selected ? 'hidden md:block' : ''}`}>
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Text conversations</p>
        </div>
        {threads.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-500">
            No texts yet. When you text a client, and when they reply, the conversation shows up here.
          </p>
        ) : (
          <ul className="max-h-[70vh] divide-y divide-gray-100 overflow-y-auto">
            {threads.map((t) => (
              <li key={t.phone}>
                <button
                  type="button"
                  onClick={() => setSelected(t)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 ${
                    selected?.phone === t.phone ? 'bg-primary-50' : ''
                  }`}
                >
                  <Initials name={t.name || ''} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${t.unreadCount ? 'font-bold text-gray-900' : 'font-medium text-gray-900'}`}>
                        {t.name || t.phone}
                      </span>
                      {t.unreadCount > 0 && (
                        <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">{t.unreadCount}</span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      {t.lastDirection === 'outbound' ? 'You: ' : ''}
                      {t.lastMessage}
                    </span>
                    <span className="block text-xs text-gray-400">{formatShort(t.lastMessageAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Chat */}
      <div className={`min-w-0 flex-1 flex-col ${selected ? 'flex' : 'hidden md:flex'}`}>
        {!selected ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-gray-400">Choose a person to see your texts with them.</div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
              <button type="button" onClick={() => setSelected(null)} className="md:hidden" aria-label="Back to conversations">
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </button>
              <Initials name={selected.name || ''} />
              <div>
                <p className="text-sm font-semibold text-gray-900">{selected.name || selected.phone}</p>
                {selected.name && <p className="text-xs text-gray-500">{selected.phone}</p>}
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" style={{ maxHeight: '55vh' }}>
              {loadingThread && messages.length === 0 ? (
                <p className="text-center text-sm text-gray-400">Loading…</p>
              ) : (
                messages.map((m) => {
                  const mine = m.direction === 'outbound'
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          mine ? 'rounded-br-sm bg-primary-600 text-white' : 'rounded-bl-sm bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                        <p className={`mt-1 text-xs ${mine ? 'text-primary-200' : 'text-gray-400'}`}>
                          {formatShort(m.createdAt)}
                          {mine && m.status === 'failed' ? ' · Not delivered' : ''}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="border-t border-gray-100 p-3">
              {sendError && (
                <p className="mb-2 text-xs text-red-600" role="alert">
                  {sendError}
                </p>
              )}
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a text…"
                  maxLength={600}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  aria-label="Text message"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Send
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
