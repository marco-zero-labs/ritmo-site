// Generates the link preview images, 1200x630, from the tokens. Usage: node scripts/og-image.mjs
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const siteRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const VERSIONS = {
  'ritmo-pt-BR.png': { line: 'O copiloto de vendas de quem vende na rua' },
  'ritmo-en.png': { line: 'The sales copilot for people who sell on the street' },
};

// The Marco Zero Labs symbol from the site footer, in white and without its tile.
const symbol = `<svg viewBox="270 270 540 540" width="72" height="72" aria-hidden="true" fill="none" stroke="var(--on-brand)" stroke-width="40" stroke-linecap="round"><circle cx="540" cy="540" r="122"/><circle cx="540" cy="540" r="37" fill="var(--on-brand)" stroke="none"/><path d="M540 308v54M540 718v54M308 540h54M718 540h54"/></svg>`;

const html = ({ line }) => `<!doctype html><html data-theme="light"><head><meta charset="utf-8">
<link rel="stylesheet" href="assets/css/tokens.css"><style>
*{box-sizing:border-box}html,body{margin:0}
body{display:flex;flex-direction:column;justify-content:space-between;width:1200px;height:630px;padding:64px 72px;background:var(--brand);color:var(--on-brand);font-family:var(--font-sans)}
.top{display:flex;align-items:center;gap:20px;font-size:34px;font-weight:500}
.name{margin:0 0 16px;font-size:44px;line-height:52px;font-weight:600}
h1{margin:0;max-width:1000px;font-size:72px;line-height:82px;font-weight:600;letter-spacing:-0.01em}
</style></head><body><div class="top">${symbol}<span>marco zero labs</span></div><div><p class="name">Ritmo</p><h1>${line}</h1></div></body></html>`;

const temporary = resolve(siteRoot, '.og-temp.html');
mkdirSync(resolve(siteRoot, 'assets/og'), { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const [file, version] of Object.entries(VERSIONS)) {
    writeFileSync(temporary, html(version));
    await page.goto(pathToFileURL(temporary).href);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: resolve(siteRoot, 'assets/og', file) });
    console.log(`assets/og/${file}`);
  }
} finally {
  await browser.close();
  rmSync(temporary, { force: true });
}
