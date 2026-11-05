// Regenerates assets/screens/<language>/*.webp: the tablet and laptop images.
// The phone screens are HTML in the pages, so only these two come from the design system.
// Usage: node scripts/screenshots.mjs [path to docs/design-system/reference]
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const siteRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const reference = resolve(process.argv[2] ?? resolve(siteRoot, '../ritmo/docs/design-system/reference'));
const SCREENS = ['TabletLayout', 'WebPortal'];
const SELECTOR = 'body > div > div';

// The design system's pages have fixed English text, so Portuguese is applied at capture time.
const LANGUAGES = {
  en: {},
  'pt-BR': JSON.parse(readFileSync(resolve(siteRoot, 'scripts/screens.pt-BR.json'), 'utf8')),
};

function applyText(dictionary) {
  const brand = (text) => text.replace(/SALES COPILOT/g, 'RITMO').replace(/Sales Copilot/g, 'Ritmo').replace(/Copilot/g, 'Ritmo');
  const translate = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return text;
    const translated = dictionary[trimmed];
    return brand(translated === undefined ? text : text.replace(trimmed, translated));
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!['SCRIPT', 'STYLE'].includes(node.parentElement.tagName)) node.nodeValue = translate(node.nodeValue);
  }
  for (const element of document.querySelectorAll('[placeholder]')) element.setAttribute('placeholder', translate(element.getAttribute('placeholder')));
}

async function toWebp(page, png, path) {
  const encoder = await page.context().newPage();
  const dataUrl = await encoder.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image, 0, 0);
    return canvas.toDataURL('image/webp', 0.82);
  }, png.toString('base64'));
  await encoder.close();
  writeFileSync(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
}

const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const [language, dictionary] of Object.entries(LANGUAGES)) {
    const output = resolve(siteRoot, 'assets/screens', language);
    rmSync(output, { recursive: true, force: true });
    mkdirSync(output, { recursive: true });
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1.5, colorScheme: theme });
      const page = await context.newPage();
      for (const name of SCREENS) {
        const url = pathToFileURL(resolve(reference, 'components', name, 'standalone.html'));
        url.searchParams.set('theme', theme);
        await page.goto(url.href);
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(applyText, dictionary);
        const element = page.locator(SELECTOR).first();
        await element.evaluate((node) => { node.style.border = '0'; node.style.borderRadius = '0'; });
        const png = await element.screenshot();
        await toWebp(page, png, resolve(output, `${name}-${theme}.webp`));
        console.log(`${language}/${name}-${theme}.webp`);
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}
