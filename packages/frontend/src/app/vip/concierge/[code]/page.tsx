'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import api from '@/lib/api'
import {
  Crown, Users, Wine, Loader2, CheckCircle, Clock,
  Phone, RefreshCw, Package, Star, MapPin, Camera, XCircle, ScanLine,
} from 'lucide-react'

interface EventInfo {
  id: string
  title: string
  event_date: string
  venue_name: string | null
  city: string | null
}

interface ServiceOrder {
  quantity: number
  status: string
  special_request: string | null
  vip_service_items: { name: string } | null
}

interface VipOrder {
  id: string
  buyer_name: string | null
  buyer_phone: string | null
  check_in_status: string
  guests_checked_in: number
  created_at: string
  vip_packages: {
    name: string
    package_type: string
    capacity: number
    table_label: string | null
    vip_sections: { name: string } | null
  } | null
  vip_service_orders: ServiceOrder[]
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  partial: 'bg-yellow-100 text-yellow-700',
  checked_in: 'bg-green-100 text-green-700',
}

export default function ConciergePortalPage({ params }: { params: { code: string } }) {
  const { code } = params
  const [conciergeName, setConciergeName] = useState('')
  const [event, setEvent] = useState<EventInfo | null>(null)
  const [orders, setOrders] = useState<VipOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<'list' | 'scan'>('list')
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; buyerName?: string } | null>(null)
  const [scanError, setScanError] = useState('')
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef<any>(null)
  const scannerDivId = 'vip-concierge-qr-reader'

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/vip/public/concierge/${code}`)
      setConciergeName(res.data.concierge?.name || '')
      setEvent(res.data.event)
      setOrders(res.data.orders || [])
      setLastRefresh(new Date())
    } catch {
      setError('Invalid or expired access code.')
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { load() }, 30000)
    return () => clearInterval(interval)
  }, [load])

  const startScanner = useCallback(async () => {
    setScanResult(null)
    setScanError('')
    setScanning(true)
    const { Html5Qrcode } = await import('html5-qrcode')
    const qr = new Html5Qrcode(scannerDivId)
    scannerRef.current = qr
    try {
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await qr.stop()
          setScanning(false)
          scannerRef.current = null
          try {
            const res = await api.post(`/vip/public/concierge/${code}/scan`, {
              qr_code: decodedText,
              check_in_mode: 'single',
            })
            setScanResult({
              success: true,
              message: res.data.message,
              buyerName: res.data.order?.buyer_name ?? undefined,
            })
            load()
          } catch (err: any) {
            const msg = err?.response?.data?.message || 'QR code not recognized'
            setScanResult({ success: false, message: msg })
          }
        },
        () => { /* qr errors silenced */ },
      )
    } catch {
      setScanning(false)
      setScanError('Camera access denied. Please allow camera permissions and try again.')
    }
  }, [code, load])

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch { /* ignore */ }
      scannerRef.current = null
    }
    setScanning(false)
  }, [])

  // Stop scanner when switching away from scan tab
  useEffect(() => {
    if (activeTab !== 'scan') { stopScanner() }
  }, [activeTab, stopScanner])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Crown className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  const checkedIn = orders.filter(o => o.check_in_status === 'checked_in').length
  const pending = orders.filter(o => o.check_in_status === 'pending' || o.check_in_status === 'partial').length

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
          <Crown className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">VIP Concierge Portal</h1>
          {conciergeName && <p className="text-sm text-gray-500">Welcome, {conciergeName}</p>}
        </div>
      </div>

      {event && (
        <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
          <h2 className="font-semibold text-gray-900">{event.title}</h2>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
            {event.event_date && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
            {event.venue_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.venue_name}{event.city ? `, ${event.city}` : ''}</span>}
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${activeTab === 'list' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200'}`}
        >
          <Users className="w-4 h-4 inline mr-1" />Guest List
        </button>
        <button
          onClick={() => setActiveTab('scan')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${activeTab === 'scan' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200'}`}
        >
          <ScanLine className="w-4 h-4 inline mr-1" />Scan QR
        </button>
      </div>

      {activeTab === 'scan' && (
        <div className="mb-6">
          <div id={scannerDivId} className="rounded-xl overflow-hidden" />
          {!scanning && !scanResult && (
            <button
              onClick={startScanner}
              className="w-full mt-4 py-3 bg-purple-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />Start Camera
            </button>
          )}
          {scanning && (
            <button
              onClick={stopScanner}
              className="w-full mt-4 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />Cancel
            </button>
          )}
          {scanError && (
            <p className="mt-3 text-sm text-red-600 text-center">{scanError}</p>
          )}
          {scanResult && (
            <div className={`mt-4 p-4 rounded-xl border text-center ${scanResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {scanResult.success ? (
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              ) : (
                <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              )}
              {scanResult.buyerName && <p className="font-semibold text-gray-900">{scanResult.buyerName}</p>}
              <p className={`text-sm font-medium ${scanResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {scanResult.success ? 'CHECKED IN' : 'DENIED'}
              </p>
              <p className="text-xs text-gray-500 mt-1">{scanResult.message}</p>
              <button
                onClick={() => { setScanResult(null); startScanner() }}
                className="mt-3 px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm"
              >
                Scan Next
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'list' && (<>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{orders.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total VIP</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{checkedIn}</div>
          <div className="text-xs text-green-600 mt-0.5">Checked In</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-yellow-700">{pending}</div>
          <div className="text-xs text-yellow-600 mt-0.5">Awaiting</div>
        </div>
      </div>

      {/* Refresh */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">VIP Bookings</h3>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-gray-400">
              Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={load}
            className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 px-2 py-1 border border-purple-200 rounded-lg"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Crown className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No VIP bookings yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const isCheckedIn = order.check_in_status === 'checked_in'
            const isPartial = order.check_in_status === 'partial'
            return (
              <div
                key={order.id}
                className={`rounded-xl border p-4 ${
                  isCheckedIn ? 'border-green-200 bg-green-50' : isPartial ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{order.buyer_name || 'Guest'}</span>
                      {isCheckedIn && <CheckCircle className="w-4 h-4 text-green-600" />}
                    </div>
                    {order.buyer_phone && (
                      <a href={`tel:${order.buyer_phone}`} className="text-xs text-purple-600 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />{order.buyer_phone}
                      </a>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.check_in_status] || 'bg-gray-100 text-gray-600'}`}>
                    {isCheckedIn ? 'Arrived' : isPartial ? `${order.guests_checked_in} checked in` : 'Pending'}
                  </span>
                </div>

                {order.vip_packages && (
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-2">
                    <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3" />{order.vip_packages.name}
                    </span>
                    {order.vip_packages.table_label && (
                      <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                        <MapPin className="w-3 h-3" />{order.vip_packages.table_label}
                      </span>
                    )}
                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                      <Users className="w-3 h-3" />Party of {order.vip_packages.capacity}
                    </span>
                    {order.vip_packages.vip_sections && (
                      <span className="bg-gray-100 px-2 py-0.5 rounded-full">{order.vip_packages.vip_sections.name}</span>
                    )}
                  </div>
                )}

                {order.vip_service_orders.length > 0 && (
                  <div className="border-t border-gray-100 pt-2 mt-2">
                    <p className="text-xs text-gray-400 mb-1">Service Items</p>
                    <div className="space-y-1">
                      {order.vip_service_orders.map((so, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                          <Wine className="w-3 h-3 text-purple-400" />
                          <span>{so.vip_service_items?.name} ×{so.quantity}</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-500 capitalize">{so.status}</span>
                          {so.special_request && (
                            <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">"{so.special_request}"</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      </>)}

      <p className="text-center text-xs text-gray-300 mt-8">Auto-refreshes every 30 seconds · VIP Concierge Portal</p>
    </div>
  )
}
