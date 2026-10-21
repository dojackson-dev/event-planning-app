import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Charity auctions | EventEcos',
  description: 'Bid in online auctions that support verified non-profit organizations.',
}

export default function AuctionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3" aria-label="Auctions">
          <Link href="/auctions" className="text-lg font-bold text-purple-700">EventEcos Auctions</Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">EventEcos home</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
