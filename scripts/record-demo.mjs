// Records the hero demo as silent MP4 videos and covers for social media.
// Needs `pnpm serve` running and ffmpeg on the PATH. Output goes to media/, which git ignores.
// Usage: node scripts/record-demo.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const media = join(root, 'media');
const raw = join(media, 'raw');
const SITE = 'http://localhost:4173/ritmo-site/';
const TAGLINE = 'Ritmo · O copiloto de vendas de quem vende na rua';
// Scene durations in demo.js plus the typing, then the closing card.
const SCENES_MS = 31000;
const END_MS = 3000;

try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('ffmpeg was not found. Install it (winget install Gyan.FFmpeg) and open a new terminal.');
  process.exit(1);
}

// Only the phone, the caption and the progress stay on screen, centered and scaled to fill.
const layoutCss = (width, height) => {
  const phoneWidth = Math.round(Math.min(width * 0.72, ((height - 300) * 390) / 844));
  return `
    html, body { overflow: hidden !important; }
    body * { visibility: hidden; }
    .stage, .stage * { visibility: visible; }
    .stage .route, .demo-toggle { display: none !important; }
    .stage { position: fixed !important; inset: 0 !important; z-index: 100; width: ${width}px !important; height: ${height}px !important; max-width: none !important; margin: 0 !important; display: flex !important; flex-direction: column; align-items: center; justify-content: center; border-radius: 0 !important; }
    .stage > .device { width: ${phoneWidth}px !important; max-width: none !important; margin: 0 !important; }
    .demo-caption { font-size: ${Math.round(height * 0.024)}px !important; line-height: 1.4 !important; }
    .demo-dots { pointer-events: none; }
    .end-card { visibility: visible !important; position: fixed; inset: 0; z-index: 200; display: grid; place-content: center; justify-items: center; gap: 32px; padding: 80px; background: var(--brand); color: var(--on-brand); text-align: center; opacity: 0; transition: opacity 280ms ease-out; font: 600 ${Math.round(Math.min(width, height) * 0.05)}px/1.25 var(--font-sans); }
    .end-card * { visibility: visible !important; }
    .end-card.is-on { opacity: 1; }
  `;
};

async function preparePage(page, width, height, platform, theme) {
  await page.goto(SITE, { waitUntil: 'networkidle' });
  await page.evaluate(([p, t]) => {
    window.RitmoPrefs.set('platform', p);
    window.RitmoPrefs.set('theme', t);
  }, [platform, theme]);
  await page.addStyleTag({ content: layoutCss(width, height) });
  await page.evaluate((tagline) => {
    const card = document.createElement('div');
    card.className = 'end-card';
    card.textContent = tagline;
    document.body.append(card);
  }, TAGLINE);
}

async function record(name, width, height, platform, theme) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: theme,
    recordVideo: { dir: raw, size: { width, height } },
  });
  const page = await context.newPage();
  await preparePage(page, width, height, platform, theme);
  await page.waitForTimeout(SCENES_MS);
  await page.locator('.end-card').evaluate((card) => card.classList.add('is-on'));
  await page.waitForTimeout(END_MS);
  const video = page.video();
  await context.close();
  const source = await video.path();
  const target = join(media, `${name}.mp4`);
  // The page takes a moment to load, so the start of the recording is trimmed.
  execFileSync('ffmpeg', ['-y', '-ss', '1.5', '-i', source, '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-vf', `scale=${width}:${height}`, target], { stdio: 'ignore' });
  const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', target]).toString());
  console.log(`${name}.mp4 ${seconds.toFixed(1)} s`);
  if (seconds < 20 || seconds > 35) throw new Error(`${name}.mp4 should last 20 to 35 seconds`);
}

async function cover(name, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: 'light', reducedMotion: 'reduce' });
  const page = await context.newPage();
  await preparePage(page, width, height, 'ios', 'light');
  await page.screenshot({ path: join(media, `${name}.png`) });
  await context.close();
  console.log(`${name}.png`);
}

rmSync(raw, { recursive: true, force: true });
mkdirSync(raw, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const platform of ['ios', 'android']) {
    for (const theme of ['light', 'dark']) {
      await record(`ritmo-${platform}-${theme}-9x16`, 1080, 1920, platform, theme);
    }
  }
  await record('ritmo-linkedin-16x9', 1920, 1080, 'ios', 'light');
  await cover('cover-1080x1920', 1080, 1920);
  await cover('cover-1200x630', 1200, 630);
} finally {
  await browser.close();
}
rmSync(raw, { recursive: true, force: true });
console.log(readdirSync(media).join('\n'));
