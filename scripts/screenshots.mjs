// Regenerates assets/screens/*.png from the design system's standalone pages.
// Usage: node scripts/screenshots.mjs [path to docs/design-system/reference]
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const siteRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const reference = resolve(process.argv[2] ?? resolve(siteRoot, '../ritmo/docs/design-system/reference'));
const output = resolve(siteRoot, 'assets/screens');

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

/** The design system keeps its working name; published images use the product's name. */
function applyProductName() {
  const replacements = [
    [/SALES COPILOT/g, 'RITMO'],
    [/Sales Copilot/g, 'Ritmo'],
    [/Copilot/g, 'Ritmo'],
  ];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    for (const [pattern, name] of replacements) node.nodeValue = node.nodeValue.replace(pattern, name);
  }
  for (const element of document.querySelectorAll('[aria-label*="Copilot"]')) {
    element.setAttribute('aria-label', 'Ritmo');
  }
}

mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
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
      await page.evaluate(applyProductName);
      const element = page.locator(selector).first();
      // The site draws its own device frames in CSS.
      await element.evaluate((node, screen) => {
        if (screen === 'PushNotification') node.style.width = '452px';
        if (screen === 'WhatsAppMessages' || screen === 'PushNotification') return;
        node.style.border = '0';
        node.style.borderRadius = '0';
      }, name);
      const path = resolve(output, `${name}-${theme}.png`);
      await element.screenshot({ path });
      const box = await element.boundingBox();
      console.log(`${name}-${theme}.png ${Math.round(box.width)}x${Math.round(box.height)}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
