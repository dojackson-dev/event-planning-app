'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Crown, Users, MapPin, Wine, CheckCircle, XCircle,
  Camera, ArrowLeft, Loader2, Star, UserCheck, UserPlus,
  ChevronDown, ChevronUp, Clock,
} from 'lucide-react'
import api from '@/lib/api'

interface VipScanResult {
  success: boolean
  guests_checked_in: number
  total_capacity: number
  message: string
}

interface VipOrderInfo {
  id: string
  buyer_name: string | null
  buyer_email: string
  buyer_phone: string | null
  check_in_status: string
  guests_checked_in: number
  notes: string | null
  vip_packages: {
    name: string
    package_type: string
    capacity: number
    included_tickets: number
    table_label: string | null
    vip_sections?: { name: string } | null
  } | null
  vip_service_orders: {
    quantity: number
    status: string
    special_request: string | null
    vip_service_items: { name: string; category: string } | null
  }[]
}

export default function VipScannerPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null)
  const scanningRef = useRef(false)

  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [scanResult, setScanResult] = useState<VipScanResult | null>(null)
  const [orderInfo, setOrderInfo] = useState<VipOrderInfo | null>(null)
  const [scanError, setScanError] = useState('')
  const [checkInMode, setCheckInMode] = useState<'single' | 'full'>('single')
  const [showDetails, setShowDetails] = useState(true)
  const [manualQr, setManualQr] = useState('')

  const processQr = useCallback(async (qrCode: string) => {
    if (scanningRef.current) return
    scanningRef.current = true
    setLoading(true)
    setScanResult(null)
    setScanError('')
    setOrderInfo(null)

    try {
      // First look up the order details
      const orderRes = await api.get<VipOrderInfo>(`/vip/public/orders/qr/${encodeURIComponent(qrCode)}`)
      setOrderInfo(orderRes.data)

      // Then scan (check in)
      const scanRes = await api.post<VipScanResult>(`/vip/events/${eventId}/scan`, {
        qr_code: qrCode,
        check_in_mode: checkInMode,
      })
      setScanResult(scanRes.data)
    } catch (err: any) {
      setScanError(err.response?.data?.message || 'Invalid or unrecognized QR code')
    } finally {
      setLoading(false)
      setTimeout(() => { scanningRef.current = false }, 3000)
    }
  }, [eventId, checkInMode])

  const startScanner = async () => {
    const { Html5Qrcode } = await import('html5-qrcode')
    const scanner = new Html5Qrcode('vip-scanner-container')
    scannerRef.current = scanner
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 280, height: 280 } },
      (decodedText) => { processQr(decodedText) },
      undefined,
    )
    setStarted(true)
  }

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop()
      scannerRef.current = null
    }
    setStarted(false)
  }

  useEffect(() => {
    return () => { stopScanner() }
  }, [])

  const resetScan = () => {
    setScanResult(null)
    setScanError('')
    setOrderInfo(null)
    setManualQr('')
    scanningRef.current = false
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/dashboard/promoter/events/${eventId}/vip/orders`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> VIP Orders
        </Link>
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          <span className="font-bold text-gray-900">VIP Door Scanner</span>
        </div>
      </div>

      {/* Check-in mode toggle */}
      <div className="flex gap-2 mb-5">
        {[
          { value: 'single', label: '+1 Guest', icon: UserPlus },
          { value: 'full', label: 'Full Group', icon: Users },
        ].map(mode => (
          <button
            key={mode.value}
            onClick={() => setCheckInMode(mode.value as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
              checkInMode === mode.value
                ? 'border-purple-600 bg-purple-600 text-white'
                : 'border-gray-200 text-gray-600 hover:border-purple-300'
            }`}
          >
            <mode.icon className="w-4 h-4" />
            {mode.label}
          </button>
        ))}
      </div>

      {/* Scanner */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden mb-5">
        <div id="vip-scanner-container" className="w-full" style={{ minHeight: started ? '300px' : '0' }} />
        {!started && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Camera className="w-12 h-12 text-gray-500" />
            <button
              onClick={startScanner}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
            >
              <Camera className="w-5 h-5" /> Start Camera
            </button>
          </div>
        )}
        {started && (
          <button
            onClick={stopScanner}
            className="w-full py-3 text-sm text-gray-400 hover:text-white hover:bg-gray-800"
          >
            Stop Camera
          </button>
        )}
      </div>

      {/* Manual QR input */}
      <div className="flex gap-2 mb-6">
        <input
          value={manualQr}
          onChange={e => setManualQr(e.target.value)}
          placeholder="Paste QR code manually..."
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
          onKeyDown={e => e.key === 'Enter' && manualQr && processQr(manualQr)}
        />
        <button
          onClick={() => manualQr && processQr(manualQr)}
          disabled={!manualQr || loading}
          className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Scan'}
        </button>
      </div>

      {/* Result */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      )}

      {scanError && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
          <XCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <p className="font-semibold text-red-700 text-lg">Invalid QR Code</p>
          <p className="text-red-600 text-sm mt-1">{scanError}</p>
          <button onClick={resetScan} className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm hover:bg-red-200">
            Try Again
          </button>
        </div>
      )}

      {scanResult && orderInfo && !loading && (
        <div className={`rounded-2xl border-2 overflow-hidden ${scanResult.success ? 'border-green-400' : 'border-red-400'}`}>
          {/* Status banner */}
          <div className={`p-4 flex items-center gap-3 ${scanResult.success ? 'bg-green-500' : 'bg-red-500'}`}>
            {scanResult.success
              ? <CheckCircle className="w-6 h-6 text-white" />
              : <XCircle className="w-6 h-6 text-white" />}
            <div>
              <p className="font-bold text-white text-lg">{scanResult.success ? 'ADMITTED' : 'DENIED'}</p>
              <p className="text-white/80 text-sm">{scanResult.message}</p>
            </div>
            <div className="ml-auto text-right">
              <div className="text-white font-bold text-2xl">{scanResult.guests_checked_in}/{scanResult.total_capacity}</div>
              <div className="text-white/80 text-xs">guests in</div>
            </div>
          </div>

          {/* Guest details */}
          <div className="bg-white p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="w-5 h-5 text-purple-500" />
                  <span className="font-bold text-gray-900 text-lg">{orderInfo.buyer_name || orderInfo.buyer_email}</span>
                </div>
                {orderInfo.buyer_phone && <p className="text-sm text-gray-500">{orderInfo.buyer_phone}</p>}
              </div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {showDetails && (
              <div className="space-y-3">
                {/* Package */}
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <span className="font-semibold text-gray-800">{orderInfo.vip_packages?.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    {orderInfo.vip_packages?.table_label && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{orderInfo.vip_packages.table_label}</span>
                    )}
                    {orderInfo.vip_packages?.vip_sections?.name && (
                      <span>{orderInfo.vip_packages.vip_sections.name}</span>
                    )}
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{orderInfo.vip_packages?.capacity} guests max</span>
                    {(orderInfo.vip_packages?.included_tickets ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-green-600"><Star className="w-3 h-3" />{orderInfo.vip_packages?.included_tickets} passes</span>
                    )}
                  </div>
                </div>

                {/* Service items */}
                {orderInfo.vip_service_orders.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add-ons</p>
                    <div className="space-y-1">
                      {orderInfo.vip_service_orders.map((so, i) => (
                        <div key={i} className="text-sm">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Wine className="w-3 h-3 text-purple-400" />
                              {so.vip_service_items?.name} ×{so.quantity}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${so.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {so.status}
                            </span>
                          </div>
                          {so.special_request && (
                            <p className="mt-0.5 ml-5 text-xs text-blue-700 bg-blue-50 rounded px-2 py-0.5">Request: {so.special_request}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {orderInfo.notes && (
                  <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-800">
                    <span className="font-medium">Note: </span>{orderInfo.notes}
                  </div>
                )}
              </div>
            )}

            <button onClick={resetScan} className="mt-4 w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
              Scan Next Guest
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
