'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import {
  ArrowLeft, FileText, CheckCircle2, PenLine, Send, X,
  Loader2, Clock, Mail, UserCheck,
} from 'lucide-react'

interface VendorContract {
  id: string
  title: string
  contract_number: string
  status: string
  description?: string
  body?: string
  file_url?: string
  contract_type?: string
  sent_date?: string
  signed_date?: string
  signer_name?: string
  signature_data?: string
  created_at: string
  client_name?: string
  client_email?: string
  owner_id?: string
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft:  { label: 'Draft',  cls: 'bg-gray-100 text-gray-600' },
    sent:   { label: 'Sent',   cls: 'bg-blue-100 text-blue-700' },
    viewed: { label: 'Viewed', cls: 'bg-yellow-100 text-yellow-700' },
    signed: { label: 'Signed', cls: 'bg-green-100 text-green-700' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}

export default function VendorContractsPage() {
  const router = useRouter()
  const [contracts, setContracts] = useState<VendorContract[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContract, setSelectedContract] = useState<VendorContract | null>(null)

  // Sign modal state
  const [showSignModal, setShowSignModal] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [hasSigned, setHasSigned] = useState(false)
  const [signing, setSigning] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  // Send state
  const [sending, setSending] = useState<'client' | 'owner' | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.replace('/vendors/login'); return }

    api.get('/contracts/vendor/mine')
      .then(res => setContracts(res.data || []))
      .catch(err => {
        if (err.response?.status === 401) router.push('/vendors/login')
      })
      .finally(() => setLoading(false))

