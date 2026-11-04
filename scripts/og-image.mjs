// Generates the link preview images from the tokens and the route mark. Usage: node scripts/og-image.mjs
import { rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const siteRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const VERSIONS = {
  'og-image-pt-BR.png': { title: 'O copiloto de vendas de quem vende na rua', signature: 'um produto marco zero labs' },
  'og-image-en.png': { title: 'The sales copilot for people who sell on the street', signature: 'a marco zero labs product' },
};

const mark = `<svg viewBox="0 0 64 64" width="88" height="88" aria-hidden="true"><rect width="64" height="64" rx="15" fill="var(--on-brand)"/><polyline points="16,46 27,31 39,38 48,19" fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="46" r="3.5" fill="var(--brand)"/><circle cx="27" cy="31" r="3.5" fill="var(--brand)"/><circle cx="39" cy="38" r="3.5" fill="var(--brand)"/><circle cx="48" cy="19" r="5" fill="var(--on-brand)" stroke="var(--brand)" stroke-width="2.5"/></svg>`;

const bars = Array.from({ length: 12 }, (_, week) => `<span class="${week < 10 ? 'bought' : 'missed'}"></span>`).join('');

const html = ({ title, signature }) => `<!doctype html><html data-theme="light"><head><meta charset="utf-8">
<link rel="stylesheet" href="assets/css/tokens.css"><style>
*{box-sizing:border-box}html,body{margin:0}
body{width:1200px;height:630px;padding:64px 72px;background:var(--brand);color:var(--on-brand);font-family:var(--font-sans);display:flex;flex-direction:column;justify-content:space-between}
.top{display:flex;align-items:center;gap:24px;font-size:48px;font-weight:600}
h1{margin:0;max-width:980px;font-size:68px;line-height:76px;font-weight:600;letter-spacing:-0.01em}
.foot{display:flex;align-items:flex-end;justify-content:space-between;gap:48px;font-size:26px;font-weight:500}
.bars{display:grid;grid-template-columns:repeat(12,28px);gap:12px;height:88px;flex:none}
.bought{background:var(--on-brand);border-radius:var(--radius-sm)}
.missed{border:3px dashed var(--on-brand);border-radius:var(--radius-sm)}
</style></head><body><div class="top">${mark}Ritmo</div><h1>${title}</h1><div class="foot"><span>${signature}</span><div class="bars">${bars}</div></div></body></html>`;

const temporary = resolve(siteRoot, '.og-temp.html');
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const [file, version] of Object.entries(VERSIONS)) {
    writeFileSync(temporary, html(version));
    await page.goto(pathToFileURL(temporary).href);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: resolve(siteRoot, 'assets', file) });
    console.log(`assets/${file}`);
  }
} finally {
  await browser.close();
  rmSync(temporary, { force: true });
}
