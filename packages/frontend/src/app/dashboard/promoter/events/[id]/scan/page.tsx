'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Camera, ArrowLeft, Loader2 } from 'lucide-react'
import api from '@/lib/api'

type ScanResult = {
  valid: boolean
  reason: string
  ticket: {
    id: string
    status: string
    buyer_phone: string | null
    buyer_email: string | null
    amount_paid: number
    ticket_tiers: { name: string } | null
  } | null
}

export default function DoorScannerPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const router = useRouter()
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null)
  const scanningRef = useRef(false)
  const [started, setStarted] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [eventTitle, setEventTitle] = useState('')

  useEffect(() => {
    api.get(`/promoter-events/${eventId}`)
      .then(r => setEventTitle(r.data.title || ''))
      .catch(() => {})
  }, [eventId])

  const processTicket = useCallback(async (ticketId: string) => {
    if (scanningRef.current) return
    scanningRef.current = true
    setLoading(true)

    try {
      const { data } = await api.post<ScanResult>(
        `/promoter-events/${eventId}/scan-ticket`,
        { ticket_id: ticketId },
      )
      setResult(data)
    } catch (e: any) {
      setResult({ valid: false, reason: e.response?.data?.message || 'Error scanning ticket', ticket: null })
    } finally {
      setLoading(false)
      // auto-clear after 4 seconds, then re-enable scanning
      setTimeout(() => {
        setResult(null)
        scanningRef.current = false
      }, 4000)
    }
  }, [eventId])

  const startScanner = useCallback(async () => {
    const { Html5Qrcode } = await import('html5-qrcode')
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner
    setStarted(true)

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => { processTicket(decodedText) },
        () => {},
      )
    } catch {
      setError('Could not access camera. Please allow camera permissions.')
      setStarted(false)
    }
  }, [processTicket])

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      scannerRef.current = null
    }
    setStarted(false)
  }, [])

  useEffect(() => {
    return () => { stopScanner() }
  }, [stopScanner])

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-gray-800 border-b border-gray-700">
        <button onClick={() => { stopScanner(); router.back() }} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs text-gray-400">Door Scanner</p>
          <p className="font-semibold text-sm truncate max-w-[220px]">{eventTitle || 'Event'}</p>
        </div>
        <Camera className="w-5 h-5 ml-auto text-gray-400" />
      </div>

      {/* Scanner viewport */}
      <div className="flex-1 flex flex-col items-center justify-start pt-6 px-4 gap-5">

        {/* QR reader container — always in DOM once started */}
        <div className="w-full max-w-sm relative">
          <div
            id="qr-reader"
            className="rounded-xl overflow-hidden"
            style={{ width: '100%', minHeight: started ? 300 : 0 }}
          />
          {started && loading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
              <Loader2 className="w-10 h-10 animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Result overlay */}
        {result && !loading && (
          <div className={`w-full max-w-sm rounded-2xl p-5 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${result.valid ? 'bg-green-600' : 'bg-red-600'}`}>
            {result.valid
              ? <CheckCircle className="w-14 h-14" />
              : <XCircle className="w-14 h-14" />
            }
            <p className="text-2xl font-bold">{result.valid ? 'VALID' : 'DENIED'}</p>
            <p className="text-base opacity-90">{result.reason}</p>
            {result.ticket && (
              <div className="bg-white/20 rounded-xl px-4 py-3 w-full text-sm space-y-1">
                <p><span className="opacity-70">Tier: </span><span className="font-semibold">{result.ticket.ticket_tiers?.name ?? 'General'}</span></p>
                {result.ticket.buyer_phone && <p><span className="opacity-70">Phone: </span>{result.ticket.buyer_phone}</p>}
                <p><span className="opacity-70">Paid: </span>${Number(result.ticket.amount_paid).toFixed(2)}</p>
                <p><span className="opacity-70">Status: </span>{result.ticket.status}</p>
              </div>
            )}
            <p className="text-xs opacity-60 mt-1">Auto-clearing in 4s…</p>
          </div>
        )}

        {/* Start / Stop button */}
        {!started && !error && (
          <button
            onClick={startScanner}
            className="mt-4 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold px-8 py-4 rounded-2xl text-lg flex items-center gap-3"
          >
            <Camera className="w-6 h-6" />
            Start Scanning
          </button>
        )}

        {started && !loading && !result && (
          <div className="text-center text-gray-400 text-sm">
            <p>Point camera at a ticket QR code</p>
          </div>
        )}

        {started && (
          <button
            onClick={stopScanner}
            className="mt-2 text-gray-400 hover:text-white text-sm underline"
          >
            Stop Scanner
          </button>
        )}

        {error && (
          <div className="w-full max-w-sm bg-red-900/50 border border-red-500 rounded-xl p-4 text-center">
            <p className="text-red-300 text-sm">{error}</p>
            <button onClick={() => setError('')} className="mt-2 text-xs text-gray-400 underline">Dismiss</button>
          </div>
        )}
      </div>
    </div>
  )
}
