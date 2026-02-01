'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { User, Booking } from '@/types'
import { Upload, X, Calendar, Clock } from 'lucide-react'
import { parseLocalDate } from '@/lib/dateUtils'

export default function NewContractPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedBooking, setSelectedBooking] = useState<string>('')
  const [selectedBookingData, setSelectedBookingData] = useState<Booking | null>(null)
  const [title, setTitle] = useState('Event Service Agreement')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchBookings()
  }, [])

  useEffect(() => {
    if (selectedBooking) {
      const booking = bookings.find(b => b.id === selectedBooking)
      setSelectedBookingData(booking || null)
      if (booking?.event) {
        setDescription(`Contract for ${booking.event.name} event`)
      }
    } else {
      setSelectedBookingData(null)
    }
  }, [selectedBooking, bookings])

  const fetchBookings = async () => {
    try {
      const response = await api.get<Booking[]>('/bookings')
      setBookings(response.data)
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
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
    
    if (!selectedBooking || !title || !file) {
      alert('Please select a booking/event and upload a contract file')
      return
    }

    if (!selectedBookingData?.user?.id) {
      alert('No client associated with this booking')
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
        ownerId: user?.id ? Number(user.id) : undefined,
        clientId: Number(selectedBookingData.user.id),
        bookingId: Number(selectedBooking),
        title,
        description,
        notes,
        fileUrl: uploadResponse.data.path,
        fileName: uploadResponse.data.originalname,
        fileSize: uploadResponse.data.size,
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
        {/* Booking/Event Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Booking/Event *
          </label>
          <select
            value={selectedBooking}
            onChange={(e) => setSelectedBooking(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">-- Select a booking --</option>
            {bookings.map((booking) => (
              <option key={booking.id} value={booking.id}>
                {booking.event?.name || 'Event'} - {booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : 'Customer'}
                {booking.event?.date && ` - ${parseLocalDate(booking.event.date).toLocaleDateString()}`}
              </option>
            ))}
          </select>
        </div>

        {/* Event Details Display */}
        {selectedBookingData && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">Event Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Client:</span>
                <p className="text-blue-900">
                  {selectedBookingData.user?.firstName} {selectedBookingData.user?.lastName}
                </p>
                <p className="text-blue-700 text-xs">{selectedBookingData.user?.email}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Event:</span>
                <p className="text-blue-900">{selectedBookingData.event?.name || 'N/A'}</p>
              </div>
              {selectedBookingData.event?.date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <div>
                    <span className="text-blue-700 font-medium">Date:</span>
                    <p className="text-blue-900">
                      {parseLocalDate(selectedBookingData.event.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
              {(selectedBookingData.event?.startTime || selectedBookingData.event?.endTime) && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div>
                    <span className="text-blue-700 font-medium">Time:</span>
                    <p className="text-blue-900">
                      {selectedBookingData.event?.startTime} - {selectedBookingData.event?.endTime}
                    </p>
                  </div>
                </div>
              )}
              {selectedBookingData.event?.venue && (
                <div>
                  <span className="text-blue-700 font-medium">Venue:</span>
                  <p className="text-blue-900">{selectedBookingData.event.venue}</p>
                </div>
              )}
              {selectedBookingData.totalPrice && (
                <div>
                  <span className="text-blue-700 font-medium">Booking Amount:</span>
                  <p className="text-blue-900">${Number(selectedBookingData.totalPrice).toFixed(2)}</p>
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
