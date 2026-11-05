# ritmo-site

The public page for Ritmo, a product of Marco Zero Labs: static HTML and CSS, with no framework and no build. The product's code is in a separate private repository.

The site has no analytics, cookies or third-party scripts, so it collects no personal data.

## Run locally

```bash
pnpm install
pnpm serve
```

Open <http://localhost:4173/ritmo-site/>. The server uses the same path as GitHub Pages. Install dependencies only for the scripts; the site itself has none.

## How the screens are built

The phones are HTML and CSS, not images, so their text stays sharp and each language has its own copy in the page:

- Every phone is a `.device` with `data-device`. `assets/theme.js` adds `device--ios` or `device--android`, and `assets/css/device.css` draws the frame and the platform conventions. Elements with `only-ios` or `only-android` appear on that platform only.
- All sizes inside a phone use `--u`, one design pixel of a 390px screen, so a phone can be any width.
- `assets/css/device.css` and the page use only design system tokens, except the phone frame color.
- `assets/i18n/` holds a copy of `@ritmo/i18n`. The pages do not load it: it is the reference for product wording such as notifications. Update the copy when the package changes.
- The numbers are fictional and must stay coherent. The story's today is Monday, October 26. If you change a figure, search for it in both pages, and check the tablet and laptop images.

**Add a screen.** In both pages, add a `button.preview-tab` with `data-tab`, `id` and `aria-controls`, and a matching `.app-view` with `data-screen`, `role="tabpanel"` and `hidden`. Then check it on both platforms and themes.

**Add an example question.** In both pages, add a `button.chip` with the next `data-ask-chip` number and, in the Ask panel, an `.app-convo` with the same `data-ask` number and `hidden`.

**Change the default platform.** `platformPreference()` in `assets/theme.js` picks it: a saved choice first, then Android on Android phones, then iOS. The user agent is used only for this and is not stored or sent. Without JavaScript, the page shows iOS, light theme and the Ask screen.

## Regenerate the tablet and laptop images

Do this when the design changes. It needs Google Chrome and a clone of the product repository next to this one.

```bash
pnpm screenshots
```

To use another location: `node scripts/screenshots.mjs <path to docs/design-system/reference>`.

The script opens the two design system screens in light and dark, removes the built-in frame, replaces the working name "Sales Copilot" with "Ritmo" and saves WebP files to `assets/screens/<language>/`.

Those screens have fixed English text, so the Portuguese version comes from `scripts/screens.pt-BR.json`, applied at capture time. When a screen gets new text, add it there, or it stays in English.

## Record the videos

This needs ffmpeg (`winget install Gyan.FFmpeg`, then open a new terminal) and `pnpm serve` running.

```bash
pnpm record
```

It records the demo in Portuguese at 1080×1920 for iOS and Android in light and dark, plus one 1920×1080 version, as silent H.264 MP4 files, and takes two covers from scene 4. They go to `media/`, which git ignores. To publish them:

```bash
gh release create videos-v1 media/*.mp4 media/*.png --repo marco-zero-labs/ritmo-site --title "Social videos" --notes "Demo videos and covers."
```

## Regenerate the link preview images

```bash
node scripts/og-image.mjs
```

This writes `assets/og-image-pt-BR.png` and `assets/og-image-en.png`.

## Take review screenshots

With `pnpm serve` running: `node scripts/capture.mjs <output folder>`.

## Update the tokens

Copy `dist/tokens.css` and `fonts/` from `@ritmo/tokens` to `assets/css/` and `assets/fonts/`. Do not edit `assets/css/tokens.css` by hand.

## Check accessibility

With `pnpm serve` running:

```bash
pnpm a11y
```

It runs axe on both pages, in both themes, at phone and desktop widths, and checks for broken images and sideways scrolling. For Lighthouse: `pnpm dlx lighthouse@12.8.2 <url> --view`.

## Publish

Every push to `main` deploys through `.github/workflows/pages.yml`. In the repository settings, Pages must use "GitHub Actions" as its source. The site is at <https://marco-zero-labs.github.io/ritmo-site/>.

## Use your own domain

1. In your DNS provider, create a `CNAME` record pointing the subdomain, such as `www`, to `marco-zero-labs.github.io`. For an apex domain, use `A` records with [GitHub's addresses](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
2. In the repository's Pages settings, enter the domain and turn on "Enforce HTTPS".
3. Verify the domain in the organization's settings, so no one else can claim it.
4. Update the `hreflang` URLs in both HTML files.

The site uses relative links, so they keep working on the new domain.

## Rules for the content

- Describe Ritmo as what it is: an MVP in development.
- Never invent figures, customers, testimonials, certifications, compliance badges or customer logos.
- Nothing from the product's `docs/privacy/legal-drafts/` goes here.
- No gradients, emoji, robots or AI sparkles. Use the design system's tokens and the route line.

## License

Copyright (c) 2026 Marco Zero Labs. All rights reserved. IBM Plex fonts are under the SIL Open Font License; see `assets/fonts/OFL-LICENSE.txt`.
