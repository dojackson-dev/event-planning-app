'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { ArrowLeft, Save } from 'lucide-react'

export default function NewMessageTemplatePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    messageType: 'reminder' as 'reminder' | 'invoice' | 'confirmation' | 'update' | 'custom',
    content: '',
    recipientType: 'client' as 'client' | 'guest' | 'security' | 'all',
    sendBeforeDays: '',
    sendTime: '09:00',
    repeatIntervalDays: '',
    autoSend: false,
    isActive: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post('/message-templates', {
        ...formData,
        sendBeforeDays: formData.sendBeforeDays ? parseInt(formData.sendBeforeDays) : null,
        repeatIntervalDays: formData.repeatIntervalDays ? parseInt(formData.repeatIntervalDays) : null,
      })

      alert('Template created successfully!')
      router.push('/dashboard/message-templates')
    } catch (error) {
      console.error('Failed to create template:', error)
      alert('Failed to create template')
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== 'owner') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Access Denied</p>
          <p className="text-sm text-gray-500">Only owners can create message templates</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Create Message Template</h1>
        <p className="text-gray-600 mt-1">Set up automated message scheduling</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., 1 Week Reminder"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <option value="reminder">Reminder</option>
              <option value="invoice">Invoice</option>
              <option value="confirmation">Confirmation</option>
              <option value="update">Update</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send To *
            </label>
            <select
              value={formData.recipientType}
              onChange={(e) => setFormData({ ...formData, recipientType: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="client">Clients Only</option>
              <option value="guest">Guests Only</option>
              <option value="security">Security Only</option>
              <option value="all">All Recipients</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message Content *
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={6}
            placeholder="Use placeholders: {event_name}, {event_date}, {event_time}, {event_location}"
            required
          />
          <p className="text-xs text-gray-500 mt-2">
            Available placeholders: {'{event_name}'}, {'{event_date}'}, {'{event_time}'}, {'{event_location}'}
          </p>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Scheduling Options</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send Before Event (Days)
              </label>
              <input
                type="number"
                min="0"
                value={formData.sendBeforeDays}
                onChange={(e) => setFormData({ ...formData, sendBeforeDays: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., 7 for one week before"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for manual scheduling only</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send Time
              </label>
              <input
                type="time"
                value={formData.sendTime}
                onChange={(e) => setFormData({ ...formData, sendTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repeat Every (Days)
            </label>
            <input
              type="number"
              min="1"
              value={formData.repeatIntervalDays}
              onChange={(e) => setFormData({ ...formData, repeatIntervalDays: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., 7 for weekly reminders"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty for one-time messages. Use with "Send Before Event" for recurring reminders.
            </p>
          </div>
        </div>

        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoSend"
              checked={formData.autoSend}
              onChange={(e) => setFormData({ ...formData, autoSend: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="autoSend" className="text-sm text-gray-700">
              Auto-send when new events are created (applies scheduling rules automatically)
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Template is active
            </label>
          </div>
        </div>

        <div className="flex gap-4 pt-6">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Save className="h-5 w-5" />
            {loading ? 'Creating...' : 'Create Template'}
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
    </div>
  )
}
