'use client'

import { useState, useEffect } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { MessageSquare, Trash2, Send, Bell, BellOff, ChevronDown, ChevronUp, Clock, RefreshCw } from 'lucide-react'
import api from '@/lib/api'

interface EventNote {
  id: string
  event_id: string
  author_id: string
  author_name: string
  author_role: string
  content: string
  created_at: string
  updated_at?: string
  reminder_enabled: boolean
  reminder_type?: 'days' | 'weeks' | 'date'
  reminder_value?: number
  reminder_date?: string
  reminder_send_at?: string
  reminder_message?: string
  reminder_phone?: string
  reminder_sent_at?: string
}

interface ReminderForm {
  enabled: boolean
  type: 'days' | 'weeks' | 'date'
  value: number
  date: string
  message: string
  phone: string
}

const defaultReminder = (): ReminderForm => ({
  enabled: false,
  type: 'days',
  value: 1,
  date: '',
  message: '',
  phone: '',
})

function ReminderBadge({ note }: { note: EventNote }) {
  if (!note.reminder_enabled) return null
  if (note.reminder_sent_at) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        <Bell className="h-3 w-3" /> Sent {format(new Date(note.reminder_sent_at), 'MMM d')}
      </span>
    )
  }
  if (note.reminder_send_at) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
        <Clock className="h-3 w-3" /> Scheduled {format(new Date(note.reminder_send_at), 'MMM d, h:mm a')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
      <Bell className="h-3 w-3" /> Reminder set
    </span>
  )
}

