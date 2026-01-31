const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');

// Create a simple blue square icon (1024x1024)
sharp({
  create: {
    width: 1024,
    height: 1024,
    channels: 4,
    background: { r: 0, g: 122, b: 255, alpha: 1 }
  }
})
.png()
.toFile(path.join(assetsDir, 'icon.png'))
.then(() => console.log('✓ Created icon.png'));

// Create a simple splash screen (2048x2048)
sharp({
  create: {
    width: 2048,
    height: 2048,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 }
  }
})
.png()
.toFile(path.join(assetsDir, 'splash.png'))
.then(() => console.log('✓ Created splash.png'));

// Create adaptive icon (1024x1024)
sharp({
  create: {
    width: 1024,
    height: 1024,
    channels: 4,
    background: { r: 0, g: 122, b: 255, alpha: 1 }
  }
})
.png()
.toFile(path.join(assetsDir, 'adaptive-icon.png'))
.then(() => console.log('✓ Created adaptive-icon.png'));

// Create favicon (48x48)
sharp({
  create: {
    width: 48,
    height: 48,
    channels: 4,
    background: { r: 0, g: 122, b: 255, alpha: 1 }
  }
})
.png()
.toFile(path.join(assetsDir, 'favicon.png'))
.then(() => console.log('✓ Created favicon.png'));
