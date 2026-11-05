// Measures what a visitor downloads on a page: first load, then after scrolling to the end.
// Sizes are the files as served, and with gzip as GitHub Pages sends text. Fonts and images
// are already compressed. Usage: node scripts/weight.mjs [base url]. Needs `pnpm serve` running.
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:4173/ritmo-site/';
const TEXT = /\.(html|css|js|svg|webmanifest)$|\/$/;
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const [name, path] of [['pt', ''], ['en', 'en/']]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    const files = new Map();
    page.on('response', async (response) => {
      const url = new URL(response.url());
      if (!url.href.startsWith(BASE)) return;
      const body = await response.body().catch(() => null);
      if (body) files.set(url.pathname, body);
    });
    const total = () => {
      let raw = 0;
      let compressed = 0;
      for (const [pathname, body] of files) {
        raw += body.length;
        compressed += TEXT.test(pathname) ? gzipSync(body).length : body.length;
      }
      return `${files.size} files, ${kb(raw)} as served, ${kb(compressed)} with gzip`;
    };
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    console.log(`${name} first load: ${total()}`);
    for (let step = 0; step < 60; step += 1) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(600);
    console.log(`${name} after scroll: ${total()}`);
    const heroImages = await page.evaluate(() => [...document.images].filter((image) => image.getBoundingClientRect().top + window.scrollY < window.innerHeight).length);
    console.log(`${name} images above the fold: ${heroImages}`);
    await context.close();
  }
} finally {
  await browser.close();
}
