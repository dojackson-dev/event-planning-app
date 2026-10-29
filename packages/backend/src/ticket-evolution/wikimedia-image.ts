/**
 * Wikipedia's summary API hands back the original upload, which can be many megabytes and thousands of
 * pixels wide (one event photo was 6 MB). Event cards show images roughly 400 px wide, so ask Wikimedia
 * for a 960 px copy instead (a size it serves from its CDN cache, sharp on high-density screens).
 */
export const CARD_IMAGE_WIDTH = 960;

interface SummaryImage {
  source?: string;
  width?: number;
}

export interface WikipediaSummaryImages {
  thumbnail?: SummaryImage;
  originalimage?: SummaryImage;
}

const WIKIMEDIA_HOSTS = new Set([
  'upload.wikimedia.org',
  'thumb.wikimedia.org',
]);
// Both hosts serve the same files at the same paths, but thumb.wikimedia.org does not resolve for some
// visitors' networks (the photo then shows as a placeholder), so every URL is served from upload.wikimedia.org.
const IMAGE_ORIGIN = 'https://upload.wikimedia.org';
const RESIZABLE = /\.(jpe?g|png)$/i;

/** A copy of the image at `width` pixels on upload.wikimedia.org, or the same file when it is already small enough or cannot be resized safely. */
export function sizeWikimediaImage(
  source: string,
  knownWidth: number | undefined,
  width: number = CARD_IMAGE_WIDTH,
): string {
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return source;
  }
  if (!WIKIMEDIA_HOSTS.has(url.hostname)) return source;

  // The same file on the reliable host, without the tracking parameters Wikipedia appends.
  const sameFile = `${IMAGE_ORIGIN}${url.pathname}`;

  // Already a thumbnail such as .../3840px-Name.jpg: shrink it when it is wider than needed.
  const thumb = url.pathname.match(/^(.*\/thumb\/.+\/)(\d+)px-([^/]+)$/);
  if (thumb) {
    return Number(thumb[2]) <= width
      ? sameFile
      : `${IMAGE_ORIGIN}${thumb[1]}${width}px-${thumb[3]}`;
  }

  // A full-size original: build the thumbnail URL, but only when we know it is wider than the target
  // (Wikimedia refuses to enlarge) and it is a format it can resize.
  const original = url.pathname.match(
    /^\/wikipedia\/(commons|en)\/([0-9a-f])\/([0-9a-f]{2})\/([^/]+)$/,
  );
  if (!original || knownWidth === undefined || knownWidth <= width) {
    return sameFile;
  }
  const [, project, dirA, dirAb, file] = original;
  if (!RESIZABLE.test(file)) return sameFile;
  return `${IMAGE_ORIGIN}/wikipedia/${project}/thumb/${dirA}/${dirAb}/${file}/${width}px-${file}`;
}

/** The best card-sized image from a Wikipedia summary, or null when the page has none. */
export function pickWikipediaImage(
  data: WikipediaSummaryImages,
  width: number = CARD_IMAGE_WIDTH,
): string | null {
  const original = data.originalimage;
  if (original?.source) {
    return sizeWikimediaImage(original.source, original.width, width);
  }
  return data.thumbnail?.source ?? null;
}
