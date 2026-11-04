// Regenerates assets/screens/<language>/*.png from the design system's standalone pages.
// Usage: node scripts/screenshots.mjs [path to docs/design-system/reference]
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const siteRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const reference = resolve(process.argv[2] ?? resolve(siteRoot, '../ritmo/docs/design-system/reference'));

const PHONE = '.sc-phone';
const INNER_FRAME = 'body > div > div';

const SCREENS = {
  MobileApp: PHONE,
  ScreenRoute: PHONE,
  ScreenCustomers: PHONE,
  ScreenAlerts: PHONE,
  ScreenProductMix: PHONE,
  ScreenInvoices: PHONE,
  ScreenMe: PHONE,
  TabletLayout: INNER_FRAME,
  WebPortal: INNER_FRAME,
  WhatsAppMessages: '.wa',
  PushNotification: 'body > div',
};

// The standalone pages have fixed English text and no language keys,
// so the Portuguese version is applied here at capture time.
const LANGUAGES = {
  en: {},
  'pt-BR': JSON.parse(readFileSync(resolve(siteRoot, 'scripts/screens.pt-BR.json'), 'utf8')),
};

/** Applies a translation and the product's final name. Returns text it left in place. */
function applyText(dictionary) {
  const brand = (text) =>
    text.replace(/SALES COPILOT/g, 'RITMO').replace(/Sales Copilot/g, 'Ritmo').replace(/Copilot/g, 'Ritmo');
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
  for (const element of document.querySelectorAll('[placeholder]')) {
    element.setAttribute('placeholder', translate(element.getAttribute('placeholder')));
  }
  for (const element of document.querySelectorAll('[aria-label]')) {
    element.setAttribute('aria-label', translate(element.getAttribute('aria-label')));
  }
  document.documentElement.lang = Object.keys(dictionary).length ? 'pt-BR' : 'en';
}

const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const [language, dictionary] of Object.entries(LANGUAGES)) {
    const output = resolve(siteRoot, 'assets/screens', language);
    rmSync(output, { recursive: true, force: true });
    mkdirSync(output, { recursive: true });
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width: 1400, height: 1000 },
        deviceScaleFactor: 2,
        colorScheme: theme,
      });
      const page = await context.newPage();
      for (const [name, selector] of Object.entries(SCREENS)) {
        const url = pathToFileURL(resolve(reference, 'components', name, 'standalone.html'));
        url.searchParams.set('theme', theme);
        await page.goto(url.href);
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(applyText, dictionary);
        const element = page.locator(selector).first();
        // The site draws its own device frames in CSS.
        await element.evaluate((node, screen) => {
          if (screen === 'PushNotification') node.style.width = '452px';
          if (screen === 'WhatsAppMessages' || screen === 'PushNotification') return;
          node.style.border = '0';
          node.style.borderRadius = '0';
        }, name);
        await element.screenshot({ path: resolve(output, `${name}-${theme}.png`) });
        const box = await element.boundingBox();
        console.log(`${language}/${name}-${theme}.png ${Math.round(box.width)}x${Math.round(box.height)}`);
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}
