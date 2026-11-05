// Generates the site icons from the Marco Zero Labs symbol. Usage: node scripts/icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const output = resolve(fileURLToPath(new URL('..', import.meta.url)), 'assets/icons');
mkdirSync(output, { recursive: true });

const PETROL = '#0d5c6b';
const WHITE = '#ffffff';

// The same symbol as the site footer, on a tile. Cropped closer so it reads at 32px.
const symbol = (ring, dot) => `<circle cx="540" cy="540" r="122" fill="none" stroke="${ring}" stroke-width="44"/><circle cx="540" cy="540" r="37" fill="${dot}"/><path d="M540 308v54M540 718v54M308 540h54M718 540h54" fill="none" stroke="${ring}" stroke-width="44" stroke-linecap="round"/>`;
const tile = (radius) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="220 220 640 640"><rect x="220" y="220" width="640" height="640" rx="${radius}" fill="${PETROL}"/>${symbol(WHITE, WHITE)}</svg>`;

// favicon.svg follows the browser's color scheme with the petrol of each theme.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="220 220 640 640"><style>.t{fill:${PETROL}}.r{fill:none;stroke:${WHITE};stroke-width:44;stroke-linecap:round}.d{fill:${WHITE}}@media (prefers-color-scheme:dark){.t{fill:#6cc5d2}.r{stroke:#062a31}.d{fill:#062a31}}</style><rect class="t" x="220" y="220" width="640" height="640" rx="140"/><circle class="r" cx="540" cy="540" r="122"/><circle class="d" cx="540" cy="540" r="37"/><path class="r" d="M540 308v54M540 718v54M308 540h54M718 540h54"/></svg>
`;
writeFileSync(resolve(output, 'favicon.svg'), favicon);

const browser = await chromium.launch({ channel: 'chrome' });
async function png(svg, size) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<!doctype html><style>*{margin:0}body{background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  const image = await page.screenshot({ omitBackground: true });
  await page.close();
  return image;
}

try {
  // iOS rounds the corners itself, so the touch icon stays square and opaque.
  writeFileSync(resolve(output, 'apple-touch-icon.png'), await png(tile(0), 180));
  writeFileSync(resolve(output, 'icon-192.png'), await png(tile(140), 192));
  writeFileSync(resolve(output, 'icon-512.png'), await png(tile(140), 512));

  // An .ico is a small header and a directory that points to the image, here a 32x32 PNG.
  const image = await png(tile(140), 32);
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  header.writeUInt8(32, 6); // width
  header.writeUInt8(32, 7); // height
  header.writeUInt16LE(1, 10); // color planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(image.length, 14); // image size
  header.writeUInt32LE(22, 18); // image offset
  writeFileSync(resolve(output, 'favicon.ico'), Buffer.concat([header, image]));
} finally {
  await browser.close();
}
console.log('assets/icons: favicon.svg, favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png');
