// Regenerates the app icon, Android adaptive icon, splash image and favicon from
// assets/eventecos-logo.jpg (2048x2048, logo on white).  Run: node generate-icons.js
const sharp = require('sharp');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');
const logoPath = path.join(assetsDir, 'eventecos-logo.jpg');
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// Logo scaled to `ratio` of a square canvas, centered on `background`.
async function compose({ size, ratio, background, out, flatten = true }) {
  const inner = Math.round(size * ratio);
  const logo = await sharp(logoPath).resize(inner, inner, { fit: 'contain', background: WHITE }).toBuffer();
  let img = sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: logo, gravity: 'center' }]);
  // The App Store rejects icons with an alpha channel.
  if (flatten) img = img.flatten({ background: WHITE }).removeAlpha();
  await img.png().toFile(path.join(assetsDir, out));
  console.log(`✓ ${out}`);
}

(async () => {
  // iOS rounds the corners itself, so the artwork fills most of the square.
  await compose({ size: 1024, ratio: 0.9, background: WHITE, out: 'icon.png' });
  // Android adaptive icons crop to a circle/squircle; keep the logo in the ~66% safe zone.
  await compose({ size: 1024, ratio: 0.62, background: { ...WHITE, alpha: 0 }, out: 'adaptive-icon.png', flatten: false });
  // Splash: the EventEcos banner (logo + wordmark + tagline) on its own solid blue, so the image
  // blends into the splash background (see backgroundColor/imageWidth in app.config.js).
  await sharp(path.join(assetsDir, 'eventecos-banner.jpg')).removeAlpha().png().toFile(path.join(assetsDir, 'splash.png'));
  console.log('✓ splash.png');
  await compose({ size: 48, ratio: 0.95, background: WHITE, out: 'favicon.png' });
})();
