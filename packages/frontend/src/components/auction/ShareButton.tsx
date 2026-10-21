'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Share2 } from 'lucide-react'

interface Props {
  /** Site-relative canonical path (slug URL when one exists). */
  path: string
  title: string
  className?: string
}

export default function ShareButton({ path, title, className = '' }: Props) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const flash = (s: 'copied' | 'failed') => {
    setStatus(s)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('idle'), 2500)
  }

  const share = async () => {
    const url = `${window.location.origin}${path}`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url })
        return
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      flash('copied')
    } catch {
      window.prompt('Copy this link:', url)
      flash('failed')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={share}
        className={`inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 ${className}`}
      >
        {status === 'copied' ? <Check className="h-4 w-4 text-green-600" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
        {status === 'copied' ? 'Link copied' : 'Share'}
      </button>
      <span role="status" className="sr-only">{status === 'copied' ? 'Link copied to clipboard' : ''}</span>
    </>
  )
}
