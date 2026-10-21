'use client'

import PhotoCarousel from './PhotoCarousel'

/** Item photos: a swipeable carousel with arrows, thumbnails and keyboard support. */
export default function ItemGallery({ images, title }: { images: string[]; title: string }) {
  return (
    <PhotoCarousel
      photos={images.map((src, i) => ({ src, alt: `${title} - photo ${i + 1} of ${images.length}` }))}
      label={`Photos of ${title}`}
      fit="contain"
      showThumbnails
    />
  )
}
