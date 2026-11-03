export const MAX_LISTING_PHOTOS = 5;

/**
 * Photos for a card: the uploaded photos first, then the cover photo, capped at max. A logo is only used
 * when nothing else exists, so a card never mixes logos into a photo carousel.
 */
export function mergePhotos(
  uploaded: string[],
  extras: Array<string | null | undefined>,
  logoFallback?: string | null,
  max = MAX_LISTING_PHOTOS,
): string[] {
  const seen = new Set<string>();
  const photos: string[] = [];
  for (const url of [...uploaded, ...extras]) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    photos.push(url);
    if (photos.length >= max) break;
  }
  if (photos.length === 0 && logoFallback) return [logoFallback];
  return photos;
}

/** Only files our own upload endpoint stored are accepted, so listings cannot point at arbitrary hosts. */
export function isOwnGalleryUrl(
  url: unknown,
  supabaseUrl: string | undefined,
): url is string {
  if (typeof url !== 'string' || !supabaseUrl) return false;
  const prefix = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/vendor-images/gallery/`;
  return url.startsWith(prefix) && url.length < 600 && !/\s/.test(url);
}
