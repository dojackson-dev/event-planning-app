'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { ContractStatus } from '@/types'
import { 
  FileText, 
  Download, 
  Eye, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Pen,
  Send,
  Calendar,
  User,
  Building2,
  FileCheck
} from 'lucide-react'

interface Contract {
  id: string
  contract_number: string
  title: string
  event_type: string
  event_date: string
  venue_name: string
  status: ContractStatus
  created_at: string
  signed_at?: string
  expires_at?: string
  total_amount: number
}

export default function CustomerContractsPage() {
  const [loading, setLoading] = useState(true)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [showSignModal, setShowSignModal] = useState(false)
  const [signature, setSignature] = useState('')

  useEffect(() => {
    fetchContracts()
  }, [])

  const fetchContracts = async () => {
    try {
      const response = await api.get('/contracts')
      setContracts(response.data || [])
    } catch (error) {
      console.error('Failed to fetch contracts:', error)
      // Set mock data for demo
      setContracts([
        {
          id: '1',
          contract_number: 'CNT-2024-001',
          title: 'Wedding Reception Event Contract',
          event_type: 'wedding_reception',
          event_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          venue_name: 'DoVenue Event Center - Grand Ballroom',
          status: ContractStatus.SENT,
          created_at: '2024-01-15',
          expires_at: '2024-02-15',
          total_amount: 8500
        },
        {
          id: '2',
          contract_number: 'CNT-2024-002',
          title: 'Birthday Party Event Contract',
          event_type: 'birthday_party',
          event_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          venue_name: 'DoVenue Event Center - Garden Room',
          status: ContractStatus.SIGNED,
          created_at: '2024-01-10',
          signed_at: '2024-01-12',
          total_amount: 2500
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const formatEventType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStatusStyle = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.SIGNED: return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Signed' }
      case ContractStatus.SENT: return { bg: 'bg-blue-100', text: 'text-blue-700', icon: Send, label: 'Awaiting Signature' }
      case ContractStatus.DRAFT: return { bg: 'bg-gray-100', text: 'text-gray-700', icon: FileText, label: 'Draft' }
      case ContractStatus.CANCELLED: return { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle, label: 'Cancelled' }
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', icon: FileText, label: status }
    }
  }

  const handleSignContract = async (contractId: string) => {
    if (!signature.trim()) {
      alert('Please enter your signature')
      return
    }
    
    try {
      // In a real app, this would send to API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setContracts(prev => prev.map(c => 
        c.id === contractId 
          ? { ...c, status: ContractStatus.SIGNED, signed_at: new Date().toISOString() }
          : c
      ))
      
      setShowSignModal(false)
      setSelectedContract(null)
      setSignature('')
      alert('Contract signed successfully!')
    } catch (error) {
      console.error('Failed to sign contract:', error)
      alert('Failed to sign contract. Please try again.')
    }
  }

  const pendingContracts = contracts.filter(c => c.status === ContractStatus.SENT)
  const signedContracts = contracts.filter(c => c.status === ContractStatus.SIGNED)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Contracts</h1>
        <p className="text-gray-500 mt-1">Review and sign your event contracts</p>
      </div>

      {/* Pending Signature Alert */}
      {pendingContracts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-4">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Pen className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900">Action Required</h3>
            <p className="text-blue-700 text-sm mt-1">
              You have {pendingContracts.length} contract{pendingContracts.length > 1 ? 's' : ''} awaiting your signature.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{contracts.length}</p>
              <p className="text-xs text-gray-500">Total Contracts</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingContracts.length}</p>
              <p className="text-xs text-gray-500">Pending Signature</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{signedContracts.length}</p>
              <p className="text-xs text-gray-500">Signed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <FileCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(contracts.reduce((sum, c) => sum + c.total_amount, 0))}
              </p>
              <p className="text-xs text-gray-500">Total Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contracts List */}
      {contracts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No contracts yet</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Once you book an event, your contracts will appear here for review and signature.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract) => {
            const status = getStatusStyle(contract.status)
            const StatusIcon = status.icon
            
            return (
              <div
                key={contract.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 bg-primary-100 rounded-xl p-4">
                      <FileText className="w-8 h-8 text-primary-600" />
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{contract.title}</h3>
                          <p className="text-sm text-gray-500">{contract.contract_number}</p>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text} self-start`}>
                          <StatusIcon className="w-4 h-4 mr-1.5" />
                          {status.label}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(contract.event_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="truncate">{contract.venue_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span>{formatEventType(contract.event_type)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <span>{formatCurrency(contract.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setSelectedContract(contract)}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    View Contract
                  </button>
                  <button
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Download PDF
                  </button>
                  {contract.status === ContractStatus.SENT && (
                    <button
                      onClick={() => {
                        setSelectedContract(contract)
                        setShowSignModal(true)
                      }}
                      className="inline-flex items-center px-4 py-1.5 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors ml-auto"
                    >
                      <Pen className="w-4 h-4 mr-1.5" />
                      Sign Contract
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Contract View Modal */}
      {selectedContract && !showSignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setSelectedContract(null)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedContract.title}</h2>
                    <p className="text-gray-500 mt-1">{selectedContract.contract_number}</p>
                  </div>
                  <button
                    onClick={() => setSelectedContract(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Status */}
                <div className="flex items-center gap-4">
                  {(() => {
                    const status = getStatusStyle(selectedContract.status)
                    const StatusIcon = status.icon
                    return (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}>
                        <StatusIcon className="w-4 h-4 mr-1.5" />
                        {status.label}
                      </span>
                    )
                  })()}
                  {selectedContract.signed_at && (
                    <span className="text-sm text-gray-500">
                      Signed on {formatDate(selectedContract.signed_at)}
                    </span>
                  )}
                </div>
                
                {/* Contract Details */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Event Type</h4>
                    <p className="text-gray-900">{formatEventType(selectedContract.event_type)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Event Date</h4>
                    <p className="text-gray-900">{formatDate(selectedContract.event_date)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Venue</h4>
                    <p className="text-gray-900">{selectedContract.venue_name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Contract Value</h4>
                    <p className="text-2xl font-bold text-primary-600">{formatCurrency(selectedContract.total_amount)}</p>
                  </div>
                </div>
                
                {/* Terms Preview */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Terms & Conditions (Preview)</h4>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>1. Event booking is confirmed upon signing this contract and receipt of deposit.</p>
                    <p>2. Final payment is due 7 days before the event date.</p>
                    <p>3. Cancellation within 30 days of event date forfeits deposit.</p>
                    <p>4. Guest count must be finalized 14 days before the event.</p>
                    <p className="text-gray-400">... Download PDF for full terms</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                  <Download className="w-5 h-5 mr-2" />
                  Download PDF
                </button>
                {selectedContract.status === ContractStatus.SENT && (
                  <button
                    onClick={() => setShowSignModal(true)}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                  >
                    <Pen className="w-5 h-5 mr-2" />
                    Sign Contract
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sign Contract Modal */}
      {showSignModal && selectedContract && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => { setShowSignModal(false); setSignature(''); }} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Sign Contract</h2>
                <p className="text-gray-500 mt-1">{selectedContract.contract_number}</p>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    By signing below, you agree to the terms and conditions outlined in this contract.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type your full legal name as signature
                  </label>
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg"
                    style={{ fontFamily: 'cursive' }}
                  />
                </div>
                
                {signature && (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500 mb-2">Your signature will appear as:</p>
                    <p className="text-2xl text-gray-900" style={{ fontFamily: 'cursive' }}>{signature}</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => { setShowSignModal(false); setSignature(''); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSignContract(selectedContract.id)}
                  disabled={!signature.trim()}
                  className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sign Contract
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
