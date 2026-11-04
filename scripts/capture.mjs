// Takes page screenshots for review. Needs `pnpm serve` running.
// Usage: node scripts/capture.mjs <output dir>
import { join } from 'node:path';
import { chromium } from 'playwright';

const output = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const [language, path] of [['pt-BR', ''], ['en', 'en/']]) {
    for (const colorScheme of ['light', 'dark']) {
      for (const width of [390, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme });
        const page = await context.newPage();
        const errors = [];
        page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
        page.on('pageerror', (error) => errors.push(String(error)));
        await page.goto(`http://localhost:4173/ritmo-site/${path}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(900);
        await page.screenshot({ path: join(output, `${language}-fold-${width}-${colorScheme}.png`) });
        await page.evaluate(() => { for (const image of document.images) image.loading = 'eager'; });
        await page.evaluate(() => Promise.allSettled([...document.images].map((image) => image.decode())));
        await page.screenshot({ path: join(output, `${language}-page-${width}-${colorScheme}.png`), fullPage: true });
        const facts = await page.evaluate(() => ({
          h1: getComputedStyle(document.querySelector('h1')).fontSize,
          height: document.documentElement.scrollHeight,
          overflow: document.documentElement.scrollWidth - innerWidth,
        }));
        console.log(language, width, colorScheme, JSON.stringify(facts), `console errors ${errors.length}`, errors.slice(0, 2).join(' '));
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
