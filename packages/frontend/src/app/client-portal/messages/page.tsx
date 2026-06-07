'use client'

import { useState, useEffect, useRef } from 'react'
import clientApi from '@/lib/clientApi'
import { useClientAuth } from '@/contexts/ClientAuthContext'
import { MessageSquare, Send, ChevronRight, Building2, Calendar } from 'lucide-react'

interface Contact {
  eventId: string
  eventName: string
  eventDate: string | null
  ownerId: string
  ownerBusinessName: string
  ownerLogoUrl: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  lastMessageSender: string | null
  unreadCount: number
}

interface Message {
  id: string
  event_id: string
  owner_id: string
  client_id: string
  sender_type: 'owner' | 'client'
  content: string
  is_read: boolean
  created_at: string
}

function OwnerAvatar({ logoUrl, name, size = 'md' }: { logoUrl: string | null; name: string; size?: 'sm' | 'md' }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  const dim = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={`${dim} rounded-full object-cover flex-shrink-0`}
      />
    )
  }
  return (
    <div className={`${dim} rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center flex-shrink-0`}>
      {initials || '?'}
    </div>
  )
}

export default function ClientMessagesPage() {
  const { client } = useClientAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Fetch contact list on mount
  useEffect(() => {
    clientApi
      .get<Contact[]>('/contacts')
      .then((res) => setContacts(res.data || []))
      .catch((err) => console.error('Failed to load contacts', err))
      .finally(() => setLoading(false))
  }, [])

  // Fetch thread when a contact is selected
  useEffect(() => {
    if (!selectedContact) return
    setLoadingThread(true)
    setMessages([])

    clientApi
      .get<Message[]>(`/messages?eventId=${selectedContact.eventId}`)
      .then((res) => setMessages(res.data || []))
      .catch((err) => console.error('Failed to load messages', err))
      .finally(() => setLoadingThread(false))

    // Mark messages as read
    clientApi
      .patch('/messages/read', { eventId: selectedContact.eventId })
      .then(() => {
        setContacts((prev) =>
          prev.map((c) => (c.eventId === selectedContact.eventId ? { ...c, unreadCount: 0 } : c)),
        )
      })
      .catch(() => {})
  }, [selectedContact?.eventId])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedContact || !newMessage.trim()) return
    setSending(true)
    try {
      const res = await clientApi.post<Message>('/messages', {
        recipientId: selectedContact.ownerId,
        eventId: selectedContact.eventId,
        content: newMessage.trim(),
      })
      setMessages((prev) => [...prev, res.data])
      setNewMessage('')
      setContacts((prev) =>
        prev.map((c) =>
          c.eventId === selectedContact.eventId
            ? {
                ...c,
                lastMessage: newMessage.trim(),
                lastMessageAt: new Date().toISOString(),
                lastMessageSender: 'client',
              }
            : c,
        ),
      )
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading messages…</div>
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
        <MessageSquare className="h-6 w-6 text-primary-600" />
        Messages
      </h1>

      <div
        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex"
        style={{ minHeight: '60vh' }}
      >
        {/* Contact list */}
        <div className="w-72 border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Events</p>
          </div>

          {contacts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-gray-400">
              No contacts yet. Contacts appear once your events are confirmed.
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {contacts.map((contact) => {
                const isSelected = selectedContact?.eventId === contact.eventId
                return (
                  <li key={contact.eventId}>
                    <button
                      onClick={() => setSelectedContact(contact)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <OwnerAvatar logoUrl={contact.ownerLogoUrl} name={contact.ownerBusinessName} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`text-sm font-medium truncate ${
                              isSelected ? 'text-primary-700' : 'text-gray-900'
                            }`}
                          >
                            {contact.ownerBusinessName}
                          </p>
                          {contact.unreadCount > 0 && (
                            <span className="flex-shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-600 text-white text-[10px] font-bold">
                              {contact.unreadCount > 9 ? '9+' : contact.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          {contact.eventName}
                          {contact.eventDate && (
                            <span className="text-gray-400">
                              {' · '}
                              {new Date(contact.eventDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                        </p>
                        {contact.lastMessage && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {contact.lastMessageSender === 'client' ? 'You: ' : ''}
                            {contact.lastMessage}
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

        {/* Message thread */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedContact ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-8 text-center">
              <div>
                <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p>Select an event to view your conversation.</p>
                <p className="text-xs mt-1 text-gray-300">Each event has its own message thread.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-3 bg-gray-50">
                <OwnerAvatar
                  logoUrl={selectedContact.ownerLogoUrl}
                  name={selectedContact.ownerBusinessName}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {selectedContact.ownerBusinessName}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    {selectedContact.eventName}
                    {selectedContact.eventDate && (
                      <span>
                        {' · '}
                        {new Date(selectedContact.eventDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </p>
                </div>
                <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {loadingThread ? (
                  <div className="text-center text-sm text-gray-400 mt-10">Loading…</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-sm text-gray-400 mt-10">
                    No messages yet. Send your first message below!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_type === 'client'
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {!isMe && (
                          <div className="mr-2 flex-shrink-0 self-end">
                            <OwnerAvatar
                              logoUrl={selectedContact.ownerLogoUrl}
                              name={selectedContact.ownerBusinessName}
                              size="sm"
                            />
                          </div>
                        )}
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
                    placeholder={`Message ${selectedContact.ownerBusinessName}…`}
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
    </div>
  )
}
