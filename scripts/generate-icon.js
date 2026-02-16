const sharp = require('sharp');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Om symbol SVG path (standard Devanagari Om glyph)
const OM_SVG_PATH = `M 512 180 C 480 180 452 195 435 220 C 415 250 410 290 420 330 C 430 370 455 400 490 420 C 520 435 555 440 585 430 C 615 420 640 395 650 365 C 660 335 655 300 640 275 C 620 245 590 225 555 215 C 530 208 505 210 485 220 C 470 228 460 242 458 260 C 456 278 462 296 475 308 C 488 320 505 325 522 322 C 535 319 545 310 550 298 C 555 285 553 270 545 260 C 538 252 527 248 517 250 C 510 252 505 258 505 265 C 505 272 510 278 517 280 M 380 500 C 340 480 310 445 295 405 C 280 365 280 320 295 280 C 310 240 340 210 380 195 C 350 185 318 185 290 195 C 255 210 228 238 215 275 C 200 315 200 360 215 400 C 230 440 260 470 300 490 C 335 505 375 510 410 500 C 390 505 370 505 350 500 Z M 620 500 C 660 480 690 445 705 405 C 720 365 720 320 705 280 C 690 240 660 210 620 195 C 650 185 682 185 710 195 C 745 210 772 238 785 275 C 800 315 800 360 785 400 C 770 440 740 470 700 490 C 665 505 625 510 590 500 C 610 505 630 505 650 500 Z M 490 550 C 470 560 455 578 450 600 C 445 625 450 652 465 672 C 480 692 502 702 525 700 C 548 698 568 685 580 665 C 590 648 592 625 585 605 C 575 585 558 572 538 568 C 520 565 502 570 490 582 M 512 140 C 522 130 528 115 525 100 C 522 85 512 73 498 68 C 485 63 470 68 460 78 C 452 88 450 102 455 115 C 460 128 472 138 488 140 C 498 142 508 140 515 135`;

function createIconSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFA040"/>
      <stop offset="50%" stop-color="#FF6F00"/>
      <stop offset="100%" stop-color="#E65100"/>
    </linearGradient>
  </defs>
  <!-- Background with rounded corners for iOS -->
  <rect width="${size}" height="${size}" fill="url(#bg)" rx="${Math.round(size * 0.22)}"/>
  <!-- Om symbol as large text -->
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="serif" font-size="${Math.round(size * 0.55)}" fill="white" fill-opacity="0.95">
    \u0950
  </text>
</svg>`;
}

function createSplashSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Transparent background - splash backgroundColor handles the rest -->
  <!-- Om symbol -->
  <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle"
        font-family="serif" font-size="${Math.round(size * 0.5)}" fill="white" fill-opacity="0.95">
    \u0950
  </text>
  <!-- App name below -->
  <text x="50%" y="72%" dominant-baseline="middle" text-anchor="middle"
        font-family="sans-serif" font-size="${Math.round(size * 0.08)}" font-weight="300"
        fill="white" fill-opacity="0.8" letter-spacing="4">
    GitaFlow
  </text>
</svg>`;
}

function createAdaptiveSvg(size) {
  // Android adaptive icon: just the foreground (Om on transparent)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="serif" font-size="${Math.round(size * 0.45)}" fill="white" fill-opacity="0.95">
    \u0950
  </text>
</svg>`;
}

async function generate() {
  console.log('Generating app icons...');

  // 1. Main app icon (1024x1024)
  const iconSvg = Buffer.from(createIconSvg(1024));
  await sharp(iconSvg)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, 'icon.png'));
  console.log('  -> assets/icon.png (1024x1024)');

  // 2. Android adaptive icon foreground (1024x1024, transparent bg)
  const adaptiveSvg = Buffer.from(createAdaptiveSvg(1024));
  await sharp(adaptiveSvg)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, 'adaptive-icon.png'));
  console.log('  -> assets/adaptive-icon.png (1024x1024)');

  // 3. Splash icon (512x512)
  const splashSvg = Buffer.from(createSplashSvg(512));
  await sharp(splashSvg)
    .resize(512, 512)
    .png()
    .toFile(path.join(ASSETS_DIR, 'splash-icon.png'));
  console.log('  -> assets/splash-icon.png (512x512)');

  console.log('Done!');
}

generate().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
