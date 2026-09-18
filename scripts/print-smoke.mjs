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
  // emulateMedia fires no print event, so nothing warms the page's lazy images
  // the way Cmd+P or the browser's menu would. Warm them the same way here.
  await page.evaluate(async () => {
    const images = [...document.querySelectorAll('[data-print-project] img, #projects .project img')];
    images.forEach(image => { image.loading = 'eager'; });
    await Promise.all(images.map(image => image.decode().catch(() => {})));
  });
  assert.equal(await page.locator('.print-project:visible').count(), 1);
  assert.equal(await page.locator('.print-cover').isVisible(), false);
  assert.equal(await page.locator('.print-page:visible').count(), 1, 'one composed cover page');
  // The project also prints itself after that cover: all of its text and images.
  const printed = await page.evaluate(() => {
    const cover = document.querySelector('.print-project .print-page');
    const content = document.querySelector('#projects .project');
    const shown = selector => [...document.querySelectorAll(selector)].filter(node => node.offsetParent !== null);
    return {
      contentVisible: !!content?.offsetParent,
      coverFirst: (cover.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING) > 0,
      heroRepeated: shown('#projects .hero').length,
      textOnSheets: shown('#projects .text-block, #projects .credits-block').length,
      coverCopyBlocks: shown('.print-copy-full > *').length,
      audioWidgets: shown('#projects audio').length,
      fullBleed: shown('#projects .media-item').every(node => {
        const mm = 96 / 25.4, box = node.getBoundingClientRect();
        return Math.abs(box.x) < 2 && Math.abs(box.width / mm - 338.667) < 1 && Math.abs(box.height / mm - 190.5) < 1;
      }),
      images: shown('#projects .project img').length,
      undecoded: shown('#projects .project img').filter(img => !(img.complete && img.naturalWidth > 0)).length,
      strips: shown('#collection').length,
    };
  });
  assert.equal(printed.contentVisible, true, 'a project prints its own page, not only the cover');
  assert.equal(printed.coverFirst, true, 'the composed cover comes first');
  assert.equal(printed.heroRepeated, 0, 'the hero is not repeated after the cover');
  // The cover carries the writing; the sheets after it are pictures only.
  assert.ok(printed.coverCopyBlocks > 1, 'the cover carries the project\'s writing');
  assert.equal(printed.textOnSheets, 0, 'no text or credits print on the image sheets');
  assert.equal(printed.fullBleed, true, 'every printed image fills its sheet, edge to edge');
  assert.equal(printed.audioWidgets, 0, 'audio players do not print as dead controls');
  assert.ok(printed.images > 0, 'the project prints its images');
  assert.equal(printed.undecoded, 0, 'every printed image has decoded');
  assert.equal(printed.strips, 0, 'the strip wall stays off the printed project');
  await page.pdf({ path: `${output}/jagad.pdf`, preferCSSPageSize: true });
  // Every printed sheet is one image, so the document has to end exactly on a
  // sheet boundary: anything over would print as a blank trailing page.
  const ending = await page.evaluate(() => {
    const sheet = 190.5 * 96 / 25.4;
    const shown = [...document.querySelectorAll('#projects .media-item')].filter(node => node.offsetParent !== null);
    const last = shown.at(-1).getBoundingClientRect();
    return { sheets: (last.bottom + scrollY) / sheet, images: shown.length };
  });
  assert.ok(Math.abs(ending.sheets - Math.round(ending.sheets)) < 0.02, 'the last image ends on a sheet boundary, with no blank page after it');
  assert.equal(Math.round(ending.sheets), ending.images + 1, 'the document is the cover plus one sheet per image');
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
  // Six projects have no media beyond their hero, so they print as a cover
  // alone; Lyra is one of them. Check a project that has sheets to print.
  assert.equal(await noJS.locator('#projects .hero').isVisible(), false, 'without JavaScript the hero still is not repeated');
  const sheets = await noJS.locator('#projects .media-item:not(.hero)').count();
  assert.equal(sheets, 0, 'Lyra has no media beyond its hero, so its PDF is the cover alone');
  const withMedia = await browser.newPage({ javaScriptEnabled: false });
  await withMedia.goto(`${server.url}/jagad/`);
  await withMedia.emulateMedia({ media: 'print' });
  assert.equal(await withMedia.locator('#projects .project').isVisible(), true, 'a project with media prints its own sheets without JavaScript too');
  assert.ok(await withMedia.locator('#projects .media-item:not(.hero)').count() > 0, 'and those sheets are its images');
  await withMedia.close();
  console.log('✓ Direct project visit selects the correct print content without JavaScript');
  assert.deepEqual(missing, [], 'no missing assets');
} finally {
  await browser.close();
  await server.close();
}
