'use client'

import { useState } from 'react'
import { type LucideIcon } from 'lucide-react'

interface Props {
  /** File in /public/lib/home/, e.g. "hero-main.jpg". Until it exists the tile shows a soft placeholder. */
  file: string
  alt: string
  className?: string
  Icon?: LucideIcon
  imgClassName?: string
}

/** A photo from /public/lib/home/ that falls back to a tinted tile when the file has not been added yet. */
export default function HomePhoto({ file, alt, className = '', Icon, imgClassName = '' }: Props) {
  const [missing, setMissing] = useState(false)
  return (
    <div className={`overflow-hidden bg-gradient-to-br from-accent-100 via-primary-50 to-accent-50 ${className}`}>
      {missing ? (
        Icon && (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="h-12 w-12 text-accent-300" aria-hidden="true" />
          </div>
        )
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/lib/home/${file}`}
          alt={alt}
          onError={() => setMissing(true)}
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      )}
    </div>
  )
}
