// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as typeof import('sharp');

export const BANNER_WIDTH = 1200;
export const BANNER_HEIGHT = 400;

/** Average colour of the picture's outer edge, so the space around a fitted image blends with it. */
async function edgeColour(input: Buffer) {
  const size = 16;
  const { data, info } = await sharp(input)
    .resize(size, size, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x !== 0 && y !== 0 && x !== size - 1 && y !== size - 1) continue;
      const i = (y * size + x) * info.channels;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
  }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

/**
 * Banner at a fixed 3:1 size that never crops the picture: the whole image is fitted inside and the
 * leftover space is filled with the colour of the picture's edge.
 */
export async function fitBanner(
  input: Buffer,
  width = BANNER_WIDTH,
  height = BANNER_HEIGHT,
): Promise<Buffer> {
  const upright = await sharp(input).rotate().toBuffer();
  const background = await edgeColour(upright);

  return sharp(upright)
    .resize(width, height, { fit: 'contain', background })
    .webp({ quality: 85 })
    .toBuffer();
}
