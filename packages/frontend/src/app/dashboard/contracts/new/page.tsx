'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Upload, X, Calendar, Clock, Mail, Phone, Users, FileText, Wand2 } from 'lucide-react'
import { parseLocalDate } from '@/lib/dateUtils'

interface IntakeFormClient {
  id: string
  contact_name: string
  contact_email: string
  contact_phone: string
  event_type: string
  event_date: string
  event_time: string
  guest_count: number
  services_needed?: string
  status: string
}

interface VendorAccount {
  id: string
  business_name: string
  category?: string
  email?: string
  phone?: string
  state?: string
}

// ── Vendor contract template generator ───────────────────────────────────────
function generateVendorContract(d: {
  companyName: string
  companyState: string
  vendorName: string
  vendorState: string
  vendorEntityType: string
  servicesDescription: string
  eventLocation: string
  eventDates: string
  totalFee: string
  paymentTerms: 'full' | 'deposit'
  depositAmount?: string
  depositDueDate?: string
  balanceDueDate?: string
  cancelRefundTerms: string
  noticeDays: string
  startDate: string
  endDate: string
  governingState: string
  agreementDate: string
}) {
  const paymentSection = d.paymentTerms === 'full'
    ? `<li>Full payment of <strong>$${d.totalFee}</strong> due upfront prior to services.</li>`
    : `<li>Deposit: <strong>$${d.depositAmount || '___'}</strong> due on <strong>${d.depositDueDate || '___'}</strong></li>
       <li>Balance: <strong>$${(parseFloat(d.totalFee || '0') - parseFloat(d.depositAmount || '0')).toFixed(2)}</strong> due on <strong>${d.balanceDueDate || '___'}</strong></li>`

  return `<div style="font-family:Georgia,serif;max-width:780px;margin:0 auto;color:#111;line-height:1.75;padding:16px;">
  <h1 style="text-align:center;font-size:1.35rem;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:28px;">Vendor Services Agreement</h1>

  <p>This Vendor Services Agreement ("Agreement") is entered into as of <strong>${d.agreementDate}</strong>, by and between:</p>
  <p style="margin-left:16px;"><strong>Company:</strong> ${d.companyName}, a ${d.companyState} company ("Company")<br/>and<br/><strong>Vendor:</strong> ${d.vendorName}, a ${d.vendorState} ${d.vendorEntityType} ("Vendor")</p>
  <hr style="border:none;border-top:1px solid #ccc;margin:28px 0;"/>

  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:0;">1. Scope of Services</h2>
  <p>Vendor agrees to provide the following services:</p>
  <blockquote style="border-left:3px solid #666;margin:0 0 12px 0;padding:8px 16px;background:#f9f9f9;font-style:italic;">${d.servicesDescription}</blockquote>
  <p>Services will be performed at: <strong>${d.eventLocation || '[To Be Determined]'}</strong></p>
  <p>Dates of service: <strong>${d.eventDates || '[See event confirmation]'}</strong></p>

  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">2. Compensation</h2>
  <ul style="margin:0;padding-left:20px;">
    <li>Total Fee: <strong>$${d.totalFee}</strong></li>
    <li>Payment Method: Processed via <strong>Stripe or approved payment processor</strong></li>
    ${paymentSection}
  </ul>
  <p style="margin-top:8px;">Company does not guarantee minimum earnings unless explicitly stated in writing.</p>

  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">3. Independent Contractor Status</h2>
  <p>Vendor is an independent contractor and not an employee, partner, or agent of the Company. Vendor is solely responsible for all applicable taxes (including income and self-employment taxes), licenses, and permits required to perform services.</p>

  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">4. Platform Payments &amp; 1099 Acknowledgment</h2>
  <p>Vendor acknowledges that all payments may be processed through Stripe or a third-party payment processor. Any required tax reporting (including 1099 forms) will be handled by the payment processor where applicable. Vendor is responsible for ensuring accurate tax information is on file.</p>

  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">5. Vendor Responsibilities</h2>
  <p>Vendor agrees to: (a) perform services in a professional and timely manner; (b) provide all necessary equipment, staffing, and materials unless otherwise agreed in writing; and (c) comply with all applicable laws, regulations, and venue rules at the location of service.</p>

  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">6. Cancellation Policy</h2>
  <ul style="margin:0;padding-left:20px;">
    <li><strong>Vendor cancellation:</strong> Vendor must provide written notice at least <strong>${d.noticeDays} days</strong> in advance. Vendor may be liable for losses or damages resulting from the cancellation.</li>
    <li><strong>Company or Client cancellation — Refund terms:</strong> ${d.cancelRefundTerms}</li>
  </ul>

  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">7. Liability &amp; Indemnification</h2>
  <p>Vendor agrees to indemnify, defend, and hold harmless the Company, its officers, employees, and agents from and against any claims, damages, losses, or expenses (including reasonable attorneys' fees) arising from: (a) Vendor's performance of services; (b) Vendor's negligence or willful misconduct; or (c) any damage to property or persons caused by Vendor during service delivery.</p>

  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">8. Confidentiality</h2>
  <p>Vendor agrees to keep confidential all client information, pricing structures, business processes, and proprietary information of Company, and shall not disclose such information to any third party without prior written consent.</p>

  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">9. Term &amp; Termination</h2>
  <p>This Agreement is effective from <strong>${d.startDate}</strong> and continues through <strong>${d.endDate || 'completion of services'}</strong>. Either party may terminate this Agreement with <strong>${d.noticeDays} days</strong> written notice, except where the Agreement is tied to a confirmed event booking, in which case cancellation terms in Section 6 apply.</p>

  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">10. Governing Law</h2>
  <p>This Agreement shall be governed by and construed in accordance with the laws of the State of <strong>${d.governingState}</strong>, without regard to conflict of law principles.</p>

  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:24px;">11. Entire Agreement</h2>
  <p>This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, understandings, or agreements, whether oral or written, relating to the subject matter herein. Amendments must be in writing and signed by both parties.</p>

  <h2 style="font-size:.95rem;text-transform:uppercase;letter-spacing:.05em;margin-top:32px;">12. Signatures</h2>
  <p>By signing below, both parties agree to the terms and conditions set forth in this Agreement.</p>
  <div style="margin-top:20px;display:flex;gap:48px;flex-wrap:wrap;">
    <div style="flex:1;min-width:220px;">
      <p style="margin:0 0 4px;font-weight:bold;">Company Representative</p>
      <p style="margin:0;font-size:.9rem;color:#444;">${d.companyName}</p>
      <div style="border-bottom:1px solid #333;height:52px;margin:12px 0;"></div>
      <p style="margin:0;font-size:.8rem;color:#666;">Signature &amp; Date</p>
    </div>
    <div style="flex:1;min-width:220px;">
      <p style="margin:0 0 4px;font-weight:bold;">Vendor</p>
      <p style="margin:0;font-size:.9rem;color:#444;">${d.vendorName}</p>
      <div style="border-bottom:1px solid #333;height:52px;margin:12px 0;"></div>
      <p style="margin:0;font-size:.8rem;color:#666;">Signature &amp; Date</p>
    </div>
  </div>
</div>`
}

function NewContractForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  // mode: 'upload' | 'template'
  const [mode, setMode] = useState<'upload' | 'template'>('upload')

  // Shared fields
  const [clients, setClients] = useState<IntakeFormClient[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [selectedClientData, setSelectedClientData] = useState<IntakeFormClient | null>(null)

  // Vendor selector (template mode)
  const [vendors, setVendors] = useState<VendorAccount[]>([])
  const [selectedVendorId, setSelectedVendorId] = useState<string>('')
  const [selectedVendorData, setSelectedVendorData] = useState<VendorAccount | null>(null)
  const [title, setTitle] = useState('Event Service Agreement')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  // Upload-mode fields
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // Template-mode fields
  const [companyName, setCompanyName] = useState('')
  const [companyState, setCompanyState] = useState('Mississippi')
  const [vendorName, setVendorName] = useState('')
  const [vendorState, setVendorState] = useState('Mississippi')
  const [vendorEntityType, setVendorEntityType] = useState('LLC')
  const [servicesDescription, setServicesDescription] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventDates, setEventDates] = useState('')
  const [totalFee, setTotalFee] = useState('')
  const [paymentTerms, setPaymentTerms] = useState<'full' | 'deposit'>('full')
  const [depositAmount, setDepositAmount] = useState('')
  const [depositDueDate, setDepositDueDate] = useState('')
  const [balanceDueDate, setBalanceDueDate] = useState('')
  const [cancelRefundTerms, setCancelRefundTerms] = useState('Non-refundable deposit; balance refunded if cancelled 14+ days before event')
  const [noticeDays, setNoticeDays] = useState('7')
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
  const [endDate, setEndDate] = useState('')
  const [governingState, setGoverningState] = useState('Mississippi')

  useEffect(() => {
    fetchClients()
    fetchVendors()
    // Pre-fill company name from stored user profile
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const u = JSON.parse(stored)
        if (u.firstName || u.lastName) setCompanyName(`${u.firstName || ''} ${u.lastName || ''}`.trim())
      }
    } catch { /* ignore */ }
  }, [])

  // When vendor is selected: auto-populate template fields
  useEffect(() => {
    if (selectedVendorId) {
      const v = vendors.find(va => va.id === selectedVendorId)
      setSelectedVendorData(v || null)
      if (v) {
        setVendorName(v.business_name)
        if (v.state) setVendorState(v.state)
        setDescription(`Vendor Services Agreement — ${v.business_name}`)
      }
    } else {
      setSelectedVendorData(null)
    }
  }, [selectedVendorId, vendors])

  useEffect(() => {
    if (selectedClient) {
      const client = clients.find(c => c.id === selectedClient)
      setSelectedClientData(client || null)
      if (client) {
        const eventLabel = client.event_type
          ? client.event_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
          : 'Event'
        setDescription(`Contract for ${client.contact_name} — ${eventLabel}`)
        // Auto-populate template fields from client record
        if (client.contact_name) setVendorName(client.contact_name)
        if (client.event_date) {
          const d = parseLocalDate(client.event_date)
            .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          setEventDates(d)
          setEndDate(d)
          setBalanceDueDate(d)
        }
        if (client.services_needed) setServicesDescription(client.services_needed)
      }
    } else {
      setSelectedClientData(null)
    }
  }, [selectedClient, clients])

  const fetchClients = async () => {
    try {
      const res = await api.get<IntakeFormClient[]>('/intake-forms')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const upcoming = res.data.filter((c) => {
        if (!c.event_date) return false
        const [y, m, d] = c.event_date.split('-').map(Number)
        return new Date(y, m - 1, d) >= today
      })
      setClients(upcoming)
      const intakeFormId = searchParams.get('intakeFormId')
      if (intakeFormId) {
        const match = upcoming.find(c => c.id === intakeFormId)
        if (match) setSelectedClient(match.id)
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    }
  }

  const fetchVendors = async () => {
    try {
      const res = await api.get<VendorAccount[]>('/vendors')
      setVendors(res.data || [])
    } catch (error) {
      console.error('Failed to fetch vendors:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!allowedTypes.includes(selectedFile.type)) { alert('Please upload a PDF or Word document'); return }
      if (selectedFile.size > 10 * 1024 * 1024) { alert('File size must be less than 10MB'); return }
      setFile(selectedFile)
    }
  }

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient || !title || !file) { alert('Please select a client and upload a contract file'); return }
    setLoading(true)
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      const uploadResponse = await api.post('/contracts/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setUploading(false)
      const contractData = {
        owner_id: user?.id,
        intake_form_id: selectedClient,
        title, description, notes,
        contract_type: 'upload',
        file_url: uploadResponse.data.path,
        file_name: uploadResponse.data.originalname,
        file_size: uploadResponse.data.size,
        status: 'draft',
      }
      const response = await api.post('/contracts', contractData)
      router.push(`/dashboard/contracts/${response.data.id}`)
    } catch (error) {
      console.error('Failed to create contract:', error)
      alert('Failed to create contract')
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  const handleSubmitTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVendorId || !vendorName || !totalFee || !servicesDescription) {
      alert('Please select a vendor and fill in all required fields (fee, services)')
      return
    }
    setLoading(true)
    try {
      const agreementDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      const body = generateVendorContract({
        companyName, companyState, vendorName, vendorState, vendorEntityType,
        servicesDescription, eventLocation, eventDates, totalFee, paymentTerms,
        depositAmount, depositDueDate, balanceDueDate, cancelRefundTerms,
        noticeDays, startDate, endDate, governingState, agreementDate,
      })
      const contractData = {
        owner_id: user?.id,
        intake_form_id: selectedClient || undefined,
        vendor_account_id: selectedVendorId,
        title, description, notes,
        contract_type: 'vendor_template',
        body,
        status: 'draft',
      }
      const response = await api.post('/contracts', contractData)
      router.push(`/dashboard/contracts/${response.data.id}`)
    } catch (error) {
      console.error('Failed to create contract:', error)
      alert('Failed to create contract')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Contract</h1>
        <p className="text-gray-600 mt-1">Generate a vendor agreement or upload an existing document</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => { setMode('template'); setTitle('Vendor Services Agreement') }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm border transition-colors ${
            mode === 'template' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
          }`}
        >
          <Wand2 className="w-4 h-4" />
          Vendor Agreement Template
        </button>
        <button
          type="button"
          onClick={() => { setMode('upload'); setTitle('Event Service Agreement') }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm border transition-colors ${
            mode === 'upload' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* ── Client selector (upload mode only) ───────────────────────── */}
      {mode === 'upload' && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-5">
          <div className="mb-4">
            <label className={labelCls}>Select Client *</label>
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              required
              className={inputCls}
            >
              <option value="">-- Select a client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.contact_name}
                  {c.event_type ? ` — ${c.event_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}` : ''}
                  {c.event_date ? ` (${c.event_date})` : ''}
                </option>
              ))}
            </select>
            {clients.length === 0 && <p className="text-xs text-gray-400 mt-1">No upcoming clients found.</p>}
          </div>

          {selectedClientData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Client Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-blue-900 font-semibold">{selectedClientData.contact_name}</p>
                  {selectedClientData.contact_email && <p className="text-blue-700 text-xs flex items-center gap-1"><Mail className="h-3 w-3"/>{selectedClientData.contact_email}</p>}
                  {selectedClientData.contact_phone && <p className="text-blue-700 text-xs flex items-center gap-1"><Phone className="h-3 w-3"/>{selectedClientData.contact_phone}</p>}
                </div>
                <div>
                  {selectedClientData.event_type && <p className="text-blue-700 text-xs">{selectedClientData.event_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>}
                  {selectedClientData.event_date && (
                    <p className="text-blue-700 text-xs flex items-center gap-1">
                      <Calendar className="h-3 w-3"/>
                      {parseLocalDate(selectedClientData.event_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  )}
                  {selectedClientData.event_time && <p className="text-blue-700 text-xs flex items-center gap-1"><Clock className="h-3 w-3"/>{selectedClientData.event_time}</p>}
                  {selectedClientData.guest_count && <p className="text-blue-700 text-xs flex items-center gap-1"><Users className="h-3 w-3"/>{selectedClientData.guest_count} guests</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TEMPLATE MODE ─────────────────────────────────────────────────── */}
      {mode === 'template' && (
        <form onSubmit={handleSubmitTemplate}>
          {/* Vendor selector */}
          <div className="bg-white shadow-md rounded-lg p-6 mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Select Vendor *</h2>
            <select
              value={selectedVendorId}
              onChange={e => setSelectedVendorId(e.target.value)}
              required
              className={inputCls}
            >
              <option value="">-- Select a vendor --</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>
                  {v.business_name}
                  {v.category ? ` — ${v.category}` : ''}
                </option>
              ))}
            </select>
            {vendors.length === 0 && <p className="text-xs text-gray-400 mt-1">No vendors found. Make sure vendors have registered.</p>}
            {selectedVendorData && (
              <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-700 font-bold text-xs">{selectedVendorData.business_name.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-purple-900">{selectedVendorData.business_name}</p>
                  {selectedVendorData.email && <p className="text-xs text-purple-700 flex items-center gap-1"><Mail className="h-3 w-3"/>{selectedVendorData.email}</p>}
                  {selectedVendorData.phone && <p className="text-xs text-purple-700 flex items-center gap-1"><Phone className="h-3 w-3"/>{selectedVendorData.phone}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Optional: link to a client event */}
          <div className="bg-white shadow-md rounded-lg p-6 mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Link to Client Event <span className="font-normal normal-case text-gray-400">(optional)</span></h2>
            <p className="text-xs text-gray-400 mb-3">If this vendor is being hired for a specific booked event, link that intake form here.</p>
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              className={inputCls}
            >
              <option value="">-- None --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.contact_name}
                  {c.event_type ? ` — ${c.event_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}` : ''}
                  {c.event_date ? ` (${c.event_date})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="bg-white shadow-md rounded-lg p-6 mb-4">
            <div className="mb-0">
              <label className={labelCls}>Contract Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className={inputCls} />
            </div>
          </div>

          {/* Company */}
          <div className="bg-white shadow-md rounded-lg p-6 mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Your Business</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Company Name *</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required className={inputCls} placeholder="Your business name" />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <input type="text" value={companyState} onChange={e => setCompanyState(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Vendor details */}
          <div className="bg-white shadow-md rounded-lg p-6 mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Vendor Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>Vendor Legal Name *</label>
                <input type="text" value={vendorName} onChange={e => setVendorName(e.target.value)} required className={inputCls} placeholder="Full legal name or business name" />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <input type="text" value={vendorState} onChange={e => setVendorState(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Entity Type</label>
                <select value={vendorEntityType} onChange={e => setVendorEntityType(e.target.value)} className={inputCls}>
                  {['LLC', 'Sole Proprietor', 'Corporation', 'Partnership', 'Individual'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="bg-white shadow-md rounded-lg p-6 mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Services &amp; Event Details</h2>
            <div className="mb-4">
              <label className={labelCls}>Services Description * <span className="font-normal text-gray-400">(e.g., DJ services, 6-hour set, sound equipment included)</span></label>
              <textarea value={servicesDescription} onChange={e => setServicesDescription(e.target.value)} required rows={3} className={inputCls} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Event Location / Venue</label>
                <input type="text" value={eventLocation} onChange={e => setEventLocation(e.target.value)} className={inputCls} placeholder="Venue name and address" />
              </div>
              <div>
                <label className={labelCls}>Date(s) of Service</label>
                <input type="text" value={eventDates} onChange={e => setEventDates(e.target.value)} className={inputCls} placeholder="e.g., May 9, 2026" />
              </div>
            </div>
          </div>

          {/* Compensation */}
          <div className="bg-white shadow-md rounded-lg p-6 mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Compensation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls}>Total Fee ($) *</label>
                <input type="number" value={totalFee} onChange={e => setTotalFee(e.target.value)} required min="0" step="0.01" className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>Payment Terms</label>
                <div className="flex gap-6 mt-2">
                  {(['full', 'deposit'] as const).map(t => (
                    <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="paymentTerms" value={t} checked={paymentTerms === t} onChange={() => setPaymentTerms(t)} />
                      {t === 'full' ? 'Full upfront' : 'Deposit + Balance'}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {paymentTerms === 'deposit' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Deposit Amount ($)</label>
                  <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} min="0" step="0.01" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Deposit Due Date</label>
                  <input type="text" value={depositDueDate} onChange={e => setDepositDueDate(e.target.value)} className={inputCls} placeholder="e.g., April 30, 2026" />
                </div>
                <div>
                  <label className={labelCls}>Balance Due Date</label>
                  <input type="text" value={balanceDueDate} onChange={e => setBalanceDueDate(e.target.value)} className={inputCls} placeholder="e.g., May 9, 2026" />
                </div>
              </div>
            )}
          </div>

          {/* Terms */}
          <div className="bg-white shadow-md rounded-lg p-6 mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Terms</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>Cancellation / Refund Policy</label>
                <textarea value={cancelRefundTerms} onChange={e => setCancelRefundTerms(e.target.value)} rows={2} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Notice Period (days)</label>
                <input type="number" value={noticeDays} onChange={e => setNoticeDays(e.target.value)} min="1" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Governing State</label>
                <input type="text" value={governingState} onChange={e => setGoverningState(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Agreement Start Date</label>
                <input type="text" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Agreement End Date</label>
                <input type="text" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} placeholder="Upon completion of services" />
              </div>
            </div>
          </div>

          {/* Internal notes */}
          <div className="bg-white shadow-md rounded-lg p-6 mb-5">
            <label className={labelCls}>Internal Notes <span className="font-normal text-gray-400">(not visible to vendor)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls} />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => router.push('/dashboard/contracts')} className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading || !selectedClient} className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              {loading ? 'Generating...' : 'Generate Contract'}
            </button>
          </div>
        </form>
      )}

      {/* ── UPLOAD MODE ───────────────────────────────────────────────────── */}
      {mode === 'upload' && (
        <form onSubmit={handleSubmitUpload} className="bg-white shadow-md rounded-lg p-6">
          <div className="mb-5">
            <label className={labelCls}>Contract Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className={inputCls} placeholder="e.g., Venue Rental Agreement, Event Service Contract" />
          </div>
          <div className="mb-5">
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={inputCls} placeholder="Brief description of the contract" />
          </div>
          <div className="mb-5">
            <label className={labelCls}>Upload Contract Document * (PDF, DOC, DOCX – Max 10MB)</label>
            {!file ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
                <input type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx" className="hidden" id="fileUpload" />
                <label htmlFor="fileUpload" className="mt-4 inline-block cursor-pointer bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">Select File</label>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-100 p-2 rounded"><FileText className="h-6 w-6 text-primary-600" /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button type="button" onClick={() => setFile(null)} className="text-red-600 hover:text-red-800"><X className="h-5 w-5" /></button>
              </div>
            )}
          </div>
          <div className="mb-5">
            <label className={labelCls}>Internal Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inputCls} placeholder="Internal notes (not visible to client)" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => router.push('/dashboard/contracts')} className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading || uploading || !selectedClient} className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {uploading ? 'Uploading...' : loading ? 'Creating...' : 'Create Contract'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function NewContractPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <NewContractForm />
    </Suspense>
  )
}
