'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Contract, ContractStatus } from '@/types'
import SignatureCanvas from 'react-signature-canvas'
import { Download, Send, FileText, Check, X as XIcon, Eye, Pencil } from 'lucide-react'

export default function ContractDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)
  const [showOwnerSignModal, setShowOwnerSignModal] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [ownerSignerName, setOwnerSignerName] = useState('')
  const [signing, setSigning] = useState(false)
  const [ownerSigning, setOwnerSigning] = useState(false)
  const signatureRef = useRef<SignatureCanvas>(null)
  const ownerSignatureRef = useRef<SignatureCanvas>(null)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({ title: '', description: '', notes: '', client_name: '', client_email: '' })
  const [venueEditData, setVenueEditData] = useState<any>({})
  const [vendorEditData, setVendorEditData] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  useEffect(() => {
    if (params.id) {
      fetchContract()
    }
  }, [params.id])

  useEffect(() => {
    if (user) {
      setSignerName(`${user.firstName} ${user.lastName}`)
      setOwnerSignerName(`${user.firstName} ${user.lastName}`)
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

  const handleOwnerSign = async () => {
    if (!contract || !ownerSignatureRef.current || ownerSignatureRef.current.isEmpty()) {
      alert('Please provide your signature')
      return
    }
    if (!ownerSignerName.trim()) {
      alert('Please enter your name')
      return
    }
    setOwnerSigning(true)
    try {
      const signatureData = ownerSignatureRef.current.toDataURL()
      await api.post(`/contracts/${contract.id}/owner-sign`, {
        signatureData,
        signerName: ownerSignerName.trim(),
      })
      setShowOwnerSignModal(false)
      fetchContract()
    } catch (error) {
      console.error('Failed to counter-sign contract:', error)
      alert('Failed to counter-sign contract')
    } finally {
      setOwnerSigning(false)
    }
  }

  const enterEditMode = () => {
    if (!contract) return
    const c = contract as any
    setEditData({
      title: contract.title || '',
      description: contract.description || '',
      notes: contract.notes || '',
      client_name: c.client_name || '',
      client_email: c.client_email || '',
    })
    if (c.contract_type === 'venue_booking') {
      const td = c.template_data || {}
      setVenueEditData({
        venueOwnerName: td.venueOwnerName || '',
        venueName: td.venueName || '',
        venueClientName: td.venueClientName || c.client_name || '',
        venueClientEmail: td.venueClientEmail || c.client_email || '',
        venueEventType: td.venueEventType || '',
        venueEventDate: td.venueEventDate || '',
        venueEventTime: td.venueEventTime || '',
        venueAccessWindow: td.venueAccessWindow || '',
        venueGuestCount: td.venueGuestCount || '',
        venueTotalAmount: td.venueTotalAmount || '',
        venueDeposit: td.venueDeposit || '',
        venueCancelMoreThan: td.venueCancelMoreThan || '30',
        venueCancelMoreThanPolicy: td.venueCancelMoreThanPolicy || 'Full refund minus processing fee',
        venueCancelWithin: td.venueCancelWithin || '30',
        venueCancelWithinPolicy: td.venueCancelWithinPolicy || 'Deposit non-refundable; remaining balance refunded',
        venueGoverningState: td.venueGoverningState || 'Mississippi',
      })
    } else if (c.contract_type === 'vendor_template') {
      const td = c.template_data || {}
      setVendorEditData({
        companyName: td.companyName || '',
        companyState: td.companyState || 'Mississippi',
        vendorName: td.vendorName || '',
        vendorState: td.vendorState || 'Mississippi',
        vendorEntityType: td.vendorEntityType || 'LLC',
        servicesDescription: td.servicesDescription || '',
        eventLocation: td.eventLocation || '',
        eventDates: td.eventDates || '',
        totalFee: td.totalFee || '',
        paymentTerms: td.paymentTerms || 'full',
        depositAmount: td.depositAmount || '',
        depositDueDate: td.depositDueDate || '',
        balanceDueDate: td.balanceDueDate || '',
        cancelRefundTerms: td.cancelRefundTerms || 'Non-refundable deposit; balance refunded if cancelled 14+ days before event',
        noticeDays: td.noticeDays || '7',
        startDate: td.startDate || '',
        endDate: td.endDate || '',
        governingState: td.governingState || 'Mississippi',
      })
    }
    setEditMode(true)
  }

  const handleSaveEdit = async () => {
    if (!contract) return
    const c = contract as any
    if (!editData.title.trim()) { alert('Title is required'); return }
    setSaving(true)
    try {
      let payload: any = { ...editData }
      if (c.contract_type === 'venue_booking') {
        const agreementDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        // Dynamically import generator from new page module isn't feasible here — inline the call via API
        payload.template_data = venueEditData
        payload.client_name = venueEditData.venueClientName
        payload.client_email = venueEditData.venueClientEmail
        // Regenerate body by calling the backend regenerate endpoint
        const regenRes = await api.post(`/contracts/${c.id}/regenerate`, { template_data: venueEditData, contract_type: 'venue_booking' })
        payload.body = regenRes.data.body
      } else if (c.contract_type === 'vendor_template') {
        payload.template_data = vendorEditData
        const regenRes = await api.post(`/contracts/${c.id}/regenerate`, { template_data: vendorEditData, contract_type: 'vendor_template' })
        payload.body = regenRes.data.body
      }
      await api.put(`/contracts/${c.id}`, payload)
      await fetchContract()
      setEditMode(false)
      showToast('Contract saved!')
    } catch (err) {
      console.error('Failed to save contract:', err)
      alert('Failed to save contract')
    } finally {
      setSaving(false)
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
  const clientHasSigned = c.status === 'signed' || contract.status === ContractStatus.SIGNED
  const ownerHasSigned = !!c.owner_signature_data
  const canOwnerCounterSign = isOwner && clientHasSigned && !ownerHasSigned

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Back navigation */}
      <div className="mb-4 flex flex-col gap-1">
        <button
          onClick={() => router.push('/dashboard/events')}
          className="text-gray-600 hover:text-gray-900 text-sm self-start"
        >
          ← Back to Events
        </button>
        <button
          onClick={() => router.push('/dashboard/contracts')}
          className="text-xs text-gray-400 hover:text-gray-600 self-start"
        >
          View All Contracts →
        </button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{contract.title}</h1>
          <p className="text-gray-600 mt-1">Contract #{c.contract_number ?? contract.contractNumber}</p>
        </div>
        <div className="flex items-center gap-3">
          {isOwner && c.status !== 'signed' && c.status !== 'voided' && !editMode && (
            <button onClick={enterEditMode}
              className="flex items-center gap-1.5 bg-amber-500 text-white px-3 py-1.5 rounded-md hover:bg-amber-600 text-sm font-medium">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          )}
          <span className={`px-3 py-1 text-sm font-semibold rounded-full capitalize ${getStatusColor(contract.status)}`}>
            {contract.status}
          </span>
        </div>
      </div>

      {/* Edit Mode */}
      {editMode && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Edit Contract</h2>

          {/* Always-visible fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" value={editData.title} onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input type="text" value={editData.description} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
              <input type="text" value={editData.notes} onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>

          {/* Venue Booking form fields */}
          {(contract as any).contract_type === 'venue_booking' && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Venue Booking Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ['Venue Owner / Operator Name', 'venueOwnerName'],
                  ['Venue Name', 'venueName'],
                  ['Client Name', 'venueClientName'],
                  ['Client Email', 'venueClientEmail'],
                  ['Event Type', 'venueEventType'],
                  ['Event Date', 'venueEventDate'],
                  ['Event Time', 'venueEventTime'],
                  ['Access Window', 'venueAccessWindow'],
                  ['Guest Count', 'venueGuestCount'],
                  ['Total Booking Amount ($)', 'venueTotalAmount'],
                  ['Deposit ($)', 'venueDeposit'],
                  ['Governing State', 'venueGoverningState'],
                ].map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input type="text" value={venueEditData[key] || ''}
                      onChange={e => setVenueEditData((d: any) => ({ ...d, [key]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation — More than ___ days: policy</label>
                  <div className="flex gap-2">
                    <input type="number" value={venueEditData.venueCancelMoreThan || ''}
                      onChange={e => setVenueEditData((d: any) => ({ ...d, venueCancelMoreThan: e.target.value }))}
                      className="w-20 px-2 py-2 border border-gray-300 rounded-md text-sm" placeholder="days" />
                    <input type="text" value={venueEditData.venueCancelMoreThanPolicy || ''}
                      onChange={e => setVenueEditData((d: any) => ({ ...d, venueCancelMoreThanPolicy: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="policy" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation — Within ___ days: policy</label>
                  <div className="flex gap-2">
                    <input type="number" value={venueEditData.venueCancelWithin || ''}
                      onChange={e => setVenueEditData((d: any) => ({ ...d, venueCancelWithin: e.target.value }))}
                      className="w-20 px-2 py-2 border border-gray-300 rounded-md text-sm" placeholder="days" />
                    <input type="text" value={venueEditData.venueCancelWithinPolicy || ''}
                      onChange={e => setVenueEditData((d: any) => ({ ...d, venueCancelWithinPolicy: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="policy" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vendor Template form fields */}
          {(contract as any).contract_type === 'vendor_template' && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Vendor Agreement Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ['Company Name', 'companyName'],
                  ['Company State', 'companyState'],
                  ['Vendor Legal Name', 'vendorName'],
                  ['Vendor State', 'vendorState'],
                  ['Event Location', 'eventLocation'],
                  ['Date(s) of Service', 'eventDates'],
                  ['Total Fee ($)', 'totalFee'],
                  ['Notice Days (cancellation)', 'noticeDays'],
                  ['Start Date', 'startDate'],
                  ['End Date', 'endDate'],
                  ['Governing State', 'governingState'],
                ].map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input type="text" value={vendorEditData[key] || ''}
                      onChange={e => setVendorEditData((d: any) => ({ ...d, [key]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Services Description</label>
                  <textarea value={vendorEditData.servicesDescription || ''}
                    onChange={e => setVendorEditData((d: any) => ({ ...d, servicesDescription: e.target.value }))}
                    rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation / Refund Terms</label>
                  <input type="text" value={vendorEditData.cancelRefundTerms || ''}
                    onChange={e => setVendorEditData((d: any) => ({ ...d, cancelRefundTerms: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button onClick={() => setEditMode(false)}
              className="px-5 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
            <button onClick={handleSaveEdit} disabled={saving}
              className="px-5 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm font-medium">
              {saving ? 'Regenerating & Saving...' : 'Save & Regenerate Contract'}
            </button>
          </div>
        </div>
      )}

      {/* Contract Details */}
      {!editMode && (
        <>
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
        {c.body ? (
          /* Template-generated contract — render the stored HTML */
          <div
            className="border border-gray-200 rounded-lg p-6 bg-white print:border-0"
            dangerouslySetInnerHTML={{ __html: c.body }}
          />
        ) : (c.file_url ?? contract.fileUrl) ? (
          /* Uploaded file — show download button */
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
        ) : (
          <p className="text-sm text-gray-400 italic">No document attached to this contract.</p>
        )}
      </div>
        </>
      )} {/* end !editMode */}

      {/* Signature Section */}
      {contract.status === ContractStatus.SIGNED && (c.signature_data ?? contract.signatureData) && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Electronic Signatures</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client signature */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Client Signature</p>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <img
                  src={c.signature_data ?? contract.signatureData}
                  alt="Client Signature"
                  className="max-w-full h-28 mx-auto"
                />
                <p className="text-center text-sm text-gray-600 mt-2">
                  {c.signer_name ?? contract.signerName}
                </p>
                <p className="text-center text-xs text-gray-400">
                  {new Date(c.signed_date ?? contract.signedDate!).toLocaleString()}
                </p>
              </div>
            </div>
            {/* Owner counter-signature */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Venue Owner Signature</p>
              {ownerHasSigned ? (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <img
                    src={c.owner_signature_data}
                    alt="Owner Signature"
                    className="max-w-full h-28 mx-auto"
                  />
                  <p className="text-center text-sm text-gray-600 mt-2">{c.owner_signer_name}</p>
                  <p className="text-center text-xs text-gray-400">
                    {new Date(c.owner_signed_date).toLocaleString()}
                  </p>
                </div>
              ) : isOwner ? (
                <div className="border-2 border-dashed border-amber-300 rounded-lg p-6 bg-amber-50 flex flex-col items-center justify-center gap-3">
                  <p className="text-sm text-amber-700 font-medium text-center">Your counter-signature is pending</p>
                  <button
                    onClick={() => setShowOwnerSignModal(true)}
                    className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 text-sm font-medium"
                  >
                    <Check className="h-4 w-4" /> Counter-Sign Now
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-gray-200 rounded-lg p-6 bg-gray-50 flex items-center justify-center">
                  <p className="text-sm text-gray-400">Awaiting owner counter-signature</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
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

        {canOwnerCounterSign && (
          <button
            onClick={() => setShowOwnerSignModal(true)}
            className="flex items-center gap-2 bg-amber-600 text-white px-6 py-2 rounded-md hover:bg-amber-700"
          >
            <Check className="h-5 w-5" />
            Counter-Sign Contract
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

      {/* Owner Counter-Sign Modal */}
      {showOwnerSignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Counter-Sign Contract</h2>
            <p className="text-sm text-gray-500 mb-4">Add your signature as the venue owner to fully execute this contract.</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Full Name *</label>
              <input
                type="text"
                value={ownerSignerName}
                onChange={(e) => setOwnerSignerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter your full name"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Signature *</label>
              <div className="border-2 border-gray-300 rounded-lg">
                <SignatureCanvas
                  ref={ownerSignatureRef}
                  canvasProps={{ className: 'w-full h-48 cursor-crosshair' }}
                />
              </div>
              <button
                type="button"
                onClick={() => ownerSignatureRef.current?.clear()}
                className="mt-2 text-sm text-primary-600 hover:text-primary-700"
              >
                Clear Signature
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              By signing, you confirm the terms of this contract as the venue owner/operator.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowOwnerSignModal(false)}
                disabled={ownerSigning}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleOwnerSign}
                disabled={ownerSigning}
                className="px-6 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ownerSigning ? 'Signing...' : 'Counter-Sign & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
