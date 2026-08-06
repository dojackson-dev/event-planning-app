'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Trash2, Send } from 'lucide-react'
import api from '@/lib/api'

interface EventNote {
  id: string
  event_id: string
  author_id: string
  author_name: string
  author_role: string
  content: string
  created_at: string
}

export default function EventNotes({ eventId }: { eventId: string }) {
  const [notes, setNotes] = useState<EventNote[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchNotes()
  }, [eventId])

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const response = await api.get<EventNote[]>(`/event-notes/event/${eventId}`)
      setNotes(response.data)
      setError(null)
    } catch (err: any) {
      console.error('Failed to fetch event notes:', err)
      setError('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    try {
      setSubmitting(true)
      const response = await api.post<EventNote>(`/event-notes/event/${eventId}`, { content })
      setNotes((prev) => [response.data, ...prev])
      setContent('')
    } catch (err: any) {
      console.error('Failed to add note:', err)
      alert(err?.response?.data?.message || 'Failed to add note')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (noteId: string) => {
    if (!window.confirm('Delete this note?')) return
    try {
      await api.delete(`/event-notes/${noteId}`)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } catch (err: any) {
      console.error('Failed to delete note:', err)
      alert(err?.response?.data?.message || 'Failed to delete note')
    }
  }

  return (
    <div className="mt-8 pt-8 border-t">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <MessageSquare className="h-6 w-6 mr-2 text-primary-600" />
        Notes
      </h2>

      <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note about this event..."
          className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
        >
          <Send className="h-4 w-4 mr-2" />
          {submitting ? 'Adding...' : 'Add'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Loading notes...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-500">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="bg-gray-50 rounded-lg p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{note.content}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {note.author_name || 'Unknown'}
                  {note.author_role ? ` · ${note.author_role}` : ''}
                  {' · '}
                  {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                </p>
              </div>
              <button
                onClick={() => handleDelete(note.id)}
                className="text-gray-400 hover:text-red-600 flex-shrink-0"
                aria-label="Delete note"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
