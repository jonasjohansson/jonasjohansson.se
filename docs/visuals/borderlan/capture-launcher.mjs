import { chromium } from 'playwright';
import { previewServer } from '../../../scripts/preview-server.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const portfolio = fileURLToPath(new URL('../../../', import.meta.url));
const root = process.argv[2] || path.resolve(portfolio, '../borderlan/launcher');
const games = readFileSync(path.join(root, 'games.list'), 'utf8').split('\n')
  .filter(line => line.trim() && !line.trim().startsWith('#'))
  .map(line => line.split('|').map(value => value.trim()))
  .filter(parts => parts.length >= 4 && parts[4] !== 'admin')
  .map(([id, title, accent]) => ({ id, title, accent, v: 1, tv: existsSync(path.join(root, 'trailers', id + '.mp4')) ? 1 : 0 }));
const server = await previewServer(root);
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== server.url || request.method() !== 'GET') return route.abort();
    if (url.pathname === '/') return route.fulfill({ path: path.join(root, 'web/index.html'), contentType: 'text/html' });
    if (url.pathname.startsWith('/fonts/')) return route.fulfill({ path: path.join(root, 'web', url.pathname) });
    if (url.pathname === '/games.json') return route.fulfill({ json: games });
    if (['/status', '/health'].includes(url.pathname)) return route.fulfill({ json: {} });
    if (['/launch', '/quit'].includes(url.pathname)) return route.abort();
    return route.continue();
  });
  await page.goto(server.url);
  await page.waitForFunction(() => document.querySelectorAll('.card').length > 0);
  const index = games.findIndex(game => game.id === 'cs16');
  if (index < 0) throw new Error('Counter-Strike is missing from the launcher');
  for (let i = 0; i < index; i++) await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('.card.sel')?.getAttribute('aria-label') === 'Counter-Strike 1.6');
  await page.locator('.card img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(portfolio, 'projects/borderlan/launcher-games.png') });
  console.log(`Captured all ${games.length} games with Counter-Strike selected; launch actions blocked.`);
} finally {
  await browser.close();
  await server.close();
}
