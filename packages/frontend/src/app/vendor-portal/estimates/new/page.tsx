'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { ClipboardCheck } from 'lucide-react'
import VendorDocumentForm, { type VendorDocumentValues } from '@/components/vendor/VendorDocumentForm'
import { newLine } from '@/components/vendor/LineItemsEditor'

/** Today (in the vendor's own time zone) plus `days`, as YYYY-MM-DD. */
const localDate = (days = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 10)
}

function NewVendorEstimateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [initial] = useState<VendorDocumentValues>(() => ({
    client_name: searchParams.get('clientName') || '',
    client_email: searchParams.get('clientEmail') || '',
    client_phone: searchParams.get('clientPhone') || '',
    issue_date: localDate(0),
    end_date: localDate(30),
    tax_rate: '0',
    discount_amount: '0',
    notes: '',
    terms: '',
    lines: [newLine()],
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/vendors/dashboard/estimates" className="text-sm text-gray-400 hover:text-gray-600 mb-1 inline-block">
          ← Back to Estimates
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <ClipboardCheck className="w-6 h-6 text-primary-600" />
          New Estimate
        </h1>

        <VendorDocumentForm
          kind="estimate"
          initial={initial}
          submitLabel="Create Estimate"
          savingLabel="Saving…"
          cancelHref="/vendors/dashboard/estimates"
          onSubmit={async p => {
            const res = await api.post(
              '/vendor-estimates',
              {
                client_name: p.client_name,
                client_email: p.client_email,
                client_phone: p.client_phone ?? undefined,
                issue_date: p.issue_date,
                expiration_date: p.end_date,
                tax_rate: p.tax_rate,
                discount_amount: p.discount_amount,
                notes: p.notes ?? undefined,
                terms: p.terms ?? undefined,
                items: p.items,
              },
              { timeout: 45000 },
            )
            router.push(`/vendor-portal/estimates/${res.data.id}`)
          }}
        />
      </div>
    </div>
  )
}

export default function NewVendorEstimatePage() {
  return (
    <Suspense>
      <NewVendorEstimateContent />
    </Suspense>
  )
}
