'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Globe, Mail, Phone, MapPin, Trash2, Save, ExternalLink } from 'lucide-react'

interface Tenant {
  id: string
  name: string
  subdomain: string
  custom_url: string | null
  subscription_status: string
  created_at: string
  updated_at: string
}

export default function TenantDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    custom_url: '',
    subscription_status: 'active'
  })

  useEffect(() => {
    fetchTenant()
  }, [params.id])

  const fetchTenant = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error

      setTenant(data)
      setFormData({
        name: data.name,
        subdomain: data.subdomain,
        custom_url: data.custom_url || '',
        subscription_status: data.subscription_status
      })
    } catch (error) {
      console.error('Error fetching tenant:', error)
      setMessage('Error loading tenant details')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tenants')
        .update({
          name: formData.name,
          subdomain: formData.subdomain,
          custom_url: formData.custom_url || null,
          subscription_status: formData.subscription_status
        })
        .eq('id', params.id)

      if (error) throw error

      setMessage('Tenant updated successfully!')
      fetchTenant()
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', params.id)

      if (error) throw error

      router.push('/admin/tenants')
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading tenant details...</div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Tenant not found</h2>
          <Link href="/admin/tenants" className="text-primary-600 hover:text-primary-800">
            ← Back to Tenants
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/admin/tenants" className="text-sm text-primary-600 hover:text-primary-800 mb-2 inline-block">
            ← Back to Tenants
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
              <p className="mt-1 text-sm text-gray-500">Manage tenant details and settings</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/websites/${tenant.id}`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Globe className="h-5 w-5 mr-2" />
                Manage Website
              </Link>
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  tenant.subscription_status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {tenant.subscription_status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.startsWith('Error')
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-green-50 text-green-800 border border-green-200'
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Tenant Information</h2>
              </div>
              <form onSubmit={handleUpdate} className="p-6 space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Tenant Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700 mb-2">
                    Subdomain <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="subdomain"
                    name="subdomain"
                    required
                    value={formData.subdomain}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label htmlFor="custom_url" className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Website URL
                  </label>
                  <input
                    type="url"
                    id="custom_url"
                    name="custom_url"
                    value={formData.custom_url}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="https://www.example.com"
                  />
                  {formData.custom_url && (
                    <a
                      href={formData.custom_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center text-sm text-primary-600 hover:text-primary-800"
                    >
                      Visit website <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  )}
                </div>

                <div>
                  <label htmlFor="subscription_status" className="block text-sm font-medium text-gray-700 mb-2">
                    Subscription Status
                  </label>
                  <select
                    id="subscription_status"
                    name="subscription_status"
                    value={formData.subscription_status}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
                  >
                    <Save className="h-5 w-5 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Metadata */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Metadata</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Tenant ID:</span>
                  <p className="text-gray-900 font-mono text-xs mt-1">{tenant.id}</p>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>
                  <p className="text-gray-900 mt-1">{new Date(tenant.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Last Updated:</span>
                  <p className="text-gray-900 mt-1">{new Date(tenant.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href={`/admin/websites/${tenant.id}`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Manage Website
                </Link>
                <Link
                  href={`/admin/tenants/${tenant.id}/users`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  View Users
                </Link>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-lg shadow p-6 border-2 border-red-200">
              <h3 className="text-sm font-semibold text-red-900 mb-4">Danger Zone</h3>
              <button
                onClick={handleDelete}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Tenant
              </button>
              <p className="mt-2 text-xs text-gray-600">This action cannot be undone.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
