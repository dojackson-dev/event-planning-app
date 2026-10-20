'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, Send } from 'lucide-react'
import api from '@/lib/api'
import { errorMessage, type AskAnswer, type AssistantRole } from './assistantTypes'

export default function AssistantAsk({ suggestions, role }: { suggestions: string[]; role: AssistantRole }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<AskAnswer | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const ask = async (text: string) => {
    const q = text.trim()
    if (!q || loading) return
    setQuestion(q)
    setLoading(true)
    setError('')
    try {
      const res = await api.post<AskAnswer>('/assistant/ask', { question: q, role })
      setAnswer(res.data)
    } catch (e) {
      setAnswer(null)
      setError(errorMessage(e, 'Something went wrong. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Ask your assistant</h3>
      <form onSubmit={e => { e.preventDefault(); ask(question) }} className="flex gap-2">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          maxLength={200}
          placeholder="Ask about events, balances, estimates or contracts…"
          aria-label="Ask your assistant"
          className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Ask
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            disabled={loading}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {answer && (
        <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3" aria-live="polite">
          <p className="text-sm text-gray-900">{answer.answer}</p>
          {answer.items.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {answer.items.map(item => (
                <li key={`${item.href}-${item.detail}`} className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="block font-medium text-gray-900">{item.label}</span>
                    <span className="block text-xs text-gray-600">{item.detail}</span>
                  </span>
                  <Link href={item.href} className="flex flex-shrink-0 items-center text-indigo-600 hover:text-indigo-800">
                    Open <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