export default function EventNotes({ eventId, eventDate }: { eventId: string; eventDate?: string }) {
  const [notes, setNotes] = useState<EventNote[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [reminder, setReminder] = useState<ReminderForm>(defaultReminder())
  const [showReminderForm, setShowReminderForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedReminder, setExpandedReminder] = useState<string | null>(null)
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)
  const [editingReminder, setEditingReminder] = useState<string | null>(null)
  const [editReminderForm, setEditReminderForm] = useState<ReminderForm>(defaultReminder())
  const [ownerPhone, setOwnerPhone] = useState<string>('')

  useEffect(() => { fetchNotes() }, [eventId])

  useEffect(() => {
    api.get('/owner/profile').then(res => {
      const phone = res.data?.phoneNumber || ''
      setOwnerPhone(phone)
      setReminder(r => ({ ...r, phone }))
    }).catch(() => {})
  }, [])

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const response = await api.get<EventNote[]>(`/event-notes/event/${eventId}`)
      setNotes(response.data)
      setError(null)
    } catch (err: any) {
      setError('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  const buildReminderPayload = (r: ReminderForm) => ({
    reminder_enabled: r.enabled,
    reminder_type: r.enabled ? r.type : undefined,
    reminder_value: r.enabled && (r.type === 'days' || r.type === 'weeks') ? r.value : undefined,
    // Convert the datetime-local value (naive wall-clock string) to a proper
    // UTC ISO string using the browser's own timezone, so the backend never
    // has to guess an offset (it previously used the server's UTC timezone,
    // shifting the saved time by several hours).
    reminder_date: r.enabled && r.type === 'date' && r.date ? new Date(r.date).toISOString() : undefined,
    reminder_message: r.enabled && r.message ? r.message : undefined,
    reminder_phone: r.enabled && r.phone ? r.phone : undefined,
    event_date: eventDate,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    try {
      setSubmitting(true)
      const payload = { content, ...buildReminderPayload(reminder) }
      const response = await api.post<EventNote>(`/event-notes/event/${eventId}`, payload)
      setNotes((prev) => [response.data, ...prev])
      setContent('')
      setReminder(defaultReminder())
      setShowReminderForm(false)
    } catch (err: any) {
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
      alert(err?.response?.data?.message || 'Failed to delete note')
    }
  }

  const handleSendReminder = async (noteId: string) => {
    setSendingReminder(noteId)
    try {
      const res = await api.post<{ sent: boolean; message?: string }>(`/event-notes/${noteId}/send-reminder`)
      if (res.data.sent) {
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, reminder_sent_at: new Date().toISOString() } : n))
        alert('SMS reminder sent!')
      } else {
        alert(res.data.message || 'Could not send reminder')
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to send reminder')
    } finally {
      setSendingReminder(null)
    }
  }

  const startEditReminder = (note: EventNote) => {
    setEditingReminder(note.id)
    setEditReminderForm({
      enabled: note.reminder_enabled,
      type: note.reminder_type || 'days',
      value: note.reminder_value || 1,
      // Convert the stored UTC ISO timestamp back to the browser's local
      // wall-clock time for the datetime-local input (inverse of the ISO
      // conversion done in buildReminderPayload).
      date: note.reminder_date ? format(new Date(note.reminder_date), "yyyy-MM-dd'T'HH:mm") : '',
      message: note.reminder_message || '',
      phone: note.reminder_phone || ownerPhone,
    })
  }

  const handleSaveReminderEdit = async (noteId: string) => {
    try {
      const payload = buildReminderPayload(editReminderForm)
      const res = await api.patch<EventNote>(`/event-notes/${noteId}`, payload)
      setNotes(prev => prev.map(n => n.id === noteId ? res.data : n))
      setEditingReminder(null)
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update reminder')
    }
  }

  const reminderSummary = (r: ReminderForm | EventNote) => {
    const isForm = 'enabled' in r
    const type = isForm ? (r as ReminderForm).type : (r as EventNote).reminder_type
    const value = isForm ? (r as ReminderForm).value : (r as EventNote).reminder_value
    const date = isForm ? (r as ReminderForm).date : (r as EventNote).reminder_date
    if (type === 'date' && date) return `on ${format(new Date(date), 'MMM d, yyyy h:mm a')}`
    if ((type === 'days' || type === 'weeks') && value) return `${value} ${type} before event`
    return ''
  }

  return (
    <div className="mt-8 pt-8 border-t">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
        <MessageSquare className="h-5 w-5 mr-2 text-primary-600" />
        Notes
      </h2>

      {/* Add Note Form */}
      <form onSubmit={handleSubmit} className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note about this event..."
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none bg-white"
          disabled={submitting}
        />

        {/* Reminder toggle */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => { setShowReminderForm(v => !v); setReminder(r => ({ ...r, enabled: !showReminderForm })) }}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${showReminderForm ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {showReminderForm ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            {showReminderForm ? 'Reminder on' : 'Add reminder'}
          </button>
        </div>

        {showReminderForm && (
          <div className="mt-3 space-y-3 border-t pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SMS Reminder Settings</p>

            {/* Type selector */}
            <div className="flex gap-2 flex-wrap">
              {(['days', 'weeks', 'date'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setReminder(r => ({ ...r, type: t }))}
                  className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${reminder.type === t ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`}
                >
                  {t === 'days' ? 'Days before' : t === 'weeks' ? 'Weeks before' : 'Specific date'}
                </button>
              ))}
            </div>

            {(reminder.type === 'days' || reminder.type === 'weeks') && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={reminder.value}
                  onChange={e => setReminder(r => ({ ...r, value: parseInt(e.target.value) || 1 }))}
                  className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">{reminder.type} before the event</span>
              </div>
            )}

            {reminder.type === 'date' && (
              <input
                type="datetime-local"
                value={reminder.date}
                onChange={e => setReminder(r => ({ ...r, date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone number to receive SMS</label>
              <input
                type="tel"
                placeholder="+1 555 000 0000"
                value={reminder.phone}
                onChange={e => setReminder(r => ({ ...r, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reminder message <span className="text-gray-400">(leave blank to use note content)</span></label>
              <textarea
                rows={2}
                placeholder="Custom SMS message..."
                value={reminder.message}
                onChange={e => setReminder(r => ({ ...r, message: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
          </div>
        )}

        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
          >
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Adding...' : 'Add Note'}
          </button>
        </div>
      </form>

      {/* Notes List */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading notes...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-500">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap break-words flex-1">{note.content}</p>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-gray-300 hover:text-red-500 flex-shrink-0 mt-0.5"
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Meta: author + timestamps */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-xs text-gray-500">
                    {note.author_name || 'Unknown'}{note.author_role ? ` · ${note.author_role}` : ''}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                  {note.updated_at && note.updated_at !== note.created_at && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      Updated {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                    </span>
                  )}
                  <ReminderBadge note={note} />
                </div>

                {/* Reminder section toggle */}
                <button
                  type="button"
                  onClick={() => setExpandedReminder(expandedReminder === note.id ? null : note.id)}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 transition-colors"
                >
                  <Bell className="h-3.5 w-3.5" />
                  {note.reminder_enabled ? 'Edit reminder' : 'Add reminder'}
                  {expandedReminder === note.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>

              {/* Expanded reminder panel */}
              {expandedReminder === note.id && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  {editingReminder === note.id ? (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SMS Reminder</p>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editReminderForm.enabled}
                          onChange={e => setEditReminderForm(r => ({ ...r, enabled: e.target.checked }))}
                          className="rounded"
                        />
                        Enable SMS reminder
                      </label>

                      {editReminderForm.enabled && (
                        <>
                          <div className="flex gap-2 flex-wrap">
                            {(['days', 'weeks', 'date'] as const).map(t => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setEditReminderForm(r => ({ ...r, type: t }))}
                                className={`px-3 py-1 text-xs rounded-full border font-medium ${editReminderForm.type === t ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`}
                              >
                                {t === 'days' ? 'Days before' : t === 'weeks' ? 'Weeks before' : 'Specific date'}
                              </button>
                            ))}
                          </div>

                          {(editReminderForm.type === 'days' || editReminderForm.type === 'weeks') && (
                            <div className="flex items-center gap-2">
                              <input
                                type="number" min={1} max={365}
                                value={editReminderForm.value}
                                onChange={e => setEditReminderForm(r => ({ ...r, value: parseInt(e.target.value) || 1 }))}
                                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                              <span className="text-sm text-gray-600">{editReminderForm.type} before event</span>
                            </div>
                          )}

                          {editReminderForm.type === 'date' && (
                            <input
                              type="datetime-local"
                              value={editReminderForm.date}
                              onChange={e => setEditReminderForm(r => ({ ...r, date: e.target.value }))}
                              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                            />
                          )}

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Phone number</label>
                            <input
                              type="tel" placeholder="+1 555 000 0000"
                              value={editReminderForm.phone}
                              onChange={e => setEditReminderForm(r => ({ ...r, phone: e.target.value }))}
                              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Message <span className="text-gray-400">(blank = note content)</span></label>
                            <textarea
                              rows={2} placeholder="Custom SMS..."
                              value={editReminderForm.message}
                              onChange={e => setEditReminderForm(r => ({ ...r, message: e.target.value }))}
                              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm resize-none"
                            />
                          </div>
                        </>
                      )}

                      <div className="flex gap-2">
                        <button onClick={() => handleSaveReminderEdit(note.id)} className="px-3 py-1.5 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700">Save</button>
                        <button onClick={() => setEditingReminder(null)} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {note.reminder_enabled ? (
                        <>
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Send:</span> {reminderSummary(note)}
                          </p>
                          {note.reminder_phone && <p className="text-xs text-gray-600"><span className="font-medium">To:</span> {note.reminder_phone}</p>}
                          {note.reminder_message && <p className="text-xs text-gray-600"><span className="font-medium">Message:</span> {note.reminder_message}</p>}
                          {note.reminder_send_at && !note.reminder_sent_at && (
                            <p className="text-xs text-gray-400">Scheduled: {format(new Date(note.reminder_send_at), 'MMM d, yyyy h:mm a')}</p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => startEditReminder(note)} className="text-xs text-primary-600 hover:underline">Edit</button>
                            {!note.reminder_sent_at && (
                              <button
                                onClick={() => handleSendReminder(note.id)}
                                disabled={sendingReminder === note.id}
                                className="text-xs text-purple-600 hover:underline disabled:opacity-50"
                              >
                                {sendingReminder === note.id ? 'Sending...' : 'Send now'}
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <div>
                          <p className="text-xs text-gray-400 mb-2">No reminder set.</p>
                          <button onClick={() => startEditReminder(note)} className="text-xs text-primary-600 hover:underline">Set reminder</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
