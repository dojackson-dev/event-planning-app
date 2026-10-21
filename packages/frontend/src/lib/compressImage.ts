export const MAX_SOURCE_IMAGE_BYTES = 40 * 1024 * 1024
const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

interface CompressOptions {
  /** Target size; files at or under this (and within maxDimension) are returned untouched. */
  maxBytes: number
  maxDimension?: number
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file)
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() }
    } catch {
      // fall through to <img> decoding
    }
  }
  const url = URL.createObjectURL(file)
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Could not read that image.'))
    img.src = url
  })
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

let outputType: Promise<'image/webp' | 'image/jpeg'> | null = null

// Safari can't encode WebP via canvas and silently returns PNG, so fall back to JPEG there.
function pickOutputType(): Promise<'image/webp' | 'image/jpeg'> {
  if (!outputType) {
    const probe = document.createElement('canvas')
    probe.width = probe.height = 1
    outputType = toBlob(probe, 'image/webp', 0.8).then((b) => (b?.type === 'image/webp' ? 'image/webp' : 'image/jpeg'))
  }
  return outputType
}

/**
 * Shrinks an oversized photo in the browser (resize + re-encode) so it fits under `maxBytes`.
 * Returns the original file when it is already small enough or can't be processed.
 */
export async function compressImage(file: File, { maxBytes, maxDimension = 2000 }: CompressOptions): Promise<File> {
  if (!SUPPORTED_TYPES.includes(file.type)) return file
  if (file.size > MAX_SOURCE_IMAGE_BYTES) throw new Error('That photo is too large. Please choose one under 40 MB.')

  let decoded
  try {
    decoded = await decode(file)
  } catch {
    return file
  }

  try {
    const { source, width, height } = decoded
    const needsResize = Math.max(width, height) > maxDimension
    if (file.size <= maxBytes && !needsResize) return file

    const type = await pickOutputType()
    const ext = type === 'image/webp' ? '.webp' : '.jpg'
    let scale = Math.min(1, maxDimension / Math.max(width, height))
    for (let attempt = 0; attempt < 6; attempt++) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) return file
      if (type === 'image/jpeg') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height)

      for (const quality of [0.85, 0.75, 0.65, 0.5]) {
        const blob = await toBlob(canvas, type, quality)
        if (blob && blob.type === type && blob.size <= maxBytes) {
          return new File([blob], file.name.replace(/\.[^.]+$/, '') + ext, { type, lastModified: Date.now() })
        }
      }
      scale *= 0.75
    }
  } finally {
    decoded.release()
  }
  throw new Error(`Could not shrink that photo under ${Math.round(maxBytes / 1024 / 1024)} MB. Please try a smaller one.`)
}
