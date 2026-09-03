'use client'

import { useState } from 'react'
import { Code2, Copy, CheckCircle2 } from 'lucide-react'

interface EmbedBookingSectionProps {
  /** Full public booking-link URL, e.g. `${origin}/book-venue/my-slug` */
  url: string
}

/**
 * Shows a copy-pasteable <iframe> snippet so a venue owner / artist /
 * promoter / vendor can embed their public booking-request form directly
 * inside their own website. Shared across all 4 booking-link settings pages.
 */
export default function EmbedBookingSection({ url }: EmbedBookingSectionProps) {
  const [copied, setCopied] = useState(false)

  if (!url) return null

  const iframeCode = `<iframe\n  src="${url}"\n  width="100%"\n  height="820"\n  style="border:0;max-width:640px;"\n  title="Booking Request Form"\n></iframe>`

  const copyCode = () => {
    navigator.clipboard.writeText(iframeCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
        <Code2 className="w-4 h-4 text-gray-400" /> Embed on Your Website
      </label>
      <p className={`text-xs text-gray-400 mb-3`}>
        Paste this snippet into your own site&apos;s HTML so visitors can submit a booking request without ever leaving your page.
      </p>
      <div className="relative">
        <pre className="bg-gray-900 text-gray-100 text-xs leading-relaxed rounded-lg p-3 pr-20 overflow-x-auto whitespace-pre">
          <code>{iframeCode}</code>
        </pre>
        <button
          type="button"
          onClick={copyCode}
          className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Tip: adjust the <span className="font-mono">height</span> value if the form looks cramped or leaves extra empty space on your site.
      </p>
    </div>
  )
}
