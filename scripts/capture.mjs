// Takes review screenshots of both pages. Needs `pnpm serve` running.
// Usage: node scripts/capture.mjs <output dir>
import { join } from 'node:path';
import { chromium } from 'playwright';

const output = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const [language, path] of [['pt-BR', ''], ['en', 'en/']]) {
    for (const colorScheme of ['light', 'dark']) {
      for (const width of [390, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme, reducedMotion: 'reduce' });
        const page = await context.newPage();
        const errors = [];
        page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
        page.on('pageerror', (error) => errors.push(String(error)));
        page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
        await page.goto(`http://localhost:4173/ritmo-site/${path}`, { waitUntil: 'networkidle' });
        await page.screenshot({ path: join(output, `${language}-fold-${width}-${colorScheme}.png`) });
        await page.evaluate(() => { for (const image of document.images) image.loading = 'eager'; });
        await page.evaluate(() => Promise.allSettled([...document.images].map((image) => image.decode())));
        await page.screenshot({ path: join(output, `${language}-page-${width}-${colorScheme}.png`), fullPage: true });
        const facts = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
        console.log(language, width, colorScheme, JSON.stringify(facts), `errors ${errors.length}`, errors.slice(0, 2).join(' '));
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
