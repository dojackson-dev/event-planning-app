'use client'

import { useState, useEffect, useRef } from 'react'
import clientApi from '@/lib/clientApi'
import { useClientAuth } from '@/contexts/ClientAuthContext'
import { MessageSquare, Send, Store, User, ChevronRight } from 'lucide-react'

interface Contact {
  id: string
  name: string
  role: 'owner' | 'vendor'
  vendorName?: string
}

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  created_at: string
  message_type?: string
}

export default function ClientMessagesPage() {
  const { client } = useClientAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecipient, setSelectedRecipient] = useState<Contact | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      clientApi.get('/messages'),
      clientApi.get('/vendors'),
      clientApi.get('/bookings'),
    ]).then(([msgRes, vRes, bkRes]) => {
      setMessages(msgRes.data)
      setVendors(vRes.data)
      setBookings(bkRes.data)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, selectedRecipient])

  // Build contact list: owner(s) + confirmed vendors
  const contacts: Contact[] = []
  const ownerIds = new Set<string>()
  bookings.forEach((b: any) => {
    const ownerId = b.event?.owner_id
    if (ownerId && !ownerIds.has(ownerId)) {
      ownerIds.add(ownerId)
      contacts.push({ id: ownerId, name: 'Event Organizer', role: 'owner' })
    }
  })
  vendors.forEach((vb: any) => {
    if (vb.vendor_user_id) {
      contacts.push({
        id: vb.vendor_user_id,
        name: vb.vendor?.business_name ?? 'Vendor',
        role: 'vendor',
        vendorName: vb.vendor?.business_name,
      })
    }
  })

  const thread = selectedRecipient
    ? messages.filter(
        (m) =>
          (m.sender_id === client?.clientId && m.recipient_id === selectedRecipient.id) ||
          (m.sender_id === selectedRecipient.id && m.recipient_id === client?.clientId),
      ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : []

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRecipient || !newMessage.trim()) return
    setSending(true)
    try {
      const res = await clientApi.post('/messages', {
        recipientId: selectedRecipient.id,
        content: newMessage.trim(),
      })
      setMessages((prev) => [...prev, res.data])
      setNewMessage('')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading messages...</div>
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
        <MessageSquare className="h-6 w-6 text-primary-600" />
        Messages
      </h1>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex" style={{ minHeight: '60vh' }}>
        {/* Contact list */}
        <div className="w-64 border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacts</p>
          </div>

          {contacts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-gray-400">
              No contacts yet. Contacts appear once you have confirmed bookings.
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {contacts.map((contact) => {
                const isSelected = selectedRecipient?.id === contact.id
                const unreadCount = messages.filter(
                  (m) => m.sender_id === contact.id && m.recipient_id === client?.clientId,
                ).length // simplified unread indicator
                return (
                  <li key={contact.id}>
                    <button
                      onClick={() => setSelectedRecipient(contact)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        contact.role === 'owner' ? 'bg-primary-100 text-primary-600' : 'bg-orange-100 text-orange-600'
                      }`}>
                        {contact.role === 'owner' ? <User className="h-5 w-5" /> : <Store className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>
                          {contact.name}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">{contact.role}</p>
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
          {!selectedRecipient ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-8 text-center">
              <div>
                <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p>Select a contact to start messaging.</p>
                <p className="text-xs mt-1 text-gray-300">You can only message the owner or vendors you are booked with.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-3 bg-gray-50">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selectedRecipient.role === 'owner' ? 'bg-primary-100 text-primary-600' : 'bg-orange-100 text-orange-600'
                }`}>
                  {selectedRecipient.role === 'owner' ? <User className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selectedRecipient.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{selectedRecipient.role}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {thread.length === 0 ? (
                  <div className="text-center text-sm text-gray-400 mt-10">
                    No messages yet. Send your first message below!
                  </div>
                ) : (
                  thread.map((msg) => {
                    const isMe = msg.sender_id === client?.clientId
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs sm:max-w-md rounded-2xl px-4 py-2.5 ${
                          isMe
                            ? 'bg-primary-600 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-xs mt-1 ${isMe ? 'text-primary-200' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            {' · '}
                            {new Date(msg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                    placeholder={`Message ${selectedRecipient.name}...`}
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
