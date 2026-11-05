// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as typeof import('sharp');
import { fitBanner } from './banner';

describe('fitBanner', () => {
  const solid = (width: number, height: number, hex: string) =>
    sharp({
      create: { width, height, channels: 3, background: hex },
    })
      .png()
      .toBuffer();

  it('always returns a 1200x400 webp', async () => {
    for (const [w, h] of [
      [600, 600],
      [300, 900],
      [2000, 500],
    ]) {
      const out = await fitBanner(await solid(w, h, '#ff0000'));
      const meta = await sharp(out).metadata();
      expect([meta.width, meta.height, meta.format]).toEqual([
        1200,
        400,
        'webp',
      ]);
    }
  });

  it('keeps the whole picture instead of cropping it', async () => {
    // A tall image with a blue top and bottom edge: both must survive in the banner.
    const tall = await sharp({
      create: { width: 400, height: 1200, channels: 3, background: '#ffffff' },
    })
      .composite([
        {
          input: await solid(400, 60, '#0000ff'),
          top: 0,
          left: 0,
        },
        {
          input: await solid(400, 60, '#0000ff'),
          top: 1140,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    const out = await fitBanner(tall);
    const { data, info } = await sharp(out)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return [data[i], data[i + 1], data[i + 2]];
    };
    // Centre column: top of the banner is the blue edge, the middle is white.
    expect(px(600, 3)[2]).toBeGreaterThan(150);
    expect(px(600, 3)[0]).toBeLessThan(100);
    expect(px(600, 200)[0]).toBeGreaterThan(200);
    expect(px(600, 396)[0]).toBeLessThan(100);
  });
});
