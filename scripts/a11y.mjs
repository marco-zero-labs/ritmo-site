// Runs axe on both pages, in both themes, at phone and desktop widths.
// Takes screenshots with --shots <dir>. Needs `pnpm serve` running.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.SITE_URL ?? 'http://localhost:4173/ritmo-site/';
const shotsIndex = process.argv.indexOf('--shots');
const shots = shotsIndex > -1 ? process.argv[shotsIndex + 1] : null;
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

const browser = await chromium.launch({ channel: 'chrome' });
let violations = 0;
try {
  for (const [lang, path] of [['pt-BR', ''], ['en', 'en/'], ['pt-BR', 'privacidade.html'], ['en', 'en/privacy.html'], ['pt-BR', '404.html']]) {
    for (const colorScheme of ['light', 'dark']) {
      for (const [device, viewport] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 900 }]]) {
        const context = await browser.newContext({ viewport, colorScheme });
        const page = await context.newPage();
        const failed = [];
        page.on('response', (response) => { if (response.status() >= 400) failed.push(response.url()); });
        await page.goto(BASE + path, { waitUntil: 'networkidle' });
        // Load lazy images, then check that everything rendered.
        await page.evaluate(() => { for (const image of document.images) image.loading = 'eager'; });
        await page.evaluate(() => Promise.allSettled([...document.images].map((image) => image.decode())));
        const broken = await page.evaluate(() => [...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.src));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        const actual = await page.evaluate(() => ({ lang: document.documentElement.lang, theme: document.documentElement.dataset.theme }));
        await page.evaluate(() => { for (const element of document.querySelectorAll('.reveal')) element.classList.add('is-revealed'); });
        await page.waitForTimeout(400);
        await page.evaluate(axeSource);
        const result = await page.evaluate(() => window.axe.run({ runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }));
        violations += result.violations.length + failed.length + broken.length + (overflow > 0 ? 1 : 0);
        console.log(`${lang} ${path || 'home'} ${colorScheme} ${device}: axe ${result.violations.length} violations, ${result.passes.length} passes, http errors ${failed.length}, broken images ${broken.length}, overflow ${overflow}px, lang=${actual.lang}, theme=${actual.theme}`);
        for (const violation of result.violations) {
          console.log(`  ${violation.impact} ${violation.id}: ${violation.help}`);
          for (const node of violation.nodes.slice(0, 3)) console.log(`    ${node.target.join(' ')}`);
        }
        if (shots) await page.screenshot({ path: join(shots, `${lang}-${path.includes('priv') ? 'privacy-' : path.includes('404') ? '404-' : ''}${colorScheme}-${device}.png`), fullPage: true });
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
console.log(`total problems: ${violations}`);
process.exitCode = violations > 0 ? 1 : 0;
