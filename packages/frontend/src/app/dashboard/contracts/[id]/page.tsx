'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Contract, ContractStatus } from '@/types'
import SignatureCanvas from 'react-signature-canvas'
import { Download, Send, FileText, Check, X as XIcon } from 'lucide-react'

export default function ContractDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [signing, setSigning] = useState(false)
  const signatureRef = useRef<SignatureCanvas>(null)

  useEffect(() => {
    if (params.id) {
      fetchContract()
    }
  }, [params.id])

  useEffect(() => {
    if (user) {
      setSignerName(`${user.firstName} ${user.lastName}`)
    }
  }, [user])

  const fetchContract = async () => {
    try {
      const response = await api.get<Contract>(`/contracts/${params.id}`)
      setContract(response.data)
    } catch (error) {
      console.error('Failed to fetch contract:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!contract) return
    
    if (!confirm('Send this contract to the client? They will receive an email notification with a link to review and sign the contract.')) {
      return
    }

    setSending(true)
    try {
      await api.post(`/contracts/${contract.id}/send`)
      await fetchContract()
      alert('Contract sent successfully! The client will receive an email notification.')
    } catch (error) {
      console.error('Failed to send contract:', error)
      alert('Failed to send contract. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const clearSignature = () => {
    signatureRef.current?.clear()
  }

  const handleSign = async () => {
    if (!contract || !signatureRef.current || signatureRef.current.isEmpty()) {
      alert('Please provide a signature')
      return
    }

    if (!signerName.trim()) {
      alert('Please enter your name')
      return
    }

    setSigning(true)
    try {
      const signatureData = signatureRef.current.toDataURL()
      
      await api.post(`/contracts/${contract.id}/sign`, {
        signatureData,
        signerName: signerName.trim(),
      })

      setShowSignModal(false)
      fetchContract()
      alert('Contract signed successfully!')
    } catch (error) {
      console.error('Failed to sign contract:', error)
      alert('Failed to sign contract')
    } finally {
      setSigning(false)
    }
  }

  const handleDownload = () => {
    if (contract?.fileUrl) {
      window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${contract.fileUrl}`, '_blank')
    }
  }

  const getStatusColor = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.SIGNED:
        return 'bg-green-100 text-green-800'
      case ContractStatus.SENT:
        return 'bg-blue-100 text-blue-800'
      case ContractStatus.DRAFT:
        return 'bg-gray-100 text-gray-800'
      case ContractStatus.CANCELLED:
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading contract...</div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Contract not found</div>
      </div>
    )
  }

  const isOwner = user?.role === 'owner' && user?.id === contract.ownerId
  const isClient = user?.id === contract.clientId
  const canSign = isClient && contract.status === ContractStatus.SENT

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <button
            onClick={() => router.push('/dashboard/contracts')}
            className="text-gray-600 hover:text-gray-900 mb-2"
          >
            ← Back to Contracts
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{contract.title}</h1>
          <p className="text-gray-600 mt-1">Contract #{contract.contractNumber}</p>
        </div>
        <span
          className={`px-3 py-1 text-sm font-semibold rounded-full capitalize ${getStatusColor(
            contract.status
          )}`}
        >
          {contract.status}
        </span>
      </div>

      {/* Contract Details */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Client</h3>
            <p className="mt-1 text-gray-900">
              {contract.client
                ? `${contract.client.firstName} ${contract.client.lastName}`
                : 'N/A'}
            </p>
            <p className="text-sm text-gray-500">{contract.client?.email}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Owner</h3>
            <p className="mt-1 text-gray-900">
              {contract.owner
                ? `${contract.owner.firstName} ${contract.owner.lastName}`
                : 'N/A'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Created Date</h3>
            <p className="mt-1 text-gray-900">
              {new Date(contract.createdAt).toLocaleDateString()}
            </p>
          </div>

          {contract.sentDate && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Sent Date</h3>
              <p className="mt-1 text-gray-900">
                {new Date(contract.sentDate).toLocaleDateString()}
              </p>
            </div>
          )}

          {contract.signedDate && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Signed Date</h3>
              <p className="mt-1 text-gray-900">
                {new Date(contract.signedDate).toLocaleDateString()}
              </p>
            </div>
          )}

          {contract.signerName && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Signed By</h3>
              <p className="mt-1 text-gray-900">{contract.signerName}</p>
            </div>
          )}
        </div>

        {contract.description && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <p className="mt-1 text-gray-900">{contract.description}</p>
          </div>
        )}

        {contract.notes && isOwner && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500">Internal Notes</h3>
            <p className="mt-1 text-gray-900">{contract.notes}</p>
          </div>
        )}
      </div>

      {/* Document Section */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Document</h3>
        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="bg-primary-100 p-2 rounded">
              <FileText className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{contract.fileName || 'Contract Document'}</p>
              {contract.fileSize && (
                <p className="text-xs text-gray-500">
                  {(contract.fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>

      {/* Signature Section */}
      {contract.status === ContractStatus.SIGNED && contract.signatureData && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Electronic Signature</h3>
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <img
              src={contract.signatureData}
              alt="Signature"
              className="max-w-md h-32 mx-auto"
            />
            <p className="text-center text-sm text-gray-600 mt-2">
              Signed by {contract.signerName} on {new Date(contract.signedDate!).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {isOwner && contract.status === ContractStatus.DRAFT && (
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
            {sending ? 'Sending...' : 'Send to Client'}
          </button>
        )}

        {canSign && (
          <button
            onClick={() => setShowSignModal(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
          >
            <Check className="h-5 w-5" />
            Sign Contract
          </button>
        )}
      </div>

      {/* Sign Modal */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Sign Contract</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Full Name *
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter your full name"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Signature *
              </label>
              <div className="border-2 border-gray-300 rounded-lg">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    className: 'w-full h-48 cursor-crosshair',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={clearSignature}
                className="mt-2 text-sm text-primary-600 hover:text-primary-700"
              >
                Clear Signature
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              By signing this document, you agree to the terms and conditions outlined in the contract.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSignModal(false)}
                disabled={signing}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSign}
                disabled={signing}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signing ? 'Signing...' : 'Sign & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
