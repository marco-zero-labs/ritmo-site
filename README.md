# ritmo-site

The public page for Ritmo, a product of Marco Zero Labs: static HTML and CSS, with no framework and no build. The product's code is in a separate private repository.

The site has no analytics, cookies or third-party scripts, so it collects no personal data.

## Run locally

```bash
pnpm install
pnpm serve
```

Open <http://localhost:4173/ritmo-site/>. The server uses the same path as GitHub Pages. Install dependencies only for the scripts; the site itself has none.

## Regenerate the screenshots

Do this when the design changes. It needs Google Chrome and a clone of the product repository next to this one.

```bash
pnpm screenshots
```

To use another location: `node scripts/screenshots.mjs <path to docs/design-system/reference>`.

The script opens each design system screen in light and dark, at 2x, removes the built-in device frame, replaces the working name "Sales Copilot" with "Ritmo" and saves it to `assets/screens/`. The frames on the site are drawn in CSS.

## Update the tokens

Copy `dist/tokens.css` and `fonts/` from `@ritmo/tokens` to `assets/css/` and `assets/fonts/`. Do not edit `assets/css/tokens.css` by hand.

## Check accessibility

With `pnpm serve` running:

```bash
pnpm a11y
```

It runs axe on both pages, in both themes, at phone and desktop widths, and checks for broken images and sideways scrolling.

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
