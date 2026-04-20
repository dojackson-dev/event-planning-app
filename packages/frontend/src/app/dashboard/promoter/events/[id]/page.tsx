'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import {
  Loader2, Trash2, Plus, Save, ExternalLink, Copy,
  Users, DollarSign, Tag, MapPin, Clock, ChevronDown, CheckCircle,
} from 'lucide-react'

interface TicketTier {
  id: string
  name: string
  price: number
  quantity: number
  quantity_sold: number
  description: string | null
}

interface Attendee {
  id: string
  buyer_email: string
  amount_paid: number
  status: string
  created_at: string
  ticket_tiers: { name: string } | null
}

interface PromoterEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  venue_name: string | null
  venue_address: string | null
  city: string | null
  state: string | null
  category: string | null
  image_url: string | null
  age_restriction: string | null
  status: 'draft' | 'published' | 'cancelled'
  ticket_tiers: TicketTier[]
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

const EVENT_CATEGORIES = [
  'Music','Comedy','Sports','Arts & Theater','Food & Drink',
  'Networking','Conference','Festival','Club Night','Other',
]

export default function PromoterEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [event, setEvent] = useState<PromoterEvent | null>(null)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'details' | 'tiers' | 'attendees'>('details')
  const [copied, setCopied] = useState(false)

  // Edit fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [category, setCategory] = useState('')
  const [ageRestriction, setAgeRestriction] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [status, setStatus] = useState<'draft' | 'published' | 'cancelled'>('draft')

  // New tier form
  const [newTierName, setNewTierName] = useState('')
  const [newTierPrice, setNewTierPrice] = useState('')
  const [newTierQty, setNewTierQty] = useState('')
  const [newTierDesc, setNewTierDesc] = useState('')
  const [addingTier, setAddingTier] = useState(false)
  const [showAddTier, setShowAddTier] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.get(`/promoter-events/${id}`),
      api.get(`/promoter-events/${id}/attendees`),
    ]).then(([evRes, attRes]) => {
      const ev = evRes.data
      setEvent(ev)
      setTitle(ev.title)
      setDescription(ev.description || '')
      setEventDate(ev.event_date)
      setStartTime(ev.start_time || '')
      setEndTime(ev.end_time || '')
      setVenueName(ev.venue_name || '')
      setVenueAddress(ev.venue_address || '')
      setCity(ev.city || '')
      setState(ev.state || '')
      setCategory(ev.category || '')
      setAgeRestriction(ev.age_restriction || '')
      setImageUrl(ev.image_url || '')
      setStatus(ev.status)
      setAttendees(attRes.data || [])
    }).catch(e => setError(e.response?.data?.message || 'Failed to load event'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess(''); setSaving(true)
    try {
      const res = await api.put(`/promoter-events/${id}`, {
        title, description: description || undefined,
        event_date: eventDate, start_time: startTime || undefined,
        end_time: endTime || undefined, venue_name: venueName || undefined,
        venue_address: venueAddress || undefined, city: city || undefined,
        state: state || undefined, category: category || undefined,
        age_restriction: ageRestriction || undefined, image_url: imageUrl || undefined,
        status,
      })
      setEvent(res.data)
      setSuccess('Event saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleAddTier = async (e: React.FormEvent) => {
    e.preventDefault(); setAddingTier(true)
    try {
      const res = await api.post(`/promoter-events/${id}/tiers`, {
        name: newTierName,
        price: parseFloat(newTierPrice) || 0,
        quantity: parseInt(newTierQty) || 0,
        description: newTierDesc || undefined,
      })
      setEvent(prev => prev ? { ...prev, ticket_tiers: [...prev.ticket_tiers, res.data] } : prev)
      setNewTierName(''); setNewTierPrice(''); setNewTierQty(''); setNewTierDesc('')
      setShowAddTier(false)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add tier')
    } finally {
      setAddingTier(false)
    }
  }

  const handleDeleteTier = async (tierId: string) => {
    if (!confirm('Delete this ticket tier?')) return
    try {
      await api.delete(`/promoter-events/tiers/${tierId}`)
      setEvent(prev => prev ? { ...prev, ticket_tiers: prev.ticket_tiers.filter(t => t.id !== tierId) } : prev)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete tier')
    }
  }

  const handleDeleteEvent = async () => {
    if (!confirm('Delete this event? This cannot be undone.')) return
    try {
      await api.delete(`/promoter-events/${id}`)
      router.push('/dashboard/promoter/events')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete event')
    }
  }

  const copyPublicLink = () => {
    const url = `${window.location.origin}/events/${id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Event not found</p>
      </div>
    )
  }

  const totalSold = event.ticket_tiers.reduce((s, t) => s + t.quantity_sold, 0)
  const totalCap = event.ticket_tiers.reduce((s, t) => s + t.quantity, 0)
  const revenue = attendees.reduce((s, a) => s + Number(a.amount_paid), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/promoter/events" className="text-sm text-gray-500 hover:text-gray-700">← Events</Link>
            <span className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{event.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[event.status]}`}>{event.status}</span>
            {event.status === 'published' && (
              <a href={`/events/${id}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-purple-600 hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> View Public
              </a>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {success}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Tickets Sold</p>
            <p className="text-2xl font-bold text-purple-600">{totalSold}<span className="text-sm text-gray-400 font-normal">/{totalCap}</span></p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Attendees</p>
            <p className="text-2xl font-bold text-gray-900">{attendees.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Revenue</p>
            <p className="text-2xl font-bold text-green-600">${revenue.toFixed(2)}</p>
          </div>
        </div>

        {/* Public link */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-800">Public event link</p>
            <p className="text-xs text-purple-600 mt-0.5">{`${typeof window !== 'undefined' ? window.location.origin : ''}/events/${id}`}</p>
          </div>
          <button onClick={copyPublicLink}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700">
            {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['details', 'tiers', 'attendees'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab === 'tiers' ? 'Ticket Tiers' : tab === 'attendees' ? `Attendees (${attendees.length})` : 'Details'}
            </button>
          ))}
        </div>

        {/* DETAILS TAB */}
        {activeTab === 'details' && (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Event Info</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                    <option value="">Select category</option>
                    {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age Restriction</label>
                  <select value={ageRestriction} onChange={e => setAgeRestriction(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                    <option value="">All ages</option>
                    <option value="18+">18+</option>
                    <option value="21+">21+</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Venue</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name</label>
                <input value={venueName} onChange={e => setVenueName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <input value={venueAddress} onChange={e => setVenueAddress(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input value={city} onChange={e => setCity(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input value={state} onChange={e => setState(e.target.value)} maxLength={2} placeholder="GA"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Status</h3>
              <div className="flex gap-3">
                {(['draft','published','cancelled'] as const).map(s => (
                  <label key={s} className={`flex-1 flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer capitalize ${status === s ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" className="sr-only" checked={status === s} onChange={() => setStatus(s)} />
                    <span className="text-sm font-medium">{s}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button type="button" onClick={handleDeleteEvent}
                className="px-4 py-2 text-red-600 border border-red-200 rounded-xl text-sm hover:bg-red-50">
                Delete Event
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* TIERS TAB */}
        {activeTab === 'tiers' && (
          <div className="space-y-4">
            {event.ticket_tiers.length === 0 && !showAddTier ? (
              <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
                <Tag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 font-medium">No ticket tiers</p>
                <button onClick={() => setShowAddTier(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                  <Plus className="w-4 h-4" /> Add Tier
                </button>
              </div>
            ) : (
              <>
                {event.ticket_tiers.map(tier => (
                  <div key={tier.id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{tier.name}</h4>
                        {tier.description && <p className="text-xs text-gray-500 mt-0.5">{tier.description}</p>}
                        <div className="flex gap-4 mt-2">
                          <span className="flex items-center gap-1 text-sm text-gray-700">
                            <DollarSign className="w-3.5 h-3.5 text-green-500" />${Number(tier.price).toFixed(2)}
                          </span>
                          <span className="flex items-center gap-1 text-sm text-gray-700">
                            <Users className="w-3.5 h-3.5 text-blue-500" />
                            {tier.quantity_sold}/{tier.quantity} sold
                          </span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteTier(tier.id)}
                        className="text-gray-400 hover:text-red-500 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 bg-gray-100 rounded-full h-1.5">
                      <div className="bg-purple-500 rounded-full h-1.5 transition-all"
                        style={{ width: `${tier.quantity > 0 ? (tier.quantity_sold / tier.quantity) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}

                {!showAddTier && (
                  <button onClick={() => setShowAddTier(true)}
                    className="w-full py-3 border border-dashed border-purple-300 text-purple-600 rounded-xl text-sm hover:bg-purple-50 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Ticket Tier
                  </button>
                )}
              </>
            )}

            {showAddTier && (
              <form onSubmit={handleAddTier} className="bg-white border border-purple-200 rounded-xl p-5 space-y-3">
                <h4 className="font-semibold text-gray-900">New Ticket Tier</h4>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                  <input value={newTierName} onChange={e => setNewTierName(e.target.value)} required
                    placeholder="VIP, General Admission..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Price *</label>
                    <input type="number" min="0" step="0.01" value={newTierPrice}
                      onChange={e => setNewTierPrice(e.target.value)} required placeholder="0.00"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Capacity *</label>
                    <input type="number" min="1" value={newTierQty}
                      onChange={e => setNewTierQty(e.target.value)} required placeholder="100"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <input value={newTierDesc} onChange={e => setNewTierDesc(e.target.value)}
                    placeholder="What's included..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowAddTier(false)}
                    className="px-4 py-2 text-gray-600 text-sm hover:bg-gray-100 rounded-lg">Cancel</button>
                  <button type="submit" disabled={addingTier}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-60">
                    {addingTier ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Add Tier
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ATTENDEES TAB */}
        {activeTab === 'attendees' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {attendees.length === 0 ? (
              <div className="p-10 text-center">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No attendees yet</p>
                <p className="text-sm text-gray-400 mt-1">Ticket buyers will appear here after purchase</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tier</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Paid</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map(a => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800 font-medium">{a.buyer_email}</td>
                      <td className="px-4 py-3 text-gray-600">{a.ticket_tiers?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-800">${Number(a.amount_paid).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          a.status === 'valid' ? 'bg-green-100 text-green-700' :
                          a.status === 'checked_in' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{a.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
