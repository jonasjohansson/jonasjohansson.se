import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { previewServer } from './preview-server.mjs';

const server = await previewServer();
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (existsSync(chromium.executablePath()) ? undefined : 'chrome') });
const output = 'screenshots/print';
mkdirSync(output, { recursive: true });
try {
  const page = await browser.newPage({ colorScheme: 'dark' });
  const missing = [];
  page.on('response', response => { if (response.status() >= 400) missing.push(response.url()); });
  await page.goto(server.url);
  assert.equal(await page.locator('.print-portfolio').isVisible(), false);
  assert.equal(await page.locator('.print-portfolio img').evaluateAll(images => images.filter(img => img.complete && img.naturalWidth).length), 0, 'print images stay lazy on screen');
  await page.evaluate(() => { window.print = () => { window.printReady = true; }; });
  await page.keyboard.press('Control+p');
  await page.waitForFunction(() => window.printReady);
  await page.emulateMedia({ media: 'print' });
  const pages = await page.locator('.print-page:visible').count();
  assert.equal(pages, await page.locator('.print-project').count() + 1, 'one page per project plus cover');
  assert.equal(await page.locator('.print-closing').count(), 0);
  assert.deepEqual(await page.locator('.print-profile-links a').allTextContents(), ['Instagram', 'CV', 'Email']);
  assert.equal(await page.locator('.print-profile-links a').filter({ hasText: /^CV$/ }).getAttribute('href'), 'https://docs.google.com/document/d/1riN-cIeqjiBx2DtVJnRfUAMP0qtcFEWkCvK95kKrOOY/export?format=pdf');
  const overflow = await page.locator('.print-page:visible').evaluateAll(pages => pages.flatMap(page => {
    const content = page.querySelector('.print-project-text, .print-bio');
    const limit = page.querySelector('.print-contact')?.getBoundingClientRect().top
      ?? page.getBoundingClientRect().bottom - 40;
    return content && content.getBoundingClientRect().bottom > limit
      ? [page.textContent.slice(0, 100)] : [];
  }));
  assert.deepEqual(overflow, [], 'copy must fit inside each page');
  const shading = await page.locator('.print-shade').evaluateAll(shades => shades.map(shade => {
    const box = shade.getBoundingClientRect();
    const text = shade.closest('.print-project-text').getBoundingClientRect();
    return { expectedFade: (text.height + 16 * 96 / 25.4) * 0.25, width: box.width, fade: box.bottom - text.bottom, height: box.height, raster: shade.querySelectorAll('img').length === 1 && getComputedStyle(shade).maskImage === 'none' };
  }));
  assert.ok(shading.every(shade => Math.abs(shade.width - 210 * 96 / 25.4) < 1), 'shade is confined to the left 210mm, never the full page');
  assert.ok(shading.every(shade => shade.raster && Math.abs(shade.fade - shade.expectedFade) < 1), 'shade fades smoothly below each text block');
  assert.ok(new Set(shading.map(shade => Math.round(shade.height))).size > 1, 'shade height follows variable copy lengths');
  const projectLinks = await page.locator('.print-project-link a').evaluateAll(links => links.map(link => link.href));
  assert.equal(projectLinks.length, pages - 1);
  assert.equal(new Set(projectLinks).size, pages - 1, 'each project has its own online destination');
  assert.ok(projectLinks.every(url => url.startsWith('https://jonasjohansson.se/')));
  assert.equal(await page.locator('.print-gallery, .print-footer, .print-eyebrow, .print-role').count(), 0);
  assert.ok(await page.locator('.print-portfolio img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0)));
  await page.pdf({ path: `${output}/portfolio.pdf`, preferCSSPageSize: true, printBackground: false });
  console.log(`✓ Homepage: ${pages} composed pages; decoded JPEGs; no text overflow (dark theme, backgrounds off)`);
  await page.emulateMedia({ media: 'screen' });
  await page.locator('#strip-jagad').click();
  await page.waitForFunction(() => document.documentElement.dataset.project === 'jagad');
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.print-project:visible').count(), 1);
  assert.equal(await page.locator('.print-cover').isVisible(), false);
  assert.equal(await page.locator('.print-page:visible').count(), 1);
  await page.pdf({ path: `${output}/jagad.pdf`, preferCSSPageSize: true });
  await page.emulateMedia({ media: 'screen' });
  await page.locator('#header-toggle').click();
  await page.waitForFunction(() => document.body.dataset.route === 'home');
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.print-page:visible').count(), pages);
  console.log('✓ Client navigation prints only the current project; returning home restores the portfolio');
  const noJS = await browser.newPage({ javaScriptEnabled: false });
  await noJS.goto(`${server.url}/lyra/`);
  await noJS.emulateMedia({ media: 'print' });
  assert.equal(await noJS.locator('.print-project:visible').count(), 1);
  assert.equal(await noJS.locator('.print-page:visible').count(), 1);
  console.log('✓ Direct project visit selects the correct print content without JavaScript');
  assert.deepEqual(missing, [], 'no missing assets');
} finally {
  await browser.close();
  await server.close();
}
