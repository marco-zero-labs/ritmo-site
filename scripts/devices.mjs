// Simulates each kind of visitor and checks which frames the device section shows.
// Needs `pnpm serve` running. Takes screenshots with --shots <dir>.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.SITE_URL ?? 'http://localhost:4173/ritmo-site/';
const shotsIndex = process.argv.indexOf('--shots');
const shots = shotsIndex > -1 ? process.argv[shotsIndex + 1] : null;
if (shots) mkdirSync(shots, { recursive: true });

const SAFARI = 'Version/18.0 Safari/605.1.15';
const CHROME = 'Chrome/130.0.0.0 Safari/537.36';
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

const PROFILES = [
  { name: 'iphone', viewport: PHONE, touch: 5, ua: `Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ${SAFARI}`, os: 'ios', form: 'phone', frame: 'ios', bar: 'other' },
  { name: 'pixel', viewport: PHONE, touch: 5, ua: `Mozilla/5.0 (Linux; Android 16; Pixel) AppleWebKit/537.36 (KHTML, like Gecko) ${CHROME}`, hints: { platform: 'Android', mobile: true }, os: 'android', form: 'phone', frame: 'android', bar: 'other' },
  { name: 'android-tablet', viewport: { width: 1024, height: 768 }, touch: 5, ua: `Mozilla/5.0 (Linux; Android 16; Tablet) AppleWebKit/537.36 (KHTML, like Gecko) ${CHROME}`, hints: { platform: 'Android', mobile: false }, os: 'android', form: 'tablet', frame: 'tablet', bar: 'other' },
  { name: 'ipad', viewport: { width: 1024, height: 768 }, touch: 5, ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) ${SAFARI}`, os: 'ipados', form: 'tablet', frame: 'tablet', bar: 'other' },
  { name: 'windows', viewport: DESKTOP, touch: 0, ua: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ${CHROME}`, hints: { platform: 'Windows', mobile: false }, os: 'windows', form: 'desktop', frame: 'android', bar: 'windows' },
  { name: 'macos', viewport: DESKTOP, touch: 0, ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ${CHROME}`, hints: { platform: 'macOS', mobile: false }, os: 'macos', form: 'desktop', frame: 'android', bar: 'macos' },
  { name: 'macos-safari', viewport: DESKTOP, touch: 0, ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) ${SAFARI}`, os: 'macos', form: 'desktop', frame: 'android', bar: 'macos' },
  { name: 'linux', viewport: DESKTOP, touch: 0, ua: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ${CHROME}`, hints: { platform: 'Linux', mobile: false }, os: 'linux', form: 'desktop', frame: 'android', bar: 'linux' },
  { name: 'firefox-linux', viewport: DESKTOP, touch: 0, ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0', os: 'linux', form: 'desktop', frame: 'android', bar: 'linux' },
  { name: 'chromeos', viewport: DESKTOP, touch: 0, ua: `Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) ${CHROME}`, hints: { platform: 'Chrome OS', mobile: false }, os: 'other', form: 'desktop', frame: 'android', bar: 'other' },
];
const DARK_SHOTS = new Set(['iphone', 'pixel', 'ipad', 'windows', 'macos', 'linux']);

const SECTION = 'section:has(.preview)';
const browser = await chromium.launch({ channel: 'chrome' });
let failures = 0;

function check(profile, label, actual, expected) {
  if (actual === expected) return;
  failures += 1;
  console.log(`  FAIL ${profile} ${label}: got ${actual}, expected ${expected}`);
}

async function open(profile, options = {}) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    userAgent: profile.ua,
    colorScheme: options.colorScheme ?? 'light',
  });
  await context.addInitScript(({ hints, touch, blockStorage }) => {
    Object.defineProperty(Navigator.prototype, 'userAgentData', { configurable: true, get: () => hints ?? undefined });
    Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { configurable: true, get: () => touch });
    if (blockStorage) {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
    }
  }, { hints: profile.hints ?? null, touch: profile.touch, blockStorage: options.blockStorage ?? false });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(BASE + (options.path ?? ''), { waitUntil: 'networkidle' });
  return { context, page, errors };
}

const shownFrame = (page) => page.evaluate(() => {
  const visible = (element) => element && getComputedStyle(element).display !== 'none' && element.getClientRects().length > 0;
  if (visible(document.querySelector('.device-tablet'))) return 'tablet';
  const phone = document.querySelector('.preview-device .device');
  if (!visible(phone)) return 'none';
  return phone.classList.contains('device--android') ? 'android' : 'ios';
});

const shownBar = (page) => page.evaluate(() => {
  const visible = (selector) => {
    const element = document.querySelector(selector);
    return Boolean(element) && getComputedStyle(element).display !== 'none';
  };
  if (!document.querySelector('.window-bar')) return 'missing';
  if (visible('.window-lights')) return 'macos';
  if (visible('.window-min')) return 'windows';
  if (visible('.window-close')) return 'linux';
  return 'other';
});

// Scrolls with the mouse wheel, as a visitor does, until the end of the section is on screen.
async function scrollThroughSection(page) {
  await page.mouse.move(10, 10);
  for (let step = 0; step < 200; step += 1) {
    const done = await page.evaluate(() => document.querySelector('section:has(.preview)').getBoundingClientRect().bottom <= window.innerHeight);
    if (done) break;
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(500);
}

async function prepareShot(page) {
  await page.addStyleTag({ content: '.site-header { position: static !important; }' });
  await scrollThroughSection(page);
}

const laptopOpacity = (page) => page.evaluate(() => getComputedStyle(document.querySelector('.device-laptop')).opacity);

try {
  for (const profile of PROFILES) {
    const { context, page, errors } = await open(profile);
    const data = await page.evaluate(() => ({ ...document.documentElement.dataset }));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const frame = await shownFrame(page);
    const bar = await shownBar(page);
    console.log(`${profile.name}: os=${data.os} form=${data.form} frame=${frame} bar=${bar} overflow=${overflow}`);
    check(profile.name, 'os', data.os, profile.os);
    check(profile.name, 'form', data.form, profile.form);
    check(profile.name, 'frame', frame, profile.frame);
    check(profile.name, 'bar', bar, profile.bar);
    check(profile.name, 'overflow', overflow <= 0, true);
    check(profile.name, 'page errors', errors.length, 0);
    if (shots) {
      const section = page.locator(SECTION);
      await prepareShot(page);
      await section.screenshot({ path: join(shots, `${profile.name}-light.png`) });
      if (DARK_SHOTS.has(profile.name)) {
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.waitForTimeout(300);
        await section.screenshot({ path: join(shots, `${profile.name}-dark.png`) });
      }
    }
    await context.close();
  }

  // The manual choice wins over detection and survives a reload.
  const pixel = PROFILES.find((profile) => profile.name === 'pixel');
  {
    const { context, page } = await open(pixel);
    const iphone = page.locator('[data-pref-button="platform"][data-value="ios"]');
    if (await iphone.count()) {
      await iphone.click();
      await page.reload({ waitUntil: 'networkidle' });
      check('toggle', 'frame after reload', await shownFrame(page), 'ios');
      check('toggle', 'aria-pressed', await page.locator('[data-pref-button="platform"][data-value="ios"]').getAttribute('aria-pressed'), 'true');
      check('toggle', 'other aria-pressed', await page.locator('[data-pref-button="platform"][data-value="android"]').getAttribute('aria-pressed'), 'false');
      await page.locator('[data-pref-button="platform"][data-value="android"]').focus();
      const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
      console.log(`toggle: keeps choice after reload; focus outline style=${outline}`);
    } else {
      check('toggle', 'button exists', 0, 1);
    }
    await context.close();
  }

  // The entrance runs on scroll, and never hides content from visitors who avoid motion.
  {
    const { context, page } = await open(pixel);
    await scrollThroughSection(page);
    check('entrance', 'laptop after scroll', await laptopOpacity(page), '1');
    await context.close();
    const reduced = await browser.newContext({ viewport: pixel.viewport, userAgent: pixel.ua, reducedMotion: 'reduce' });
    const still = await reduced.newPage();
    await still.goto(BASE, { waitUntil: 'networkidle' });
    check('reduced motion', 'laptop without scroll', await laptopOpacity(still), '1');
    await reduced.close();
    console.log('entrance: laptop shows after scroll, and at once with reduced motion');
  }

  // Blocked storage must not break the page or the choice for this visit.
  {
    const { context, page, errors } = await open(pixel, { blockStorage: true });
    check('blocked storage', 'os', await page.evaluate(() => document.documentElement.dataset.os), 'android');
    check('blocked storage', 'page errors', errors.length, 0);
    console.log(`blocked storage: frame=${await shownFrame(page)} errors=${errors.length}`);
    await context.close();
  }

  // English page, and the phone width with the visitor's device first.
  {
    const { context, page } = await open(pixel, { path: 'en/' });
    check('english', 'frame', await shownFrame(page), 'android');
    if (shots) {
      const section = page.locator(SECTION);
      await prepareShot(page);
      await section.screenshot({ path: join(shots, 'pixel-en-light.png') });
    }
    await context.close();
  }
  {
    const windows = PROFILES.find((profile) => profile.name === 'windows');
    const { context, page } = await open(windows, { path: 'en/' });
    check('english', 'bar', await shownBar(page), 'windows');
    if (shots) {
      const section = page.locator(SECTION);
      await prepareShot(page);
      await section.screenshot({ path: join(shots, 'windows-en-light.png') });
    }
    await context.close();
  }
  // WhatsApp stays out of the page while the number is empty, and comes back when it is set.
  // The number below is fake on purpose.
  const windowsProfile = PROFILES.find((profile) => profile.name === 'windows');
  for (const [path, phrase, anchor] of [['', 'Ol%C3%A1%2C%20quero%20conhecer%20o%20Ritmo', '#contato'], ['en/', "Hi%2C%20I'd%20like%20to%20learn%20about%20Ritmo", '#contact']]) {
    const empty = await open(windowsProfile, { path });
    check('contact', 'wa.me links while empty', await empty.page.locator('a[href*="wa.me"]').count(), 0);
    check('contact', 'visible WhatsApp links while empty', await empty.page.locator('[data-whatsapp-link]:visible').count(), 0);
    check('contact', 'hero link while empty', await empty.page.locator('[data-whatsapp-cta]').getAttribute('href'), anchor);
    check('contact', 'email button', await empty.page.locator('.contact [data-email-link]').isVisible(), true);
    check('contact', 'email href', (await empty.page.locator('.contact [data-email-link]').getAttribute('href')).startsWith('mailto:marcozerolabs@gmail.com'), true);
    await empty.context.close();

    const context = await browser.newContext({ viewport: windowsProfile.viewport });
    await context.route('**/assets/contact.js', async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace("whatsapp: ''", "whatsapp: '5500000000000'") });
    });
    const page = await context.newPage();
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    check('contact', 'wa.me links when set', await page.locator('a[href*="wa.me"]').count(), 3);
    check('contact', 'message when set', (await page.locator('[data-whatsapp-cta]').getAttribute('href')).endsWith(phrase), true);
    check('contact', 'visible button when set', await page.locator('.contact [data-whatsapp-link]').isVisible(), true);
    await context.close();
  }
  console.log('contact: no WhatsApp while the number is empty; buttons return when it is set');
} finally {
  await browser.close();
}

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
