'use client'

interface FitImageProps {
  src: string
  alt: string
  /** Size and shape of the frame, e.g. "h-44". */
  className?: string
  imgClassName?: string
  loading?: 'lazy' | 'eager'
  onError?: () => void
}

/**
 * Shows the whole picture, never cropped. Any space around it is filled with a blurred copy of the
 * same picture, so flyers and posters with text along the edges stay readable.
 */
export default function FitImage({ src, alt, className = '', imgClassName = '', loading, onError }: FitImageProps) {
  return (
    <div className={`relative overflow-hidden bg-gray-900 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        onError={onError}
        className={`relative h-full w-full object-contain ${imgClassName}`}
      />
    </div>
  )
}
