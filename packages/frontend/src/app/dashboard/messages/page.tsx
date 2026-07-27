'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Message, Event } from '@/types'
import { Plus, Search, MessageSquare, CheckCircle, XCircle, Clock, Filter, X, Send, Users, Calendar, ChevronRight } from 'lucide-react'

// ── Client Chat Types ──────────────────────────────────────────────────────

interface ClientThread {
  eventId: string
  eventName: string
  eventDate: string | null
  clientId: string
  clientName: string
  clientEmail: string
  lastMessage: string | null
  lastMessageAt: string | null
  lastMessageSender: string | null
  unreadCount: number
}

interface ClientMessage {
  id: string
  event_id: string
  owner_id: string
  client_id: string
  sender_type: 'owner' | 'client'
  content: string
  is_read: boolean
  created_at: string
}

function ClientInitials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  return (
    <div className="h-9 w-9 rounded-full bg-gray-200 text-gray-600 font-semibold text-sm flex items-center justify-center flex-shrink-0">
      {initials || '?'}
    </div>
  )
}

function OwnerInitials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  return (
    <div className="h-9 w-9 rounded-full bg-primary-600 text-white font-semibold text-sm flex items-center justify-center flex-shrink-0">
      {initials || 'Me'}
    </div>
  )
}

function ClientChatTab() {
  const [threads, setThreads] = useState<ClientThread[]>([])
  const [selectedThread, setSelectedThread] = useState<ClientThread | null>(null)
  const [messages, setMessages] = useState<ClientMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  const fetchThreads = useCallback(async () => {
    try {
      const res = await api.get<ClientThread[]>('/messages/client-inbox')
      setThreads(res.data || [])
    } catch (err) {
      console.error('Failed to load client inbox', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchThreads()
    const interval = setInterval(fetchThreads, 30_000)
    return () => clearInterval(interval)
  }, [fetchThreads])

  useEffect(() => {
    if (!selectedThread) return
    setLoadingThread(true)
    setMessages([])
    api
      .get<ClientMessage[]>(`/messages/client-inbox/${selectedThread.eventId}`)
      .then((res) => setMessages(res.data || []))
      .catch((err) => console.error('Failed to load thread', err))
      .finally(() => setLoadingThread(false))
    // Update unread count in thread list
    setThreads((prev) =>
      prev.map((t) => (t.eventId === selectedThread.eventId ? { ...t, unreadCount: 0 } : t)),
    )
  }, [selectedThread?.eventId])

  // Poll the active thread every 5s so new client messages appear in near-real-time
  useEffect(() => {
    if (!selectedThread) return
    const interval = setInterval(async () => {
      try {
        const res = await api.get<ClientMessage[]>(`/messages/client-inbox/${selectedThread.eventId}`)
        setMessages(res.data || [])
      } catch {
        // non-fatal — keep existing messages visible
      }
    }, 5_000)
    return () => clearInterval(interval)
  }, [selectedThread?.eventId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedThread || !newMessage.trim()) return
    setSending(true)
    try {
      const res = await api.post<ClientMessage>(
        `/messages/client-inbox/${selectedThread.eventId}/reply`,
        { content: newMessage.trim() },
      )
      setMessages((prev) => [...prev, res.data])
      setNewMessage('')
      setThreads((prev) =>
        prev.map((t) =>
          t.eventId === selectedThread.eventId
            ? {
                ...t,
                lastMessage: newMessage.trim(),
                lastMessageAt: new Date().toISOString(),
                lastMessageSender: 'owner',
              }
            : t,
        ),
      )
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading client messages…
      </div>
    )
  }

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex"
      style={{ minHeight: '60vh' }}
    >
      {/* Thread list */}
      <div className="w-72 border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Client Conversations</p>
        </div>
        {threads.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-gray-400">
            No client messages yet. Clients can message you from their portal.
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {threads.map((thread) => {
              const isSelected = selectedThread?.eventId === thread.eventId
              return (
                <li key={thread.eventId}>
                  <button
                    onClick={() => setSelectedThread(thread)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <ClientInitials name={thread.clientName} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-sm font-medium truncate ${
                            isSelected ? 'text-primary-700' : 'text-gray-900'
                          }`}
                        >
                          {thread.clientName}
                        </p>
                        {thread.unreadCount > 0 && (
                          <span className="flex-shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-600 text-white text-[10px] font-bold">
                            {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        {thread.eventName}
                        {thread.eventDate && (
                          <span className="text-gray-400">
                            {' · '}
                            {new Date(thread.eventDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </p>
                      {thread.lastMessage && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {thread.lastMessageSender === 'owner' ? 'You: ' : ''}
                          {thread.lastMessage}
                        </p>
                      )}
                    </div>
                    {isSelected && <ChevronRight className="h-4 w-4 text-primary-400 flex-shrink-0" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Thread view */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedThread ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-8 text-center">
            <div>
              <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p>Select a conversation to reply.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-3 bg-gray-50">
              <ClientInitials name={selectedThread.clientName} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{selectedThread.clientName}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  {selectedThread.eventName}
                  {selectedThread.eventDate && (
                    <span>
                      {' · '}
                      {new Date(selectedThread.eventDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </p>
              </div>
              <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {loadingThread ? (
                <div className="text-center text-sm text-gray-400 mt-10">Loading…</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-sm text-gray-400 mt-10">
                  No messages yet. Send a message to start the conversation.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_type === 'owner'
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && (
                        <ClientInitials name={selectedThread.clientName} />
                      )}
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <p className="text-xs text-gray-400 mb-1 px-1">
                          {isMe ? (user?.email?.split('@')[0] || 'You') : selectedThread.clientName}
                        </p>
                        <div
                          className={`max-w-xs sm:max-w-md rounded-2xl px-4 py-2.5 ${
                            isMe
                              ? 'bg-primary-600 text-white rounded-br-sm'
                              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p
                            className={`text-xs mt-1 ${isMe ? 'text-primary-200' : 'text-gray-400'}`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {' · '}
                            {new Date(msg.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      {isMe && (
                        <OwnerInitials name={user?.email?.split('@')[0] || 'Me'} />
                      )}
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Compose */}
            <div className="border-t border-gray-200 p-4">
              <form onSubmit={handleSend} className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Reply to ${selectedThread.clientName}…`}
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="h-10 w-10 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function MessagesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'sms' | 'chat'>('sms')
  const [messages, setMessages] = useState<Message[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [stats, setStats] = useState({ total: 0, sent: 0, delivered: 0, failed: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterEvent, setFilterEvent] = useState<string>('')
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)

  useEffect(() => {
    fetchMessages()
    fetchEvents()
    fetchStats()
  }, [])

  const fetchMessages = async () => {
    try {
      const response = await api.get<Message[]>('/messages')
      setMessages(response.data)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEvents = async () => {
    try {
      const response = await api.get<Event[]>('/events')
      setEvents(response.data)
    } catch (error) {
      console.error('Failed to fetch events:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/messages/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message record?')) return

    try {
      await api.delete(`/messages/${id}`)
      fetchMessages()
      fetchStats()
    } catch (error) {
      console.error('Failed to delete message:', error)
      alert('Failed to delete message')
    }
  }

  const handleRefreshStatus = async (id: string) => {
    try {
      await api.post(`/messages/${id}/refresh-status`)
      fetchMessages()
      fetchStats()
    } catch (error) {
      console.error('Failed to refresh status:', error)
      alert('Failed to refresh message status')
    }
  }

  const filteredMessages = messages.filter((message) => {
    // Support both 'content' (new schema) and 'message' (existing schema)
    const body: string = ((message as any).content ?? (message as any).message ?? '')
    const matchesSearch = (message.recipientName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (message.recipientPhone ?? '').includes(searchTerm) ||
                         body.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || message.status === filterStatus
    const matchesType = !filterType || message.messageType === filterType
    const matchesEvent = !filterEvent || message.eventId?.toString() === filterEvent
    return matchesSearch && matchesStatus && matchesType && matchesEvent
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading messages...</div>
      </div>
    )
  }

  if (user?.role !== 'owner') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Access Denied</p>
          <p className="text-sm text-gray-500">Only owners can manage messages</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          {activeTab === 'sms' && (
            <button
              onClick={() => router.push('/dashboard/messages/send')}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
            >
              <Plus className="h-5 w-5" />
              Send SMS
            </button>
          )}
        </div>
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('sms')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'sms'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            SMS Log
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'chat'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="h-4 w-4" />
            Client Chat
          </button>
        </div>
      </div>

      {/* Client Chat Tab */}
      {activeTab === 'chat' && <ClientChatTab />}

      {/* SMS Log Tab */}
      {activeTab === 'sms' && (<>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white shadow-md rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white shadow-md rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sent</p>
              <p className="text-2xl font-bold text-blue-900">{stats.sent}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-white shadow-md rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-green-900">{stats.delivered}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <div className="bg-white shadow-md rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-900">{stats.failed}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>
        <div className="bg-white shadow-md rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Types</option>
            <option value="reminder">Reminder</option>
            <option value="invoice">Invoice</option>
            <option value="confirmation">Confirmation</option>
            <option value="update">Update</option>
            <option value="custom">Custom</option>
          </select>
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No messages found</p>
            <button
              onClick={() => router.push('/dashboard/messages/send')}
              className="mt-4 text-primary-600 hover:text-primary-700"
            >
              Send your first message
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMessages.map((message) => (
                  <tr key={message.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedMessage(message)}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{message.recipientName}</div>
                      <div className="text-xs text-gray-500">{message.recipientPhone}</div>
                      {message.event && (
                        <div className="text-xs text-blue-600 mt-1">{message.event.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full capitalize">
                        {message.messageType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-md truncate">{(message as any).content ?? (message as any).message}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusClass(message.status)}`}>
                        {getStatusIcon(message.status)}
                        {message.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {message.sentAt ? new Date(message.sentAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {message.twilioSid && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRefreshStatus(message.id) }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Refresh status from Twilio"
                          >
                            Refresh
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(message.id) }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedMessage(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Message Details</h2>
              <button onClick={() => setSelectedMessage(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${getStatusClass(selectedMessage.status)}`}>
                  {getStatusIcon(selectedMessage.status)}
                  {selectedMessage.status}
                </span>
                <span className="inline-flex px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full capitalize">
                  {selectedMessage.messageType}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Recipient</p>
                  <p className="font-medium text-gray-900">{selectedMessage.recipientName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Phone</p>
                  <p className="font-medium text-gray-900">{selectedMessage.recipientPhone || '—'}</p>
                </div>
                {selectedMessage.event && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-0.5">Event</p>
                    <p className="font-medium text-blue-600">{selectedMessage.event.name}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-0.5">Sent At</p>
                  <p className="font-medium text-gray-900">{selectedMessage.sentAt ? new Date(selectedMessage.sentAt).toLocaleString() : '—'}</p>
                </div>
                {selectedMessage.twilioSid && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-0.5">Twilio SID</p>
                    <p className="font-mono text-xs text-gray-600 break-all">{selectedMessage.twilioSid}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Message Content</p>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {(selectedMessage as any).content ?? (selectedMessage as any).message ?? '—'}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              {selectedMessage.twilioSid && (
                <button
                  onClick={() => { handleRefreshStatus(selectedMessage.id); setSelectedMessage(null) }}
                  className="px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                >
                  Refresh Status
                </button>
              )}
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </>)}
    </div>
  )
}
