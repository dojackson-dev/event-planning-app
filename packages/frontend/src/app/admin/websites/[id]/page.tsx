'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Globe, Eye, Edit, Save, X } from 'lucide-react'

interface Tenant {
  id: string
  name: string
  subdomain: string
  custom_url: string | null
}

interface WebsiteConfig {
  id: string
  tenant_id: string
  theme_color: string
  logo_url: string | null
  hero_title: string
  hero_subtitle: string
  about_text: string
  contact_email: string
  contact_phone: string | null
  address: string | null
  show_booking_form: boolean
  show_gallery: boolean
  published: boolean
  created_at: string
  updated_at: string
}

export default function WebsiteManagementPage({ params }: { params: { id: string } }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [config, setConfig] = useState<WebsiteConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    theme_color: '#3b82f6',
    logo_url: '',
    hero_title: '',
    hero_subtitle: '',
    about_text: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    show_booking_form: true,
    show_gallery: true,
    published: false
  })

  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
    try {
      const supabase = createClient()

      // Fetch tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', params.id)
        .single()

      if (tenantError) throw tenantError
      setTenant(tenantData)

      // Fetch website config
      const { data: configData, error: configError } = await supabase
        .from('website_configs')
        .select('*')
        .eq('tenant_id', params.id)
        .single()

      if (configData) {
        setConfig(configData)
        setFormData({
          theme_color: configData.theme_color,
          logo_url: configData.logo_url || '',
          hero_title: configData.hero_title,
          hero_subtitle: configData.hero_subtitle,
          about_text: configData.about_text,
          contact_email: configData.contact_email,
          contact_phone: configData.contact_phone || '',
          address: configData.address || '',
          show_booking_form: configData.show_booking_form,
          show_gallery: configData.show_gallery,
          published: configData.published
        })
      } else {
        // Set defaults from tenant
        setFormData(prev => ({
          ...prev,
          hero_title: `Welcome to ${tenantData.name}`,
          contact_email: tenantData.subdomain + '@example.com'
        }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const supabase = createClient()

      const dataToSave = {
        tenant_id: params.id,
        theme_color: formData.theme_color,
        logo_url: formData.logo_url || null,
        hero_title: formData.hero_title,
        hero_subtitle: formData.hero_subtitle,
        about_text: formData.about_text,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone || null,
        address: formData.address || null,
        show_booking_form: formData.show_booking_form,
        show_gallery: formData.show_gallery,
        published: formData.published
      }

      if (config) {
        // Update existing config
        const { error } = await supabase
          .from('website_configs')
          .update(dataToSave)
          .eq('id', config.id)

        if (error) throw error
      } else {
        // Create new config
        const { error } = await supabase
          .from('website_configs')
          .insert([dataToSave])

        if (error) throw error
      }

      setMessage('Website configuration saved successfully!')
      fetchData()
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading website configuration...</div>
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href={`/admin/tenants/${params.id}`} className="text-sm text-primary-600 hover:text-primary-800 mb-2 inline-block">
            ← Back to Tenant
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Website Builder</h1>
              <p className="mt-1 text-sm text-gray-500">{tenant.name}</p>
            </div>
            <div className="flex items-center gap-3">
              {config && config.published && (
                <a
                  href={tenant.custom_url || `https://${tenant.subdomain}.example.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Eye className="h-5 w-5 mr-2" />
                  Preview
                </a>
              )}
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  formData.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {formData.published ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        <form onSubmit={handleSave} className="space-y-6">
          {/* Branding Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Branding</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="theme_color" className="block text-sm font-medium text-gray-700 mb-2">
                    Theme Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="theme_color"
                      name="theme_color"
                      value={formData.theme_color}
                      onChange={handleChange}
                      className="h-10 w-20 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={formData.theme_color}
                      onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-2">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    id="logo_url"
                    name="logo_url"
                    value={formData.logo_url}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Hero Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Hero Section</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label htmlFor="hero_title" className="block text-sm font-medium text-gray-700 mb-2">
                  Hero Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="hero_title"
                  name="hero_title"
                  required
                  value={formData.hero_title}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Welcome to Our Event Center"
                />
              </div>

              <div>
                <label htmlFor="hero_subtitle" className="block text-sm font-medium text-gray-700 mb-2">
                  Hero Subtitle
                </label>
                <textarea
                  id="hero_subtitle"
                  name="hero_subtitle"
                  value={formData.hero_subtitle}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Creating unforgettable moments for your special events"
                />
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">About</h2>
            </div>
            <div className="p-6">
              <div>
                <label htmlFor="about_text" className="block text-sm font-medium text-gray-700 mb-2">
                  About Text
                </label>
                <textarea
                  id="about_text"
                  name="about_text"
                  value={formData.about_text}
                  onChange={handleChange}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Tell visitors about your event center..."
                />
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="contact_email"
                    name="contact_email"
                    required
                    value={formData.contact_email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="contact_phone"
                    name="contact_phone"
                    value={formData.contact_phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Features</h2>
            </div>
            <div className="p-6 space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="show_booking_form"
                  checked={formData.show_booking_form}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">Show Booking Form</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="show_gallery"
                  checked={formData.show_gallery}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">Show Gallery</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="published"
                  checked={formData.published}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">Publish Website</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
            <Link
              href={`/admin/tenants/${params.id}`}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