    // Pre-fill signer name from stored profile
    try {
      const storedName = localStorage.getItem('vendor_business_name') || ''
      if (storedName) setSignerName(storedName)
    } catch { /* ignore */ }
  }, [router])

  // ── Canvas drawing helpers ────────────────────────────────────────────────
  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return
    drawing.current = true
    lastPos.current = getPos(e, canvas)
  }
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return
    const canvas = canvasRef.current; if (!canvas) return
    e.preventDefault()
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.beginPath(); ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.moveTo(lastPos.current?.x ?? pos.x, lastPos.current?.y ?? pos.y)
    ctx.lineTo(pos.x, pos.y); ctx.stroke()
    lastPos.current = pos
    setHasSigned(true)
  }
  const endDraw = () => { drawing.current = false; lastPos.current = null }
  const clearSig = () => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSign = async () => {
    if (!signerName.trim()) { alert('Please enter your full legal name.'); return }
    if (!hasSigned || !canvasRef.current) { alert('Please draw your signature.'); return }
    if (!selectedContract) return
    setSigning(true)
    try {
      const signatureData = canvasRef.current.toDataURL('image/png')
      const res = await api.post(`/contracts/${selectedContract.id}/vendor-sign`, {
        signatureData,
        signerName: signerName.trim(),
      })
      const updated = res.data
      setContracts(prev => prev.map(c => c.id === updated.id ? updated : c))
      setSelectedContract(updated)
      setShowSignModal(false)
      setHasSigned(false)
      alert('Contract signed! The coordinator has been notified.')
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to sign. Please try again.')
    } finally {
      setSigning(false)
    }
  }

  const handleSend = async (sendTo: 'client' | 'owner') => {
    if (!selectedContract) return
    setSending(sendTo)
    try {
      const res = await api.post(`/contracts/${selectedContract.id}/vendor-send`, { sendTo })
      const updated = res.data
      setContracts(prev => prev.map(c => c.id === updated.id ? updated : c))
      setSelectedContract(updated)
      alert(sendTo === 'client'
        ? 'Contract sent to the client via email & SMS.'
        : 'Contract forwarded to the venue owner via email.')
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to send. Please try again.')
    } finally {
      setSending(null)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  // ── Contract detail view ──────────────────────────────────────────────────
  if (selectedContract) {
    const c = selectedContract
    const isSent   = c.status === 'sent' || c.status === 'viewed'
    const isSigned = c.status === 'signed'

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <button
            onClick={() => setSelectedContract(null)}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Contracts
          </button>

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{c.title ?? 'Contract'}</h1>
              {c.contract_number && <p className="text-sm text-gray-400 mt-0.5">#{c.contract_number}</p>}
              {c.description && <p className="text-sm text-gray-600 mt-2">{c.description}</p>}
            </div>
            <StatusBadge status={c.status} />
          </div>

          {/* Contract body (template) */}
          {c.body && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Contract Document</h2>
              <div
                className="prose prose-sm max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: c.body }}
              />
            </div>
          )}

          {/* File download (upload-type) */}
          {!c.body && c.file_url && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Contract Document</h2>
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-50 p-2 rounded-lg">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-800">Contract Document</span>
                </div>
                <a
                  href={c.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                >
                  View / Download
                </a>
              </div>
            </div>
          )}

          {/* Send actions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Send Contract</h2>
            <p className="text-sm text-gray-600 mb-4">
              Send this contract to the client for their records, or forward it to the venue owner for review.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleSend('client')}
                disabled={sending !== null}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {sending === 'client' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Send to Client
              </button>
              <button
                onClick={() => handleSend('owner')}
                disabled={sending !== null}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {sending === 'owner' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                Send to Owner
              </button>
            </div>
          </div>

          {/* Signed confirmation */}
          {isSigned && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-900">Contract Signed</p>
                  <p className="text-sm text-green-700">
                    Signed by {c.signer_name} on {new Date(c.signed_date!).toLocaleString()}
                  </p>
                </div>
              </div>
              {c.signature_data && (
                <div className="border border-green-200 rounded-lg bg-white p-3 mt-2">
                  <p className="text-xs text-gray-400 mb-2">Signature on file:</p>
                  <img src={c.signature_data} alt="Signature" className="max-h-24 max-w-full mx-auto" />
                </div>
              )}
            </div>
          )}

          {/* Sign action */}
          {(isSent || c.status === 'draft') && !isSigned && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <PenLine className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-blue-900">Signature Required</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Please review the contract above, then sign to confirm your agreement.
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
        </div>

        {/* ── Sign Modal ─────────────────────────────────────────────────── */}
        {showSignModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Your Full Legal Name *
                  </label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={e => setSignerName(e.target.value)}
                    placeholder="Enter your full legal name"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Draw Your Signature *
                  </label>
                  <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50 touch-none">
                    <canvas
                      ref={canvasRef}
                      width={440}
                      height={160}
                      className="w-full touch-none cursor-crosshair"
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={endDraw}
                      onMouseLeave={endDraw}
                      onTouchStart={startDraw}
                      onTouchMove={draw}
                      onTouchEnd={endDraw}
                    />
                  </div>
                  <button
                    onClick={clearSig}
                    className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    Clear signature
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  By signing, you agree to the terms of this contract. Your electronic signature is legally binding.
                </p>
                <button
                  onClick={handleSign}
                  disabled={signing || !hasSigned || !signerName.trim()}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {signing ? <><Loader2 className="h-4 w-4 animate-spin" />Signing…</> : <><PenLine className="h-4 w-4" />Sign &amp; Submit</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Contract list ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/vendors/dashboard"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Link>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Contracts</h1>
          <p className="text-sm text-gray-500 mt-1">Contracts sent to you by the venue. Sign and forward as needed.</p>
        </div>

        {contracts.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No contracts yet</p>
            <p className="text-sm text-gray-400 mt-1">
              When the venue owner creates a contract for you, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map(c => (
              <button
                key={c.id}
                onClick={() => { setSelectedContract(c); window.scrollTo(0, 0) }}
                className="w-full bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-left hover:border-primary-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{c.title ?? 'Contract'}</p>
                      {c.contract_number && (
                        <p className="text-xs text-gray-400 mt-0.5">#{c.contract_number}</p>
                      )}
                      {c.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{c.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                        {c.sent_date && (
                          <span className="flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            Sent {new Date(c.sent_date).toLocaleDateString()}
                          </span>
                        )}
                        {c.signed_date && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            Signed {new Date(c.signed_date).toLocaleDateString()}
                          </span>
                        )}
                        {!c.sent_date && !c.signed_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
