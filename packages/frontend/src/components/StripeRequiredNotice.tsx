import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import type { StripeRequired } from '@/lib/stripeRequired'

/** Shown when an invoice can't be sent because the sender hasn't finished registering with Stripe. */
export default function StripeRequiredNotice({ notice }: { notice: StripeRequired }) {
  const pending = notice.connectStatus === 'pending'
  return (
    <div role="alert" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="font-semibold text-amber-900">
            {pending ? 'Finish your Stripe registration to send invoices' : 'Register with Stripe to send invoices'}
          </p>
          <p className="mt-1 text-sm text-amber-800">{notice.message}</p>
          <Link
            href={notice.connectPath}
            className="mt-3 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            {pending ? 'Finish Stripe registration' : 'Register with Stripe'}
          </Link>
        </div>
      </div>
    </div>
  )
}
