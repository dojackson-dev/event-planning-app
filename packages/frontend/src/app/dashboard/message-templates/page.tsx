'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { MessageTemplate } from '@/types'
import { Plus, Edit2, Trash2, Power, Clock, Repeat, Calendar } from 'lucide-react'

export default function MessageTemplatesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await api.get<MessageTemplate[]>('/message-templates')
      setTemplates(response.data)
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (id: string) => {
    try {
      await api.post(`/message-templates/${id}/toggle`)
      fetchTemplates()
    } catch (error) {
      console.error('Failed to toggle template:', error)
      alert('Failed to update template')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      await api.delete(`/message-templates/${id}`)
      fetchTemplates()
    } catch (error) {
      console.error('Failed to delete template:', error)
      alert('Failed to delete template')
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'reminder':
        return 'bg-blue-100 text-blue-800'
      case 'invoice':
        return 'bg-green-100 text-green-800'
      case 'confirmation':
        return 'bg-purple-100 text-purple-800'
      case 'update':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading templates...</div>
      </div>
    )
  }

  if (user?.role !== 'owner') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Access Denied</p>
          <p className="text-sm text-gray-500">Only owners can manage message templates</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Templates</h1>
          <p className="text-gray-600 mt-1">Create and manage automated message schedules</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/message-templates/new')}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          <Plus className="h-5 w-5" />
          Create Template
        </button>
      </div>

      <div className="grid gap-4">
        {templates.length === 0 ? (
          <div className="bg-white shadow-md rounded-lg p-12 text-center">
            <p className="text-gray-500 mb-4">No message templates yet</p>
            <button
              onClick={() => router.push('/dashboard/message-templates/new')}
              className="text-primary-600 hover:text-primary-700"
            >
              Create your first template
            </button>
          </div>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className={`bg-white shadow-md rounded-lg p-6 ${!template.isActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getTypeColor(template.messageType)}`}>
                      {template.messageType}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${template.recipientType === 'all' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}>
                      {template.recipientType}
                    </span>
                    {template.autoSend && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        <Power className="h-3 w-3" />
                        Auto-send
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-4">{template.content}</p>

                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    {template.sendBeforeDays !== null && template.sendBeforeDays !== undefined && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{template.sendBeforeDays} days before event</span>
                      </div>
                    )}
                    {template.sendTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>at {template.sendTime}</span>
                      </div>
                    )}
                    {template.repeatIntervalDays && (
                      <div className="flex items-center gap-1">
                        <Repeat className="h-4 w-4" />
                        <span>Every {template.repeatIntervalDays} days</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleToggleActive(template.id)}
                    className={`p-2 rounded-md ${template.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                    title={template.isActive ? 'Deactivate' : 'Activate'}
                  >
                    <Power className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/message-templates/${template.id}/edit`)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                    title="Edit"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
