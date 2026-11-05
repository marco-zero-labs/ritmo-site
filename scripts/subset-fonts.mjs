// Cuts the IBM Plex fonts down to the characters the site uses. Starts from the design
// system's originals, so it can run again after the text changes. Run it after editing copy.
// Usage: node scripts/subset-fonts.mjs [folder with the original .woff2 files]
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const siteRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = resolve(process.argv[2] ?? resolve(siteRoot, '../ritmo/packages/tokens/fonts'));
const PAGES = ['index.html', 'en/index.html', 'privacidade.html', 'en/privacy.html', '404.html', 'assets/site.js', 'assets/demo.js'];

// Everything the pages use, plus basic Latin and the Portuguese accents, so a small text
// edit does not fall back to another font.
const decode = (text) => text
  .replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
let characters = 'áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ“”‘’—–·…× ';
for (let code = 0x20; code <= 0x7e; code += 1) characters += String.fromCharCode(code);
for (const page of PAGES) characters += decode(readFileSync(resolve(siteRoot, page), 'utf8'));
const text = [...new Set(characters)].filter((character) => character.codePointAt(0) >= 0x20).join('');

let before = 0;
let after = 0;
for (const file of readdirSync(source).filter((name) => name.endsWith('.woff2'))) {
  const original = readFileSync(resolve(source, file));
  const subset = await subsetFont(original, text, { targetFormat: 'woff2' });
  writeFileSync(resolve(siteRoot, 'assets/fonts', file), subset);
  before += statSync(resolve(source, file)).size;
  after += subset.length;
  console.log(`${file}: ${(original.length / 1024).toFixed(1)} KB -> ${(subset.length / 1024).toFixed(1)} KB`);
}
console.log(`${[...text].length} characters. Total: ${(before / 1024).toFixed(1)} KB -> ${(after / 1024).toFixed(1)} KB`);
