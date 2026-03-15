'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { User, Event, Guest } from '@/types'
import { Send, ArrowLeft, Users as UsersIcon } from 'lucide-react'
import { parseLocalDate } from '@/lib/dateUtils'

export default function SendMessagePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [clients, setClients] = useState<User[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    recipientType: 'client' as 'client' | 'guest' | 'security' | 'custom',
    messageType: 'confirmation' as 'reminder' | 'invoice' | 'confirmation' | 'update' | 'support' | 'announcement' | 'custom',
    userId: '',
    eventId: '',
    recipientPhone: '',
    recipientName: '',
    content: '',
    sendToAll: false,
  })

  useEffect(() => {
    fetchClients()
    fetchEvents()
  }, [])

  useEffect(() => {
    if (formData.eventId) {
      fetchGuestsForEvent(parseInt(formData.eventId))
    }
  }, [formData.eventId])

  const fetchClients = async () => {
    try {
      const response = await api.get<User[]>('/users?role=customer')
      setClients(response.data)
    } catch (error) {
      console.error('Failed to fetch clients:', error)
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

  const fetchGuestsForEvent = async (eventId: number) => {
    try {
      const response = await api.get(`/guest-lists/by-event/${eventId}`)
      const guestList = response.data
      if (guestList && guestList.guests) {
        setGuests(guestList.guests)
      } else {
        setGuests([])
      }
    } catch (error) {
      console.error('Failed to fetch guests:', error)
      setGuests([])
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (formData.sendToAll) {
        // Send to multiple recipients
        const messages = []

        if (formData.recipientType === 'client' && clients.length > 0) {
          // Only send to clients who have opted in to SMS
          const optedIn = clients.filter(c => c.phone && c.smsOptIn)
          if (optedIn.length === 0) {
            alert('No opted-in clients with phone numbers found. Clients must consent to SMS before receiving messages.')
            setLoading(false)
            return
          }
          messages.push(...optedIn.map(c => ({
            recipientPhone: c.phone!,
            recipientName: `${c.firstName} ${c.lastName}`,
            recipientType: 'client' as const,
            userId: c.id,
            eventId: formData.eventId || undefined,
            messageType: formData.messageType,
            content: formData.content,
          })))
        } else if (formData.recipientType === 'guest' && guests.length > 0) {
          messages.push(...guests.map(g => ({
            recipientPhone: g.phone,
            recipientName: g.name,
            recipientType: 'guest' as const,
            eventId: formData.eventId || undefined,
            messageType: formData.messageType,
            content: formData.content,
          })))
        }

        if (messages.length === 0) {
          alert('No recipients found with phone numbers')
          setLoading(false)
          return
        }

        await api.post('/messages/send-bulk', { messages })
        alert(`Successfully sent ${messages.length} message(s)`)
      } else {
        // Send to single recipient
        if (!formData.recipientPhone || !formData.recipientName) {
          alert('Please fill in all recipient fields')
          setLoading(false)
          return
        }

        await api.post('/messages/send', {
          recipientPhone: formData.recipientPhone,
          recipientName: formData.recipientName,
          recipientType: formData.recipientType,
          userId: formData.userId || undefined,
          eventId: formData.eventId || undefined,
          messageType: formData.messageType,
          content: formData.content,
        })

        alert('Message sent successfully!')
      }

      router.push('/dashboard/messages')
    } catch (error: any) {
      console.error('Failed to send message:', error)
      alert(error.response?.data?.message || 'Failed to send message. Please check your Twilio configuration.')
    } finally {
      setLoading(false)
    }
  }

  const handleUserChange = (userId: string) => {
    setFormData({ ...formData, userId })
    const client = clients.find(c => c.id.toString() === userId)
    if (client && client.phone) {
      setFormData(prev => ({
        ...prev,
        userId,
        recipientPhone: client.phone!,
        recipientName: `${client.firstName} ${client.lastName}`,
      }))
    }
  }

  const STOP_FOOTER = ' Reply STOP to unsubscribe.'

  const getMessageTemplate = () => {
    const selectedEvent = events.find(e => e.id.toString() === formData.eventId)
    const eventDate = selectedEvent ? parseLocalDate(selectedEvent.date) : null
    const eventName = selectedEvent?.name ?? '[Event Name]'
    const venue = selectedEvent?.venue ?? '[Venue Name]'
    const dateStr = eventDate ? eventDate.toLocaleDateString() : '[Date]'
    const timeStr = eventDate ? eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '[Time]'

    switch (formData.messageType) {
      case 'confirmation':
        // Sample #1
        return `DoVenue Suite: Your registration for ${eventName} on ${dateStr} is confirmed.${STOP_FOOTER}`
      case 'reminder':
        // Sample #2
        return `Reminder: ${eventName} starts at ${timeStr} at ${venue}.${STOP_FOOTER}`
      case 'support':
        // Sample #3
        return `DoVenue Suite Support: We received your request and will respond shortly.${STOP_FOOTER}`
      case 'announcement':
        // Sample #4
        return `DoVenue Suite: New events are now available in your area. View at dovenuesuite.com.${STOP_FOOTER}`
      case 'invoice':
        return `DoVenue Suite: Your invoice has been updated. For assistance, contact support@dovenuesuite.com.${STOP_FOOTER}`
      case 'update':
        return `DoVenue Suite: We have an update regarding ${eventName}. For assistance, contact support@dovenuesuite.com.${STOP_FOOTER}`
      default:
        return ''
    }
  }

  const useTemplate = () => {
    setFormData({ ...formData, content: getMessageTemplate() })
  }

  if (user?.role !== 'owner') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Access Denied</p>
          <p className="text-sm text-gray-500">Only owners can send messages</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Send Message</h1>
        <p className="text-gray-600 mt-1">Send SMS messages to clients, guests, or custom recipients</p>
      </div>

      <form onSubmit={handleSendMessage} className="bg-white shadow-md rounded-lg p-6 space-y-6">
        {/* Recipient Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Type *
          </label>
          <select
            value={formData.recipientType}
            onChange={(e) => setFormData({ ...formData, recipientType: e.target.value as any, userId: '', recipientPhone: '', recipientName: '' })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          >
            <option value="client">Client</option>
            <option value="guest">Guest (from event)</option>
            <option value="security">Security</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Event Selection (for context) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Associated Event (Optional)
          </label>
          <select
            value={formData.eventId}
            onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select an event...</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} - {parseLocalDate(event.date).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>

        {/* Send to All Checkbox */}
        {(formData.recipientType === 'client' || (formData.recipientType === 'guest' && formData.eventId)) && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sendToAll"
              checked={formData.sendToAll}
              onChange={(e) => setFormData({ ...formData, sendToAll: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="sendToAll" className="text-sm text-gray-700">
              Send to all {formData.recipientType === 'client' ? 'clients' : `guests in selected event (${guests.length} guest${guests.length !== 1 ? 's' : ''})`}
            </label>
          </div>
        )}

        {!formData.sendToAll && (
          <>
            {/* Client Selection */}
            {formData.recipientType === 'client' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Client *
                </label>
                <select
                  value={formData.userId}
                  onChange={(e) => handleUserChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName} {client.phone ? `(${client.phone})` : '(No phone)'}{client.smsOptIn ? ' ✓ Opted in' : ' — Not opted in'}
                    </option>
                  ))}
                </select>
                {formData.userId && clients.find(c => c.id.toString() === formData.userId)?.smsOptIn === false && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠ This client has not opted in to SMS. Sending may fail or violate compliance.
                  </p>
                )}
              </div>
            )}

            {/* Custom Recipient */}
            {(formData.recipientType === 'custom' || formData.recipientType === 'security') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Name *
                  </label>
                  <input
                    type="text"
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter recipient name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.recipientPhone}
                    onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="+1234567890"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +1 for US)</p>
                </div>
              </>
            )}
          </>
        )}

        {/* Message Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message Type *
          </label>
          <select
            value={formData.messageType}
            onChange={(e) => setFormData({ ...formData, messageType: e.target.value as any })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          >
            <option value="confirmation">Registration Confirmation</option>
            <option value="reminder">Event Reminder</option>
            <option value="support">Support Response</option>
            <option value="announcement">Event Announcement</option>
            <option value="invoice">Invoice Update</option>
            <option value="update">General Update</option>
            <option value="custom">Custom Message</option>
          </select>
        </div>

        {/* Template Button */}
        {formData.messageType !== 'custom' && (
          <button
            type="button"
            onClick={useTemplate}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Use template for {formData.messageType}
          </button>
        )}

        {/* Message Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message Content *
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={6}
            placeholder="Enter your message here..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Character count: {formData.content.length} (SMS segments: {Math.ceil(formData.content.length / 160)})
          </p>
          {formData.content && !formData.content.toLowerCase().includes('reply stop to unsubscribe') && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠ Campaign compliance requires "Reply STOP to unsubscribe." Use a template or add it manually.
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
            {loading ? 'Sending...' : formData.sendToAll ? `Send to Multiple Recipients` : 'Send Message'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Configuration Note */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Twilio Configuration Required</h3>
        <p className="text-sm text-blue-800 mb-2">
          To send messages, add the following to your backend .env file:
        </p>
        <pre className="bg-blue-100 p-2 rounded text-xs text-blue-900 overflow-x-auto">
{`TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890`}
        </pre>
      </div>
    </div>
  )
}
