import type { ReactNode } from 'react'
import { Clock, Send, Eye, CheckCircle2, XCircle, Receipt } from 'lucide-react'

export const ESTIMATE_STATUS: Record<string, { label: string; color: string; icon: ReactNode }> = {
  draft:     { label: 'Draft',    color: 'bg-gray-100 text-gray-600 border-gray-200',          icon: <Clock className="w-3 h-3" /> },
  sent:      { label: 'Sent',     color: 'bg-blue-100 text-blue-700 border-blue-200',           icon: <Send className="w-3 h-3" /> },
  viewed:    { label: 'Viewed',   color: 'bg-purple-100 text-purple-700 border-purple-200',     icon: <Eye className="w-3 h-3" /> },
  approved:  { label: 'Approved', color: 'bg-green-100 text-green-700 border-green-200',        icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected:  { label: 'Declined', color: 'bg-red-100 text-red-700 border-red-200',              icon: <XCircle className="w-3 h-3" /> },
  converted: { label: 'Invoiced', color: 'bg-emerald-100 text-emerald-700 border-emerald-200',  icon: <Receipt className="w-3 h-3" /> },
}

/** Estimates the vendor may still change. */
export const EDITABLE_ESTIMATE_STATUSES = ['draft', 'sent', 'viewed']
