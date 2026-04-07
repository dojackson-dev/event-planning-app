'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import clientApi from '@/lib/clientApi'
import {
  ArrowLeft, FileText, Download, CheckCircle2, Clock, Send,
  PenLine, X, Loader2,
} from 'lucide-react'

// Dynamically import SignatureCanvas to avoid SSR issues
const SignatureCanvas = dynamic(() => import('react-signature-canvas'), { ssr: false }) as any

export default function ClientContractDetailPage() {
  const params = useParams()
  const router = useRouter()
  const contractId = params.id as string

  const [contract, setContract] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showSignModal, setShowSignModal] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [signing, setSigning] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)
  const sigRef = useRef<any>(null)

  // Pre-fill signer name from session
  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem('client_session') || '{}')
      if (session.firstName || session.lastName) {
        setSignerName(`${session.firstName ?? ''} ${session.lastName ?? ''}`.trim())
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    clientApi.get(`/contracts/${contractId}`)
      .then((res) => setContract(res.data))
      .catch(() => router.push('/client-portal/contracts'))
      .finally(() => setLoading(false))
  }, [contractId])

  const handleSign = async () => {
    if (!signerName.trim()) {
      alert('Please enter your full name.')
      return
    }
    if (!hasSigned || !sigRef.current) {
      alert('Please draw your signature.')
      return
    }
    setSigning(true)
    try {
      const signatureData = sigRef.current.toDataURL('image/png')
      const res = await clientApi.post(`/contracts/${contractId}/sign`, {
        signatureData,
        signerName: signerName.trim(),
      })
      setContract(res.data)
      setShowSignModal(false)
      setHasSigned(false)
      alert('Contract signed successfully! Your coordinator has been notified.')
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to sign contract. Please try again.')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!contract) return null

  const isSent = contract.status === 'sent'
  const isSigned = contract.status === 'signed'
  const fileUrl = contract.file_url ?? contract.fileUrl

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push('/client-portal/contracts')}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Contracts
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{contract.title ?? 'Contract'}</h1>
          {contract.contract_number && (
            <p className="text-sm text-gray-400 mt-0.5">#{contract.contract_number}</p>
          )}
          {contract.description && (
            <p className="text-sm text-gray-600 mt-2">{contract.description}</p>
          )}
        </div>
        <StatusBadge status={contract.status} />
      </div>

      {/* Document */}
      {fileUrl && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Contract Document</h2>
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary-50 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-primary-600" />
              </div>
              <span className="text-sm font-medium text-gray-800">
                {contract.file_name ?? contract.fileName ?? 'Contract Document'}
              </span>
            </div>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
            >
              <Download className="h-4 w-4" />
              View / Download
            </a>
          </div>
        </div>
      )}

      {/* Signed confirmation */}
      {isSigned && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900">Contract Signed</p>
              <p className="text-sm text-green-700">
                Signed by {contract.signer_name ?? contract.signerName} on{' '}
                {new Date(contract.signed_date ?? contract.signedDate).toLocaleString()}
              </p>
            </div>
          </div>
          {(contract.signature_data ?? contract.signatureData) && (
            <div className="border border-green-200 rounded-lg bg-white p-3 mt-2">
              <p className="text-xs text-gray-400 mb-2">Signature on file:</p>
              <img
                src={contract.signature_data ?? contract.signatureData}
                alt="Signature"
                className="max-h-24 max-w-full mx-auto"
              />
            </div>
          )}
        </div>
      )}

      {/* Sign action */}
      {isSent && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <PenLine className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-blue-900">Signature Required</p>
              <p className="text-sm text-blue-700 mt-1">
                Please review the document above, then sign below to confirm your agreement.
              </p>
              <button
                onClick={() => { setShowSignModal(true); setHasSigned(false) }}
                className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm"
              >
                <PenLine className="h-4 w-4" />
                Sign Contract
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Sign Contract</h2>
              <button
                onClick={() => { setShowSignModal(false); setHasSigned(false) }}
                disabled={signing}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Your Full Legal Name *
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>

              {/* Signature pad */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">Your Signature *</label>
                  <button
                    type="button"
                    onClick={() => { sigRef.current?.clear(); setHasSigned(false) }}
                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    Clear
                  </button>
                </div>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden"
                  onPointerUp={() => { if (sigRef.current && !sigRef.current.isEmpty()) setHasSigned(true) }}
                  onTouchEnd={() => { if (sigRef.current && !sigRef.current.isEmpty()) setHasSigned(true) }}
                >
                  <SignatureCanvas
                    ref={sigRef}
                    penColor="#1e293b"
                    canvasProps={{
                      className: 'w-full',
                      style: { height: '160px' },
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Draw your signature above using your mouse or finger.</p>
              </div>

              {/* Legal notice */}
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-200">
                By clicking &ldquo;Sign &amp; Submit&rdquo; you agree that your electronic signature is legally binding
                and constitutes your acceptance of all terms and conditions in this contract.
              </p>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => { setShowSignModal(false); setHasSigned(false) }}
                disabled={signing}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSign}
                disabled={signing || !hasSigned || !signerName.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Signing...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Sign &amp; Submit</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    draft:     { label: 'Draft',     className: 'bg-gray-100 text-gray-600 border-gray-200',   icon: <FileText className="h-3.5 w-3.5" /> },
    sent:      { label: 'Awaiting Signature', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Clock className="h-3.5 w-3.5" /> },
    signed:    { label: 'Signed',    className: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-200',       icon: <X className="h-3.5 w-3.5" /> },
  }
  const cfg = configs[status] ?? configs.draft
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border flex-shrink-0 ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}
