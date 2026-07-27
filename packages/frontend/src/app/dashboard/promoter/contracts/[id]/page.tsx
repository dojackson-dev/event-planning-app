'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import api from '@/lib/api'
import { ChevronLeft, Loader2, Send, ExternalLink, Download, RotateCcw, X, CheckCircle, FileText, Clock } from 'lucide-react'

interface ContractDetail {
  id: string
  contract_number: string
  title: string
  status: 'draft' | 'sent' | 'signed' | 'cancelled'
  contract_type: string | null
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  body: string | null
  file_url: string | null
  file_name: string | null
  notes: string | null
  sent_date: string | null
  signed_date: string | null
  signer_name: string | null
  viewed_at: string | null
  created_at: string
  updated_at: string
}

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-700',
  sent:      'bg-blue-100 text-blue-800',
  signed:    'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
}

export default function PromoterContractDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showBody, setShowBody] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(`/contracts/${id}`)
      .then(res => setContract(res.data))
      .catch(() => setError('Failed to load contract'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSend = async () => {
    setSending(true)
    setError('')
    try {
      const res = await api.post(`/contracts/${id}/send`)
      setContract(res.data)
      setSuccess('Contract sent to artist via email and SMS.')
      setTimeout(() => setSuccess(''), 5000)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to send contract')
    } finally {
      setSending(false)
    }
  }

  const handleCancel = async () => {
    setCancelling(true)
    setError('')
    try {
      const res = await api.patch(`/contracts/${id}`, { status: 'cancelled' })
      setContract(res.data)
      setConfirmCancel(false)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to cancel contract')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
  if (!contract) return <div className="p-8 text-center text-gray-500">Contract not found.</div>

  const canSend   = ['draft', 'sent'].includes(contract.status)
  const canCancel = contract.status !== 'cancelled' && contract.status !== 'signed'
  const contractUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/client-portal/contracts/${id}`

  const timeline = [
    { label: 'Created',  date: contract.created_at, icon: FileText },
    ...(contract.sent_date   ? [{ label: 'Sent to Artist', date: contract.sent_date, icon: Send }] : []),
    ...(contract.viewed_at   ? [{ label: 'Viewed by Artist', date: contract.viewed_at, icon: Clock }] : []),
    ...(contract.signed_date ? [{ label: `Signed by ${contract.signer_name ?? 'Artist'}`, date: contract.signed_date, icon: CheckCircle }] : []),
  ]

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-4 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard/promoter/contracts')} className="text-white/80 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">{contract.title}</h1>
              <p className="text-purple-200 text-sm">{contract.contract_number}</p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${STATUS_STYLES[contract.status] ?? 'bg-gray-100 text-gray-700'}`}>
            {contract.status}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {error   && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 flex-shrink-0" />{success}</div>}

        {/* Artist + Contract Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Artist</h3>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-900">{contract.client_name ?? '—'}</p>
              {contract.client_email && <p className="text-gray-500">{contract.client_email}</p>}
              {contract.client_phone && <p className="text-gray-500">{contract.client_phone}</p>}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Contract Info</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="text-gray-800 capitalize">{contract.contract_type?.replace(/_/g, ' ') ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-800">{new Date(contract.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              {contract.sent_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Sent</span>
                  <span className="text-gray-800">{new Date(contract.sent_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
              {contract.signed_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Signed</span>
                  <span className="text-green-700 font-medium">{new Date(contract.signed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Actions</h3>
          <div className="flex flex-wrap gap-3">
            {canSend && (
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {contract.status === 'sent' ? 'Resend to Artist' : 'Send to Artist'}
              </button>
            )}

            {contract.status === 'sent' && (
              <button
                onClick={() => { navigator.clipboard.writeText(contractUrl); setSuccess('Signing link copied to clipboard!'); setTimeout(() => setSuccess(''), 3000) }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                <ExternalLink className="w-4 h-4" />
                Copy Signing Link
              </button>
            )}

            {contract.file_url && (
              <a
                href={contract.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                Download File
              </a>
            )}

            {contract.body && (
              <button
                onClick={() => setShowBody(v => !v)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                <FileText className="w-4 h-4" />
                {showBody ? 'Hide' : 'View'} Contract
              </button>
            )}

            {canCancel && !confirmCancel && (
              <button
                onClick={() => setConfirmCancel(true)}
                className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 ml-auto"
              >
                <X className="w-4 h-4" />
                Cancel Contract
              </button>
            )}
            {confirmCancel && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-600">Cancel this contract?</span>
                <button onClick={handleCancel} disabled={cancelling} className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Yes, Cancel'}
                </button>
                <button onClick={() => setConfirmCancel(false)} className="px-3 py-1.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
                  Keep
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Contract body */}
        {showBody && contract.body && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Contract Document</h3>
              <button onClick={() => setShowBody(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div
              className="border border-gray-100 rounded-lg p-4 max-h-[600px] overflow-auto text-sm bg-gray-50"
              dangerouslySetInnerHTML={{ __html: contract.body }}
            />
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Timeline</h3>
          <ol className="relative border-l border-gray-200 space-y-4 ml-2">
            {timeline.map((item, i) => (
              <li key={i} className="ml-6">
                <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-purple-50 border border-purple-200">
                  <item.icon className="w-3 h-3 text-purple-500" />
                </span>
                <p className="text-sm font-medium text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400">{new Date(item.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Notes */}
        {contract.notes && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
            <p className="text-sm text-gray-600">{contract.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
