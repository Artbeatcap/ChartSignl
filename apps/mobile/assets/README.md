# App Assets

Place the following images in this directory:

## Required Assets

### `icon.png`
- **Size:** 1024x1024 pixels
- **Purpose:** iOS App Store icon
- **Format:** PNG, no transparency
- **Design:** Circular candlestick logo on light teal background

### `splash.png`
- **Size:** 1284x2778 pixels (iPhone 14 Pro Max)
- **Purpose:** Splash screen while app loads
- **Format:** PNG with transparency
- **Background Color:** #F0F9F9

### `adaptive-icon.png`
- **Size:** 1024x1024 pixels
- **Purpose:** Android adaptive icon foreground
- **Format:** PNG with transparency
- **Background Color:** #F0F9F9 (configured in app.config.ts)

### `logo.svg`
- **Source:** Master SVG file for the logo design
- **Purpose:** Source file for generating all icon sizes
- **Format:** SVG

## Web Favicon Assets

Web favicon assets are located in the `public/` directory:

- `favicon.ico` - Multi-size favicon
- `favicon.svg` - Modern SVG favicon
- `favicon-16x16.png` - Small favicon
- `favicon-32x32.png` - Standard favicon
- `apple-touch-icon.png` - iOS home screen icon (180x180)
- `android-chrome-192x192.png` - Android Chrome icon
- `android-chrome-512x512.png` - Android Chrome icon (large)
- `site.webmanifest` - PWA manifest file

## Design Guidelines

The ChartSignl logo features a circular candlestick design:

- **Background:** Light teal (#F0F9F9) with rounded corners (44px radius)
- **Primary Color:** Teal (#4ECDC4) for the circular badge
- **Design Elements:** 
  - Three stylized candlesticks in white
  - Signal indicator (white circle with teal center)
  - Clean, minimal aesthetic
- **Style:** Simple, clean, professional

## Generating Assets

Assets are generated from the master `logo.svg` file using the script:
```bash
node scripts/generate-assets.js
```

This script uses `sharp` to generate all required PNG sizes from the SVG source.

### Manual Generation

You can also use tools like:
- [Figma](https://figma.com) for design
- [Expo Icon Builder](https://buildicon.netlify.app/) for quick generation
- ImageMagick or similar tools for SVG to PNG conversion

## Asset Generation Script

The `scripts/generate-assets.js` script automatically:
1. Generates `icon.png` and `adaptive-icon.png` (1024x1024) in `assets/`
2. Generates all web favicon sizes in `public/`
3. Copies `favicon.svg` to `public/`
4. Creates `favicon.ico` from the 32x32 PNG

Run `npm install --save-dev sharp` if the script dependencies are missing.
