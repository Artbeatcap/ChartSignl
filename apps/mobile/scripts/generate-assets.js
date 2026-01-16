const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/logo.svg');
const assetsDir = path.join(__dirname, '../assets');
const publicDir = path.join(__dirname, '../public');

// Ensure directories exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const sizes = [
  { size: 1024, output: path.join(assetsDir, 'icon.png') },
  { size: 1024, output: path.join(assetsDir, 'adaptive-icon.png') },
  { size: 512, output: path.join(assetsDir, 'logo.png') }, // In-app logo for welcome/onboarding screens
  { size: 512, output: path.join(publicDir, 'android-chrome-512x512.png') },
  { size: 192, output: path.join(publicDir, 'android-chrome-192x192.png') },
  { size: 180, output: path.join(publicDir, 'apple-touch-icon.png') },
  { size: 32, output: path.join(publicDir, 'favicon-32x32.png') },
  { size: 16, output: path.join(publicDir, 'favicon-16x16.png') },
];

async function generateAssets() {
  console.log('Generating PNG assets from SVG...');
  
  for (const { size, output } of sizes) {
    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(output);
      console.log(`✓ Generated ${size}x${size} -> ${path.basename(output)}`);
    } catch (error) {
      console.error(`✗ Error generating ${output}:`, error.message);
      throw error;
    }
  }

  // Copy SVG as favicon.svg
  const faviconSvg = path.join(publicDir, 'favicon.svg');
  fs.copyFileSync(svgPath, faviconSvg);
  console.log(`✓ Copied favicon.svg`);

  // Generate favicon.ico (multi-size ICO)
  // Note: sharp doesn't support ICO directly, so we'll create it from 32x32 PNG
  const icoSource = path.join(publicDir, 'favicon-32x32.png');
  const icoOutput = path.join(publicDir, 'favicon.ico');
  // For now, copy 32x32 as favicon.ico (browsers will accept PNG as ICO)
  fs.copyFileSync(icoSource, icoOutput);
  console.log(`✓ Created favicon.ico`);

  console.log('\nAll assets generated successfully!');
}

generateAssets().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
