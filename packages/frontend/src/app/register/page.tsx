'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Building2, Megaphone, Music2, Wrench, ArrowRight } from 'lucide-react'

function RoleSelectorInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref') || ''

  const roles = [
    {
      key: 'owner',
      label: 'Venue Owner',
      description: 'Manage your venue, bookings, and events',
      icon: Building2,
      color: 'bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100',
      iconColor: 'text-blue-600',
      href: `/register/owner${ref ? `?ref=${ref}` : ''}`,
    },
    {
      key: 'promoter',
      label: 'Promoter',
      description: 'Promote events, manage ticket sales and door lists',
      icon: Megaphone,
      color: 'bg-purple-50 border-purple-200 hover:border-purple-400 hover:bg-purple-100',
      iconColor: 'text-purple-600',
      href: `/register/promoter${ref ? `?ref=${ref}` : ''}`,
    },
    {
      key: 'artist',
      label: 'Artist',
      description: 'Book gigs, manage payments and your performance schedule',
      icon: Music2,
      color: 'bg-pink-50 border-pink-200 hover:border-pink-400 hover:bg-pink-100',
      iconColor: 'text-pink-600',
      href: `/register/artist${ref ? `?ref=${ref}` : ''}`,
    },
    {
      key: 'vendor',
      label: 'Vendor',
      description: 'Offer event services — DJ, décor, photography and more',
      icon: Wrench,
      color: 'bg-amber-50 border-amber-200 hover:border-amber-400 hover:bg-amber-100',
      iconColor: 'text-amber-600',
      href: `/vendors/register${ref ? `?ref=${ref}` : ''}`,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <Link href="/" className="text-sm text-indigo-600 hover:underline">← Back to Home</Link>
          <h1 className="mt-4 text-3xl font-extrabold text-gray-900">Create your account</h1>
          <p className="mt-2 text-gray-500 text-sm">Select your role to get started on Eventecos</p>
          {ref && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-full text-sm text-indigo-700">
              <ArrowRight className="w-3.5 h-3.5" />
              You were referred by an affiliate partner — your code will be saved automatically.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roles.map(role => {
            const Icon = role.icon
            return (
              <button
                key={role.key}
                onClick={() => router.push(role.href)}
                className={`flex flex-col items-start gap-3 p-6 rounded-2xl border-2 text-left transition-all ${role.color}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm`}>
                  <Icon className={`w-5 h-5 ${role.iconColor}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{role.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{role.description}</p>
                </div>
                <ArrowRight className={`w-4 h-4 ${role.iconColor} mt-auto`} />
              </button>
            )
          })}
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <RoleSelectorInner />
    </Suspense>
  )
}



