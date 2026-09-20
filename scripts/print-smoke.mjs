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
  // The cover's links come from the same list the page's corner uses, so the
  // printed portfolio cannot drift from the site. Email has its own line just
  // above, and Print is an action that means nothing on paper.
  const cover = await page.locator('.print-profile-links a').allTextContents();
  assert.deepEqual(cover.map(text => text.trim()), ['CV'], 'the cover lists what the site lists');
  const corner = await page.locator('#intro-links .header-contacts a').allTextContents();
  assert.deepEqual(corner.map(text => text.trim()), ['CV', 'Email'], 'and the site lists CV and Email');
  assert.equal(await page.locator('.print-contact a[href^="mailto:"]').count(), 1, 'the email is on the cover once');
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
      // A grouped row shares one sheet, so its children are not full width.
      fullBleed: shown('#projects .media-item').filter(node => !node.closest('.print-together')).every(node => {
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
  // The portfolio's overflow check measures its short copy, so a project cover
  // could clip its writing unnoticed. Measure the cover that actually prints.
  const coverFit = await page.evaluate(() => {
    const visible = selector => [...document.querySelectorAll(selector)].find(node => node.offsetParent !== null);
    const page = visible('.print-project .print-page');
    const last = visible('.print-project-link') || visible('.print-copy-full');
    if (!page || !last) return null;
    return (last.getBoundingClientRect().bottom - page.getBoundingClientRect().top) / (96 / 25.4);
  });
  assert.ok(coverFit !== null && coverFit <= 190.5, `the cover's writing fits its sheet (ends at ${Math.round(coverFit)}mm of 190.5mm)`);
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
    // A row of tall images shares one sheet, so sheets are counted as the
    // images that take one each, plus one for every grouped row.
    return {
      sheets: (last.bottom + scrollY) / sheet,
      pictureSheets: shown.filter(node => !node.closest('.print-together')).length
        + document.querySelectorAll('#projects .media-row.print-together').length,
    };
  });
  assert.ok(Math.abs(ending.sheets - Math.round(ending.sheets)) < 0.02, 'the last image ends on a sheet boundary, with no blank page after it');
  assert.equal(Math.round(ending.sheets), ending.pictureSheets + 1, 'the document is the cover plus one sheet per picture, grouped rows counting once');
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
  // Every cover is one sheet, with long writing stepped down to fit. Measure
  // every project: a step that still runs long has to fail here rather than
  // silently clipping a project's writing out of its PDF.
  const sweep = await browser.newPage({ javaScriptEnabled: false });
  await sweep.goto(server.url);
  const slugs = await sweep.$$eval('[data-print-project]', nodes => nodes.map(node => node.dataset.printProject));
  const badCovers = [];
  for (const slug of slugs) {
    await sweep.goto(`${server.url}/${slug}/`);
    await sweep.emulateMedia({ media: 'print' });
    const cover = await sweep.evaluate(() => {
      const mm = 96 / 25.4;
      const shown = selector => [...document.querySelectorAll(selector)].filter(node => node.offsetParent !== null);
      const page = shown('.print-project .print-page')[0];
      const last = shown('.print-project-link')[0] || shown('.print-copy-full')[0];
      if (!page || !last) return null;
      const box = page.getBoundingClientRect();
      // A forced break after the last printed sheet prints a blank page.
      const printed = [...shown('#projects .media-item')].at(-1) || page;
      return {
        sheets: +(box.height / mm / 190.5).toFixed(3),
        writingEndsAt: +((last.getBoundingClientRect().bottom - box.top) / mm).toFixed(1),
        heroes: shown('.print-project .print-hero').length,
        scale: getComputedStyle(page).getPropertyValue('--copy-scale').trim(),
        breakAfterLast: getComputedStyle(printed).breakAfter,
      };
    });
    await sweep.emulateMedia({ media: 'screen' });
    if (!cover) { badCovers.push({ slug, cover: 'no printable cover' }); continue; }
    // One sheet, one photograph, and the writing inside it with a foot to spare.
    if (cover.sheets !== 1 || cover.heroes !== 1 || cover.writingEndsAt > 186 || cover.breakAfterLast === 'page') badCovers.push({ slug, ...cover });
  }
  assert.deepEqual(badCovers, [], 'every cover is one sheet with one hero, its writing inside, and no forced break after the last sheet');
  // Layout alone cannot show a trailing blank sheet, because a forced break
  // adds a page without adding height. Count the pages in the real PDF: one
  // project that prints images after its cover, and one that prints none.
  const pdfPages = buffer => (buffer.toString('latin1').match(/\/Type\s*\/Page[^sC]/g) || []).length;
  for (const slug of ['jagad', 'lyra']) {
    await sweep.goto(`${server.url}/${slug}/`);
    await sweep.emulateMedia({ media: 'print' });
    const expected = await sweep.evaluate(() => {
      const mm = 96 / 25.4;
      const shown = selector => [...document.querySelectorAll(selector)].filter(node => node.offsetParent !== null);
      const page = shown('.print-project .print-page')[0];
      // Images that take a sheet each, plus one sheet for every grouped row.
      return Math.round(page.getBoundingClientRect().height / mm / 190.5)
        + shown('#projects .media-item').filter(node => !node.closest('.print-together')).length
        + document.querySelectorAll('#projects .media-row.print-together').length;
    });
    assert.equal(pdfPages(await sweep.pdf({ preferCSSPageSize: true })), expected, `${slug} prints its cover sheets plus one page per picture, with no blank page`);
    // A grouped row that loses a panel still fills its sheet with the panels
    // that remain, so counting them is not enough: their widths have to add up
    // to the full sheet, or a column has quietly gone missing.
    const rowFill = await sweep.evaluate(() => {
      const mm = 96 / 25.4;
      return [...document.querySelectorAll('#projects .media-row.print-together')].map(row => {
        const panels = [...row.querySelectorAll(':scope > .media-item')].filter(node => node.offsetParent !== null);
        const width = panels.reduce((sum, node) => sum + node.getBoundingClientRect().width / mm, 0);
        return { panels: panels.length, width: +width.toFixed(1) };
      });
    });
    assert.ok(rowFill.every(row => row.panels > 1 && Math.abs(row.width - 338.667) < 1),
      `${slug} grouped rows keep every panel and fill the sheet: ${JSON.stringify(rowFill)}`);
    await sweep.emulateMedia({ media: 'screen' });
  }
  await sweep.close();
  console.log(`✓ ${slugs.length} project covers are one sheet with one hero, writing inside, no blank pages`);
  assert.deepEqual(missing, [], 'no missing assets');
} finally {
  await browser.close();
  await server.close();
}
