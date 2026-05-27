'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import {
  Plus, Trash2, Save, Loader2, Crown, Users, DollarSign,
  Package, ChevronDown, ChevronUp, ImageIcon, X, Star,
  LayoutGrid, Wine, Utensils, Shield, Headphones, Settings, Copy, Phone,
} from 'lucide-react'

const PACKAGE_TYPES = [
  { value: 'table', label: 'VIP Table' },
  { value: 'booth', label: 'VIP Booth' },
  { value: 'section', label: 'VIP Section' },
  { value: 'seat', label: 'Reserved Seat' },
  { value: 'sponsor_table', label: 'Sponsor Table' },
  { value: 'cabana', label: 'Cabana / Suite' },
  { value: 'meet_greet', label: 'Meet & Greet' },
  { value: 'lounge', label: 'Lounge Package' },
  { value: 'private_room', label: 'Private Room' },
  { value: 'custom', label: 'Custom VIP Experience' },
]

const SERVICE_CATEGORIES = [
  { value: 'bar', label: 'Bar', icon: Wine },
  { value: 'kitchen', label: 'Kitchen / Food', icon: Utensils },
  { value: 'concierge', label: 'Concierge', icon: Headphones },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'other', label: 'Other', icon: Package },
]

interface VipSection {
  id: string
  name: string
  description: string | null
  capacity: number
  status: string
}

interface VipPackage {
  id: string
  name: string
  package_type: string
  description: string | null
  price: number
  capacity: number
  included_tickets: number
  table_label: string | null
  inventory: number
  inventory_sold: number
  requires_concierge: boolean
  guest_names_required: boolean
  guests_arrive_separately: boolean
  section_id: string | null
  service_notes: string | null
  status: string
  vip_sections?: { name: string } | null
}

interface ServiceItem {
  id: string
  name: string
  category: string
  price: number
  inventory: number | null
  requires_approval: boolean
  department: string | null
  allow_special_request: boolean
  special_request_prompt: string | null
  notes: string | null
}

interface Layout {
  id: string
  file_url: string
  file_type: string
  description: string | null
}

interface VipConcierge {
  id: string
  name: string
  phone: string
  access_code: string
  created_at: string
}

