'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Contract, ContractStatus } from '@/types'
import SignatureCanvas from 'react-signature-canvas'
import { Download, Send, FileText, Check, X as XIcon, Eye } from 'lucide-react'

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
    const url = (contract as any)?.file_url ?? contract?.fileUrl
    if (url) {
      window.open(url, '_blank')
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

  const c = contract as any // raw snake_case from API
  const isOwner = user?.role === 'owner' && user?.id === (c.owner_id ?? contract.ownerId)
  const isClient = user?.id === (c.client_id ?? contract.clientId)
  const canSign = isClient && (c.status === 'sent' || contract.status === ContractStatus.SENT)

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
          <p className="text-gray-600 mt-1">Contract #{c.contract_number ?? contract.contractNumber}</p>
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
              {c.client_name ?? (contract.client
                ? `${contract.client.firstName} ${contract.client.lastName}`
                : 'N/A')}
            </p>
            <p className="text-sm text-gray-500">{c.client_email ?? contract.client?.email}</p>
            {c.client_phone && <p className="text-sm text-gray-500">{c.client_phone}</p>}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Owner</h3>
            <p className="mt-1 text-gray-900">
              {c.owner_name ?? (contract.owner
                ? `${contract.owner.firstName} ${contract.owner.lastName}`
                : 'N/A')}
            </p>
            <p className="text-sm text-gray-500">{c.owner_email ?? ''}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Created Date</h3>
            <p className="mt-1 text-gray-900">
              {new Date(c.created_at ?? contract.createdAt).toLocaleDateString()}
            </p>
          </div>

          {(c.sent_date ?? contract.sentDate) && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Sent Date</h3>
              <p className="mt-1 text-gray-900">
                {new Date(c.sent_date ?? contract.sentDate!).toLocaleDateString()}
              </p>
            </div>
          )}

          {(c.signed_date ?? contract.signedDate) && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Signed Date</h3>
              <p className="mt-1 text-gray-900">
                {new Date(c.signed_date ?? contract.signedDate!).toLocaleDateString()}
              </p>
            </div>
          )}

          {(c.signer_name ?? contract.signerName) && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Signed By</h3>
              <p className="mt-1 text-gray-900">{c.signer_name ?? contract.signerName}</p>
            </div>
          )}

          {c.viewed_at && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> Client Viewed
              </h3>
              <p className="mt-1 text-emerald-700 font-medium">
                {new Date(c.viewed_at).toLocaleString()}
              </p>
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
              <p className="text-sm font-medium text-gray-900">{c.file_name ?? contract.fileName ?? 'Contract Document'}</p>
              {(c.file_size ?? contract.fileSize) && (
                <p className="text-xs text-gray-500">
                  {((c.file_size ?? contract.fileSize!) / 1024 / 1024).toFixed(2)} MB
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
      {contract.status === ContractStatus.SIGNED && (c.signature_data ?? contract.signatureData) && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Electronic Signature</h3>
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <img
              src={c.signature_data ?? contract.signatureData}
              alt="Signature"
              className="max-w-md h-32 mx-auto"
            />
            <p className="text-center text-sm text-gray-600 mt-2">
              Signed by {c.signer_name ?? contract.signerName} on {new Date(c.signed_date ?? contract.signedDate!).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {isOwner && (c.status === 'draft' || contract.status === ContractStatus.DRAFT) && (
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto p-4">
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
