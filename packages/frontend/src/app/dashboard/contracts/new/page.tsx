'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Upload, X, Calendar, Clock, Mail, Phone, Users } from 'lucide-react'
import { parseLocalDate } from '@/lib/dateUtils'

interface IntakeFormClient {
  id: string
  contact_name: string
  contact_email: string
  contact_phone: string
  event_type: string
  event_date: string
  event_time: string
  guest_count: number
  status: string
}

export default function NewContractPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [clients, setClients] = useState<IntakeFormClient[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [selectedClientData, setSelectedClientData] = useState<IntakeFormClient | null>(null)
  const [title, setTitle] = useState('Event Service Agreement')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [])

  useEffect(() => {
    if (selectedClient) {
      const client = clients.find(c => c.id === selectedClient)
      setSelectedClientData(client || null)
      if (client) {
        const eventLabel = client.event_type
          ? client.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          : 'Event'
        setDescription(`Contract for ${client.contact_name} — ${eventLabel}`)
      }
    } else {
      setSelectedClientData(null)
    }
  }, [selectedClient, clients])

  const fetchClients = async () => {
    try {
      const res = await api.get<IntakeFormClient[]>('/intake-forms')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const upcoming = res.data.filter((c) => {
        if (!c.event_date) return false
        const [y, m, d] = c.event_date.split('-').map(Number)
        return new Date(y, m - 1, d) >= today
      })
      setClients(upcoming)
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      // Validate file type (PDF, DOC, DOCX)
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!allowedTypes.includes(selectedFile.type)) {
        alert('Please upload a PDF or Word document')
        return
      }
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
        return
      }
      setFile(selectedFile)
    }
  }

  const removeFile = () => {
    setFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedClient || !title || !file) {
      alert('Please select a client and upload a contract file')
      return
    }

    setLoading(true)
    try {
      // Upload file first
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      
      const uploadResponse = await api.post('/contracts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setUploading(false)

      // Create contract
      const contractData = {
        owner_id: user?.id,
        intake_form_id: selectedClient,
        title,
        description,
        notes,
        file_url: uploadResponse.data.path,
        file_name: uploadResponse.data.originalname,
        file_size: uploadResponse.data.size,
        status: 'draft'
      }

      const response = await api.post('/contracts', contractData)
      router.push(`/dashboard/contracts/${response.data.id}`)
    } catch (error) {
      console.error('Failed to create contract:', error)
      alert('Failed to create contract')
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Contract</h1>
        <p className="text-gray-600 mt-1">Upload a contract document for client signature</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        {/* Client Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Client *
          </label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">-- Select a client --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.contact_name}
                {c.event_type ? ` — ${c.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}` : ''}
                {c.event_date ? ` (${c.event_date})` : ''}
              </option>
            ))}
          </select>
          {clients.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">No upcoming clients found. Clients with past event dates are excluded.</p>
          )}
        </div>

        {/* Client Details Display */}
        {selectedClientData && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">Client Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Client:</span>
                <p className="text-blue-900 font-semibold">{selectedClientData.contact_name}</p>
                {selectedClientData.contact_email && (
                  <p className="text-blue-700 text-xs flex items-center gap-1 mt-0.5">
                    <Mail className="h-3 w-3" />{selectedClientData.contact_email}
                  </p>
                )}
                {selectedClientData.contact_phone && (
                  <p className="text-blue-700 text-xs flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" />{selectedClientData.contact_phone}
                  </p>
                )}
              </div>
              <div>
                <span className="text-blue-700 font-medium">Event Type:</span>
                <p className="text-blue-900">
                  {selectedClientData.event_type
                    ? selectedClientData.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                    : 'N/A'}
                </p>
              </div>
              {selectedClientData.event_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <div>
                    <span className="text-blue-700 font-medium">Event Date:</span>
                    <p className="text-blue-900">
                      {parseLocalDate(selectedClientData.event_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
              {selectedClientData.event_time && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div>
                    <span className="text-blue-700 font-medium">Event Time:</span>
                    <p className="text-blue-900">{selectedClientData.event_time}</p>
                  </div>
                </div>
              )}
              {selectedClientData.guest_count && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <div>
                    <span className="text-blue-700 font-medium">Guests:</span>
                    <p className="text-blue-900">{selectedClientData.guest_count}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contract Title */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contract Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g., Venue Rental Agreement, Event Service Contract"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief description of the contract"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Contract Document * (PDF, DOC, DOCX - Max 10MB)
          </label>
          {!file ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Click to upload or drag and drop
              </p>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx"
                className="hidden"
                id="fileUpload"
              />
              <label
                htmlFor="fileUpload"
                className="mt-4 inline-block cursor-pointer bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
              >
                Select File
              </label>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-primary-100 p-2 rounded">
                  <Upload className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="text-red-600 hover:text-red-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Internal Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Internal notes (not visible to client)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/contracts')}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || uploading}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : loading ? 'Creating...' : 'Create Contract'}
          </button>
        </div>
      </form>
    </div>
  )
}
