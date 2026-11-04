// Serves the site locally under /ritmo-site/, the same path as GitHub Pages.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT ?? 4173);
const BASE = '/ritmo-site';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

createServer((request, response) => {
  const { pathname } = new URL(request.url, 'http://localhost');
  if (pathname === '/') {
    response.writeHead(302, { Location: `${BASE}/` }).end();
    return;
  }
  if (!pathname.startsWith(`${BASE}/`)) {
    response.writeHead(404).end('Not found');
    return;
  }
  let path = normalize(join(root, decodeURIComponent(pathname.slice(BASE.length))));
  if (path !== root && !path.startsWith(root + sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
  if (!existsSync(path)) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' });
  createReadStream(path).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`http://localhost:${port}${BASE}/`);
});
