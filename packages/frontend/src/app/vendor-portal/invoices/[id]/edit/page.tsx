'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { FileText, Loader2, Info } from 'lucide-react'
import VendorDocumentForm, { type VendorDocumentValues } from '@/components/vendor/VendorDocumentForm'
import { newLine } from '@/components/vendor/LineItemsEditor'

const EDITABLE = ['draft', 'sent', 'viewed', 'overdue']
const SAVE_TIMEOUT_MS = 45000

export default function EditVendorInvoicePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [invoice, setInvoice] = useState<any>(null)
  const [initial, setInitial] = useState<VendorDocumentValues | null>(null)
  const [notifyClient, setNotifyClient] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/vendor-invoices/${id}`)
        const inv = res.data
        setInvoice(inv)
        const lines = (inv.vendor_invoice_items ?? []).map((i: any) =>
          newLine({ id: i.id, description: i.description, quantity: String(Number(i.quantity)), unit_price: String(Number(i.unit_price)) }),
        )
        setInitial({
          client_name: inv.client_name || '',
          client_email: inv.client_email || '',
          client_phone: inv.client_phone || '',
          issue_date: inv.issue_date || '',
          end_date: inv.due_date || '',
          tax_rate: String(Number(inv.tax_rate) || 0),
          discount_amount: String(Number(inv.discount_amount) || 0),
          notes: inv.notes || '',
          terms: inv.terms || '',
          lines: lines.length ? lines : [newLine()],
        })
      } catch {
        router.push('/vendor-portal/invoices')
      }
    }
    load()
  }, [id, router])

  if (!invoice || !initial) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  const editable = EDITABLE.includes(invoice.status)
  const alreadySent = invoice.status !== 'draft'
  const amountPaid = Number(invoice.amount_paid) || 0

  const notice = alreadySent ? (
    <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-4 text-sm space-y-3">
      <div className="flex gap-2">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">This invoice was already sent.</p>
          <p className="text-blue-800">
            You can add or change items. The client will see the new total, and any payment page they already opened
            for the old amount stops working.
            {amountPaid > 0 && ` $${amountPaid.toFixed(2)} has already been paid and stays credited.`}
          </p>
        </div>
      </div>
      <label className="flex items-center gap-2 text-blue-900">
        <input
          type="checkbox"
          checked={notifyClient}
          onChange={e => setNotifyClient(e.target.checked)}
          className="rounded border-blue-300"
        />
        Email and text the client the updated invoice after saving
      </label>
    </div>
  ) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href={`/vendor-portal/invoices/${id}`} className="text-sm text-gray-400 hover:text-gray-600 mb-1 inline-block">
          ← Back to Invoice
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <FileText className="w-6 h-6 text-primary-600" />
          Edit Invoice {invoice.invoice_number}
        </h1>

        {!editable ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
            This invoice is {invoice.status}, so it can no longer be edited.{' '}
            <Link href={`/vendor-portal/invoices/${id}`} className="text-primary-600 underline">
              Back to the invoice
            </Link>
          </div>
        ) : (
          <VendorDocumentForm
            kind="invoice"
            initial={initial}
            top={notice}
            submitLabel={alreadySent ? 'Save & Update Invoice' : 'Save Changes'}
            savingLabel="Saving…"
            cancelHref={`/vendor-portal/invoices/${id}`}
            onSubmit={async p => {
              await api.put(
                `/vendor-invoices/${id}/contents`,
                {
                  client_name: p.client_name,
                  client_email: p.client_email,
                  client_phone: p.client_phone,
                  issue_date: p.issue_date,
                  due_date: p.end_date,
                  tax_rate: p.tax_rate,
                  discount_amount: p.discount_amount,
                  notes: p.notes,
                  terms: p.terms,
                  items: p.items,
                },
                { timeout: SAVE_TIMEOUT_MS },
              )
              if (alreadySent && notifyClient) {
                try {
                  await api.post(`/vendor-invoices/${id}/send`, {}, { timeout: SAVE_TIMEOUT_MS })
                } catch (err: any) {
                  throw new Error(
                    `Your changes were saved, but the client could not be notified${
                      err?.response?.data?.message ? `: ${err.response.data.message}` : ''
                    }. Open the invoice and use Send to Client.`,
                  )
                }
              }
              router.push(`/vendor-portal/invoices/${id}`)
            }}
          />
        )}
      </div>
    </div>
  )
}
