'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import api from '@/lib/api'
import AuctionForm, { AuctionFormValues } from '../_components/AuctionForm'
import { Auction } from '../lib'

export default function NewAuctionPage() {
  const router = useRouter()

  const create = async (values: AuctionFormValues) => {
    const res = await api.post<Auction>('/auctions/manage', values)
    router.push(`/dashboard/promoter/auctions/${res.data.id}`)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/dashboard/promoter/auctions" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to auctions
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">New auction</h1>
      <p className="text-sm text-gray-500 mb-6">Create the auction first, then add items and publish it when you are ready.</p>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <AuctionForm submitLabel="Create auction" onSubmit={create} />
      </div>
    </div>
  )
}
