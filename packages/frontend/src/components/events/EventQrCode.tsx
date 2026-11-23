'use client'

import { useRef, useState } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { Copy, CheckCircle, Download, Printer } from 'lucide-react'

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'event'
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

/** A scannable code for an event's public ticket page, with files to download and a poster to print. */
export default function EventQrCode({ url, title, subtitle, published = true }: { url: string; title: string; subtitle?: string; published?: boolean }) {
  const svgRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const base = slug(title)

  const save = (blob: Blob, name: string) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const svgMarkup = () => svgRef.current?.querySelector('svg')?.outerHTML ?? ''

  const downloadPng = () => {
    canvasRef.current?.querySelector('canvas')?.toBlob(b => b && save(b, `${base}-qr.png`), 'image/png')
  }

  const downloadSvg = () => {
    const markup = svgMarkup()
    if (markup) save(new Blob([markup.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')], { type: 'image/svg+xml' }), `${base}-qr.svg`)
  }

  const printPoster = () => {
    const w = window.open('', '_blank', 'width=800,height=1000')
    if (!w) return
    w.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
      body{font-family:Arial,sans-serif;text-align:center;padding:48px;color:#111}
      h1{font-size:44px;margin:0 0 8px} h2{font-size:22px;font-weight:normal;color:#555;margin:0 0 32px}
      .qr svg{width:420px;height:420px} .cta{font-size:34px;font-weight:bold;margin:28px 0 8px}
      .url{font-size:16px;color:#555;word-break:break-all} .brand{margin-top:40px;font-size:14px;color:#888}
    </style></head><body>
      <h1>${escapeHtml(title)}</h1>${subtitle ? `<h2>${escapeHtml(subtitle)}</h2>` : ''}
      <div class="qr">${svgMarkup()}</div>
      <div class="cta">Scan for tickets</div><div class="url">${escapeHtml(url)}</div>
      <div class="brand">Tickets by EventEcos</div>
      <script>window.onload=function(){window.print()}</script>
    </body></html>`)
    w.document.close()
  }

  const copy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg'

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex flex-col sm:flex-row items-start gap-4">
      <div ref={svgRef} className="bg-white p-2 rounded-lg border border-purple-100 shrink-0" aria-label="QR code for this event">
        <QRCodeSVG value={url} size={132} level="H" includeMargin={false} />
      </div>
      {/* A larger canvas, never shown, is what the PNG download is made from. */}
      <div ref={canvasRef} className="hidden" aria-hidden="true">
        <QRCodeCanvas value={url} size={1200} level="H" includeMargin marginSize={4} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-purple-800">Public event link and QR code</p>
        <p className="text-xs text-purple-600 mt-0.5 break-all">{url}</p>
        <p className="text-xs text-purple-700 mt-1">Put the code on flyers, posters and social posts. Scanning it opens this event&apos;s ticket page.</p>
        {!published && <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-2 inline-block">Publish the event so people can buy tickets after scanning.</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" onClick={copy} className={`${btn} bg-purple-600 text-white hover:bg-purple-700`}>
            {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Copied!' : 'Copy link'}
          </button>
          <button type="button" onClick={downloadPng} className={`${btn} bg-white border border-purple-300 text-purple-800 hover:bg-purple-100`}><Download className="w-3.5 h-3.5" /> PNG</button>
          <button type="button" onClick={downloadSvg} className={`${btn} bg-white border border-purple-300 text-purple-800 hover:bg-purple-100`}><Download className="w-3.5 h-3.5" /> SVG (for print)</button>
          <button type="button" onClick={printPoster} className={`${btn} bg-white border border-purple-300 text-purple-800 hover:bg-purple-100`}><Printer className="w-3.5 h-3.5" /> Print poster</button>
        </div>
      </div>
    </div>
  )
}