export default function VipManagePage() {
  const { id: eventId } = useParams<{ id: string }>()
  const router = useRouter()

  const [sections, setSections] = useState<VipSection[]>([])
  const [packages, setPackages] = useState<VipPackage[]>([])
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([])
  const [layouts, setLayouts] = useState<Layout[]>([])
  const [concierges, setConcierges] = useState<VipConcierge[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'packages' | 'service' | 'layout' | 'concierges'>('packages')

  // Package form
  const [showPkgForm, setShowPkgForm] = useState(false)
  const [pkgSaving, setPkgSaving] = useState(false)
  const [editingPkg, setEditingPkg] = useState<VipPackage | null>(null)
  const [pkgForm, setPkgForm] = useState({
    name: '', package_type: 'table', description: '', price: '',
    capacity: '1', included_tickets: '0', table_label: '',
    inventory: '1', requires_concierge: false, guest_names_required: false,
    guests_arrive_separately: false, service_notes: '', section_id: '',
  })

  // Section form
  const [showSectionForm, setShowSectionForm] = useState(false)
  const [sectionForm, setSectionForm] = useState({ name: '', description: '', capacity: '20' })
  const [sectionSaving, setSectionSaving] = useState(false)

  // Service item form
  const [showServiceForm, setShowServiceForm] = useState(false)
  const [serviceForm, setServiceForm] = useState({
    name: '', category: 'bar', price: '0', inventory: '', requires_approval: false, department: '',
    allow_special_request: false, special_request_prompt: '', notes: '',
  })
  const [serviceSaving, setServiceSaving] = useState(false)

  // Layout
  const [layoutUrl, setLayoutUrl] = useState('')
  const [layoutDesc, setLayoutDesc] = useState('')
  const [layoutSaving, setLayoutSaving] = useState(false)

  // Concierge form
  const [conciergeForm, setConciergeForm] = useState({ name: '', phone: '' })
  const [conciergeSaving, setConciergeSaving] = useState(false)
  const [showConciergeForm, setShowConciergeForm] = useState(false)
  const [newConciergeCode, setNewConciergeCode] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pkgRes, secRes, svcRes, layoutRes] = await Promise.all([
        api.get(`/vip/events/${eventId}/packages`),
        api.get(`/vip/events/${eventId}/sections`),
        api.get(`/vip/events/${eventId}/service-items`),
        api.get(`/vip/events/${eventId}/layout`),
      ])
      setPackages(pkgRes.data)
      setSections(secRes.data)
      setServiceItems(svcRes.data)
      setLayouts(layoutRes.data)
      // Load concierges separately (non-blocking)
      api.get(`/vip/events/${eventId}/concierges`)
        .then(r => setConcierges(r.data))
        .catch(() => {})
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { load() }, [load])

  const resetPkgForm = () => {
    setPkgForm({
      name: '', package_type: 'table', description: '', price: '',
      capacity: '1', included_tickets: '0', table_label: '',
      inventory: '1', requires_concierge: false, guest_names_required: false,
      guests_arrive_separately: false, service_notes: '', section_id: '',
    })
    setEditingPkg(null)
    setShowPkgForm(false)
  }

  const openEditPkg = (pkg: VipPackage) => {
    setEditingPkg(pkg)
    setPkgForm({
      name: pkg.name,
      package_type: pkg.package_type,
      description: pkg.description || '',
      price: String(pkg.price),
      capacity: String(pkg.capacity),
      included_tickets: String(pkg.included_tickets),
      table_label: pkg.table_label || '',
      inventory: String(pkg.inventory),
      requires_concierge: pkg.requires_concierge,
      guest_names_required: pkg.guest_names_required,
      guests_arrive_separately: pkg.guests_arrive_separately ?? false,
      service_notes: pkg.service_notes || '',
      section_id: pkg.section_id || '',
    })
    setShowPkgForm(true)
  }

  const savePackage = async () => {
    if (!pkgForm.name || !pkgForm.price) return
    setPkgSaving(true)
    try {
      const body = {
        name: pkgForm.name,
        package_type: pkgForm.package_type,
        description: pkgForm.description || undefined,
        price: parseFloat(pkgForm.price),
        capacity: parseInt(pkgForm.capacity),
        included_tickets: parseInt(pkgForm.included_tickets),
        table_label: pkgForm.table_label || undefined,
        inventory: parseInt(pkgForm.inventory),
        requires_concierge: pkgForm.requires_concierge,
        guest_names_required: pkgForm.guest_names_required,
        guests_arrive_separately: pkgForm.guests_arrive_separately,
        service_notes: pkgForm.service_notes || undefined,
        section_id: pkgForm.section_id || undefined,
      }
      if (editingPkg) {
        await api.put(`/vip/packages/${editingPkg.id}`, body)
      } else {
        await api.post(`/vip/events/${eventId}/packages`, body)
      }
      resetPkgForm()
      load()
    } catch (err) {
      console.error(err)
    } finally {
      setPkgSaving(false)
    }
  }

  const deletePackage = async (id: string) => {
    if (!confirm('Delete this VIP package?')) return
    await api.delete(`/vip/packages/${id}`)
    load()
  }

  const duplicatePackage = (pkg: VipPackage) => {
    setEditingPkg(null)
    setPkgForm({
      name: pkg.name + ' (Copy)',
      package_type: pkg.package_type,
      description: pkg.description || '',
      price: String(pkg.price),
      capacity: String(pkg.capacity),
      included_tickets: String(pkg.included_tickets),
      table_label: '',
      inventory: String(pkg.inventory),
      requires_concierge: pkg.requires_concierge,
      guest_names_required: pkg.guest_names_required,
      guests_arrive_separately: pkg.guests_arrive_separately,
      service_notes: pkg.service_notes || '',
      section_id: pkg.section_id || '',
    })
    setShowPkgForm(true)
  }

  const saveSection = async () => {
    if (!sectionForm.name) return
    setSectionSaving(true)
    try {
      await api.post(`/vip/events/${eventId}/sections`, {
        name: sectionForm.name,
        description: sectionForm.description || undefined,
        capacity: parseInt(sectionForm.capacity),
      })
      setSectionForm({ name: '', description: '', capacity: '20' })
      setShowSectionForm(false)
      load()
    } finally {
      setSectionSaving(false)
    }
  }

  const deleteSection = async (id: string) => {
    if (!confirm('Delete this section?')) return
    await api.delete(`/vip/sections/${id}`)
    load()
  }

  const saveServiceItem = async () => {
    if (!serviceForm.name) return
    setServiceSaving(true)
    try {
      await api.post(`/vip/events/${eventId}/service-items`, {
        name: serviceForm.name,
        category: serviceForm.category,
        price: parseFloat(serviceForm.price) || 0,
        inventory: serviceForm.inventory ? parseInt(serviceForm.inventory) : undefined,
        requires_approval: serviceForm.requires_approval,
        department: serviceForm.department || undefined,
        allow_special_request: serviceForm.allow_special_request,
        special_request_prompt: serviceForm.allow_special_request ? (serviceForm.special_request_prompt || undefined) : undefined,
        notes: serviceForm.notes || undefined,
      })
      setServiceForm({ name: '', category: 'bar', price: '0', inventory: '', requires_approval: false, department: '', allow_special_request: false, special_request_prompt: '', notes: '' })
      setShowServiceForm(false)
      load()
    } finally {
      setServiceSaving(false)
    }
  }

  const deleteServiceItem = async (id: string) => {
    if (!confirm('Delete this service item?')) return
    await api.delete(`/vip/service-items/${id}`)
    load()
  }

  const saveConcierge = async () => {
    if (!conciergeForm.name || !conciergeForm.phone) return
    setConciergeSaving(true)
    try {
      const res = await api.post(`/vip/events/${eventId}/concierges`, {
        name: conciergeForm.name,
        phone: conciergeForm.phone,
      })
      setNewConciergeCode(res.data.access_code)
      setConciergeForm({ name: '', phone: '' })
      setShowConciergeForm(false)
      load()
    } finally {
      setConciergeSaving(false)
    }
  }

  const deleteConcierge = async (id: string) => {
    if (!confirm('Remove this concierge?')) return
    await api.delete(`/vip/concierges/${id}`)
    setConcierges(prev => prev.filter(c => c.id !== id))
  }

  const saveLayout = async () => {
    if (!layoutUrl) return
    setLayoutSaving(true)
    try {
      const ext = layoutUrl.split('.').pop()?.toLowerCase()
      const fileType = ext === 'pdf' ? 'pdf' : 'image'
      await api.post(`/vip/events/${eventId}/layout`, {
        file_url: layoutUrl,
        file_type: fileType,
        description: layoutDesc || undefined,
      })
      setLayoutUrl('')
      setLayoutDesc('')
      load()
    } finally {
      setLayoutSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Crown className="w-7 h-7 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">VIP Concierge Suite</h1>
            <p className="text-sm text-gray-500">Manage VIP packages, sections, and add-on services</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/promoter/events/${eventId}/vip/orders`}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            View Orders
          </Link>
          <Link
            href={`/dashboard/promoter/events/${eventId}/vip/scan`}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            Door Scanner
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { key: 'packages', label: 'VIP Packages', icon: Crown },
          { key: 'service', label: 'Service Menu', icon: Wine },
          { key: 'layout', label: 'Floor Plan', icon: LayoutGrid },
          { key: 'concierges', label: 'Concierges', icon: Phone },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* PACKAGES TAB */}
      {activeTab === 'packages' && (
        <div className="space-y-6">
          {/* Sections */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-gray-500" />
                Sections / Areas
              </h2>
              <button
                onClick={() => setShowSectionForm(!showSectionForm)}
                className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                <Plus className="w-4 h-4" /> Add Section
              </button>
            </div>

            {showSectionForm && (
              <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-100 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Section Name *</label>
                    <input
                      value={sectionForm.name}
                      onChange={e => setSectionForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Section A, Balcony VIP"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Capacity</label>
                    <input
                      type="number"
                      value={sectionForm.capacity}
                      onChange={e => setSectionForm(p => ({ ...p, capacity: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <input
                  value={sectionForm.description}
                  onChange={e => setSectionForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Description (optional)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveSection}
                    disabled={sectionSaving}
                    className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {sectionSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Section'}
                  </button>
                  <button onClick={() => setShowSectionForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                </div>
              </div>
            )}

            {sections.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No sections defined. Add sections to assign packages to areas.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sections.map(s => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">
                    <span>{s.name}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">{s.capacity} cap</span>
                    <button onClick={() => deleteSection(s.id)} className="text-gray-400 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* VIP Packages */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Crown className="w-4 h-4 text-purple-500" />
                VIP Packages
              </h2>
              <button
                onClick={() => { resetPkgForm(); setShowPkgForm(true) }}
                className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                <Plus className="w-4 h-4" /> Add Package
              </button>
            </div>

            {showPkgForm && (
              <div className="mb-6 p-5 bg-purple-50 rounded-xl border border-purple-100 space-y-4">
                <h3 className="font-medium text-gray-800">{editingPkg ? 'Edit Package' : 'New VIP Package'}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Package Name *</label>
                    <input
                      value={pkgForm.name}
                      onChange={e => setPkgForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Platinum Table, Gold Booth"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={pkgForm.package_type}
                      onChange={e => setPkgForm(p => ({ ...p, package_type: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      {PACKAGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={pkgForm.description}
                      onChange={e => setPkgForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="What does the buyer get? Bottles, admission, table assignment..."
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Price *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        value={pkgForm.price}
                        onChange={e => setPkgForm(p => ({ ...p, price: e.target.value }))}
                        placeholder="750.00"
                        className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Table / Area Label</label>
                    <input
                      value={pkgForm.table_label}
                      onChange={e => setPkgForm(p => ({ ...p, table_label: e.target.value }))}
                      placeholder="e.g. Table 7, T4, Booth B"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Max Guests (Capacity)</label>
                    <input
                      type="number"
                      value={pkgForm.capacity}
                      onChange={e => setPkgForm(p => ({ ...p, capacity: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Admission Tickets Included</label>
                    <input
                      type="number"
                      value={pkgForm.included_tickets}
                      onChange={e => setPkgForm(p => ({ ...p, included_tickets: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Inventory (# Available)</label>
                    <input
                      type="number"
                      value={pkgForm.inventory}
                      onChange={e => setPkgForm(p => ({ ...p, inventory: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Section (optional)</label>
                    <select
                      value={pkgForm.section_id}
                      onChange={e => setPkgForm(p => ({ ...p, section_id: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">None</option>
                      {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Service Notes for Staff</label>
                    <input
                      value={pkgForm.service_notes}
                      onChange={e => setPkgForm(p => ({ ...p, service_notes: e.target.value }))}
                      placeholder="Special instructions for concierge or bar staff"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-4">
                    {[
                      { key: 'requires_concierge', label: 'Concierge Required' },
                      { key: 'guest_names_required', label: 'Guest Names Required' },
                      { key: 'guests_arrive_separately', label: 'Guests May Arrive Separately' },
                    ].map(opt => (
                      <label key={opt.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(pkgForm as any)[opt.key]}
                          onChange={e => setPkgForm(p => ({ ...p, [opt.key]: e.target.checked }))}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={savePackage}
                    disabled={pkgSaving}
                    className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {pkgSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {editingPkg ? 'Update Package' : 'Create Package'}
                  </button>
                  <button onClick={resetPkgForm} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                </div>
              </div>
            )}

            {packages.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Crown className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No VIP packages yet. Create your first one above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {packages.map(pkg => (
                  <div key={pkg.id} className="flex items-start justify-between p-4 bg-gradient-to-r from-purple-50 to-white border border-purple-100 rounded-xl">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="font-semibold text-gray-900">{pkg.name}</span>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">{PACKAGE_TYPES.find(t => t.value === pkg.package_type)?.label}</span>
                        {pkg.status === 'sold_out' && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">Sold Out</span>}
                        {pkg.vip_sections && <span className="text-xs text-gray-500">{pkg.vip_sections.name}</span>}
                      </div>
                      {pkg.description && <p className="text-sm text-gray-600 mb-2">{pkg.description}</p>}
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${Number(pkg.price).toFixed(0)}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{pkg.capacity} guests</span>
                        {pkg.included_tickets > 0 && <span>{pkg.included_tickets} admission passes</span>}
                        {pkg.table_label && <span>📍 {pkg.table_label}</span>}
                        <span>{pkg.inventory_sold}/{pkg.inventory} sold</span>
                        {pkg.requires_concierge && <span className="text-purple-600">Concierge required</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button onClick={() => openEditPkg(pkg)} title="Edit" className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg">
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => duplicatePackage(pkg)}
                        title="Duplicate this package"
                        className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <Copy className="w-3 h-3" /> Dup
                      </button>
                      <button onClick={() => deletePackage(pkg.id)} title="Delete" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SERVICE MENU TAB */}
      {activeTab === 'service' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Service Add-ons Menu</h2>
            <button
              onClick={() => setShowServiceForm(!showServiceForm)}
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          {showServiceForm && (
            <div className="mb-5 p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Item Name *</label>
                  <input
                    value={serviceForm.name}
                    onChange={e => setServiceForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Moët Bottle, Birthday Package"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={serviceForm.category}
                    onChange={e => setServiceForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {SERVICE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      value={serviceForm.price}
                      onChange={e => setServiceForm(p => ({ ...p, price: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Inventory (blank = unlimited)</label>
                  <input
                    type="number"
                    value={serviceForm.inventory}
                    onChange={e => setServiceForm(p => ({ ...p, inventory: e.target.value }))}
                    placeholder="Leave blank for unlimited"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                  <input
                    value={serviceForm.department}
                    onChange={e => setServiceForm(p => ({ ...p, department: e.target.value }))}
                    placeholder="e.g. Bar, Kitchen, Concierge"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="req_approval"
                    checked={serviceForm.requires_approval}
                    onChange={e => setServiceForm(p => ({ ...p, requires_approval: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <label htmlFor="req_approval" className="text-sm text-gray-700 cursor-pointer">Requires Approval</label>
                </div>
              </div>
              {/* Special request & notes */}
              <div className="space-y-3 border-t border-purple-100 pt-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allow_special_request"
                    checked={serviceForm.allow_special_request}
                    onChange={e => setServiceForm(p => ({ ...p, allow_special_request: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <label htmlFor="allow_special_request" className="text-sm text-gray-700 cursor-pointer">Allow Special Request from Guest</label>
                </div>
                {serviceForm.allow_special_request && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Request Prompt <span className="text-gray-400 font-normal">(shown to guest)</span></label>
                    <input
                      value={serviceForm.special_request_prompt}
                      onChange={e => setServiceForm(p => ({ ...p, special_request_prompt: e.target.value }))}
                      placeholder="e.g. Which flavor? Buffalo / Lemon Pepper / Garlic Parmesan"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Staff Notes <span className="text-gray-400 font-normal">(internal — not shown to guest)</span></label>
                  <textarea
                    value={serviceForm.notes}
                    onChange={e => setServiceForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="e.g. Comes in a basket, served with ranch, ask for allergy info"
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveServiceItem} disabled={serviceSaving} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {serviceSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add to Menu'}
                </button>
                <button onClick={() => setShowServiceForm(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              </div>
            </div>
          )}

          {serviceItems.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Wine className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No service items yet. Add bottles, food, hookah, and more.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {SERVICE_CATEGORIES.map(cat => {
                const items = serviceItems.filter(i => i.category === cat.value)
                if (items.length === 0) return null
                return (
                  <div key={cat.value} className="py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <cat.icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{cat.label}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map(item => (
                        <div key={item.id} className="px-3 py-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-gray-800">{item.name}</span>
                              {item.requires_approval && <span className="ml-2 text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Approval Required</span>}
                              {item.allow_special_request && <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Special Request</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-gray-700">${Number(item.price).toFixed(0)}</span>
                              {item.inventory != null && <span className="text-xs text-gray-400">{item.inventory} avail</span>}
                              <button onClick={() => deleteServiceItem(item.id)} className="text-gray-400 hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {item.notes && <p className="text-xs text-gray-500 mt-1 italic">{item.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* LAYOUT TAB */}
      {activeTab === 'layout' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-gray-500" />
              Upload Floor Plan / Seating Chart
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Image or PDF URL</label>
                <input
                  value={layoutUrl}
                  onChange={e => setLayoutUrl(e.target.value)}
                  placeholder="https://example.com/floor-plan.png"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Upload to your storage and paste the URL here. Supports images or PDF.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  value={layoutDesc}
                  onChange={e => setLayoutDesc(e.target.value)}
                  placeholder="e.g. Main floor layout, VIP section highlighted"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={saveLayout}
                disabled={!layoutUrl || layoutSaving}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {layoutSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                Save Layout
              </button>
            </div>
          </div>

          {layouts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Current Layout</h3>
              {layouts.map(l => (
                <div key={l.id}>
                  {l.description && <p className="text-sm text-gray-600 mb-3">{l.description}</p>}
                  {l.file_type === 'image' ? (
                    <img src={l.file_url} alt="Floor plan" className="w-full max-h-96 object-contain rounded-lg border border-gray-200" />
                  ) : (
                    <a href={l.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-600 hover:underline text-sm">
                      <ImageIcon className="w-4 h-4" /> View PDF Layout
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONCIERGES TAB */}
      {activeTab === 'concierges' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">Concierge Staff</h2>
              <p className="text-xs text-gray-500 mt-0.5">Add staff by name &amp; phone. They receive an access code to view the VIP portal and get SMS alerts when guests arrive.</p>
            </div>
            <button
              onClick={() => { setShowConciergeForm(!showConciergeForm); setNewConciergeCode(null) }}
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Add Concierge
            </button>
          </div>

          {showConciergeForm && (
            <div className="mb-5 p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    value={conciergeForm.name}
                    onChange={e => setConciergeForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Marcus Williams"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={conciergeForm.phone}
                    onChange={e => setConciergeForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveConcierge} disabled={conciergeSaving || !conciergeForm.name || !conciergeForm.phone} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                  {conciergeSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                  Add &amp; Generate Code
                </button>
                <button onClick={() => setShowConciergeForm(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              </div>
            </div>
          )}

          {newConciergeCode && (
            <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm font-medium text-green-800 mb-1">✅ Concierge added! Share this access code:</p>
              <div className="flex items-center gap-3">
                <code className="text-2xl font-mono font-bold text-green-700 tracking-widest">{newConciergeCode}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/vip/concierge/${newConciergeCode}`); }}
                  className="text-xs text-green-700 underline"
                >Copy portal link</button>
              </div>
              <p className="text-xs text-green-600 mt-1">Portal: {typeof window !== 'undefined' ? window.location.origin : ''}/vip/concierge/{newConciergeCode}</p>
            </div>
          )}

          {concierges.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Phone className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No concierges yet. Add staff to enable SMS arrival alerts.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {concierges.map(c => {
                const portalLink = `/vip/concierge/${c.access_code}`
                return (
                  <div key={c.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 text-sm">{c.name}</span>
                        <span className="text-xs text-gray-500">{c.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded tracking-widest text-gray-700">{c.access_code}</code>
                        <a href={portalLink} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline">Open portal ↗</a>
                        <button onClick={() => navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}${portalLink}`)} className="text-xs text-gray-400 hover:text-gray-600">Copy link</button>
                      </div>
                    </div>
                    <button onClick={() => deleteConcierge(c.id)} className="text-gray-400 hover:text-red-500 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
