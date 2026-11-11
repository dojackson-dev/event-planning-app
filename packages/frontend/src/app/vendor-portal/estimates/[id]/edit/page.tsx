'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { ClipboardCheck, Loader2, Info } from 'lucide-react'
import VendorDocumentForm, { type VendorDocumentValues } from '@/components/vendor/VendorDocumentForm'
import { newLine } from '@/components/vendor/LineItemsEditor'
import { EDITABLE_ESTIMATE_STATUSES } from '@/components/vendor/estimateStatus'

export default function EditVendorEstimatePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [estimate, setEstimate] = useState<any>(null)
  const [initial, setInitial] = useState<VendorDocumentValues | null>(null)

  useEffect(() => {
    api.get(`/vendor-estimates/${id}`)
      .then(res => {
        const est = res.data
        setEstimate(est)
        const lines = (est.vendor_estimate_items ?? []).map((i: any) =>
          newLine({ description: i.description, quantity: String(Number(i.quantity)), unit_price: String(Number(i.unit_price)) }),
        )
        setInitial({
          client_name: est.client_name || '',
          client_email: est.client_email || '',
          client_phone: est.client_phone || '',
          issue_date: est.issue_date || '',
          end_date: est.expiration_date || '',
          tax_rate: String(Number(est.tax_rate) || 0),
          discount_amount: String(Number(est.discount_amount) || 0),
          notes: est.notes || '',
          terms: est.terms || '',
          lines: lines.length ? lines : [newLine()],
        })
      })
      .catch(() => router.push('/vendors/dashboard/estimates'))
  }, [id, router])

  if (!estimate || !initial) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  const editable = EDITABLE_ESTIMATE_STATUSES.includes(estimate.status)
  const alreadySent = estimate.status !== 'draft'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href={`/vendor-portal/estimates/${id}`} className="text-sm text-gray-400 hover:text-gray-600 mb-1 inline-block">
          ← Back to Estimate
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <ClipboardCheck className="w-6 h-6 text-primary-600" />
          Edit Estimate {estimate.estimate_number}
        </h1>

        {!editable ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
            This estimate is {estimate.status}, so it can no longer be edited.{' '}
            <Link href={`/vendor-portal/estimates/${id}`} className="text-primary-600 underline">Back to the estimate</Link>
          </div>
        ) : (
          <VendorDocumentForm
            kind="estimate"
            initial={initial}
            top={
              alreadySent ? (
                <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-4 text-sm flex gap-2">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    This estimate was already sent. After you save, use <strong>Send to Client</strong> again so they
                    see the updated numbers.
                  </p>
                </div>
              ) : null
            }
            submitLabel="Save Changes"
            savingLabel="Saving…"
            cancelHref={`/vendor-portal/estimates/${id}`}
            onSubmit={async p => {
              await api.put(
                `/vendor-estimates/${id}`,
                {
                  client_name: p.client_name,
                  client_email: p.client_email,
                  client_phone: p.client_phone,
                  issue_date: p.issue_date,
                  expiration_date: p.end_date,
                  tax_rate: p.tax_rate,
                  discount_amount: p.discount_amount,
                  notes: p.notes,
                  terms: p.terms,
                  items: p.items.map(({ description, quantity, unit_price }) => ({ description, quantity, unit_price })),
                },
                { timeout: 45000 },
              )
              router.push(`/vendor-portal/estimates/${id}`)
            }}
          />
        )}
      </div>
    </div>
  )
}
