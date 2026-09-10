import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { previewServer } from './preview-server.mjs';

const server = process.env.AUDIT_BASE_URL ? null : await previewServer();
const base = process.env.AUDIT_BASE_URL || server.url;
const prefix = new URL(base).pathname.replace(/\/$/, '');
const output = 'screenshots/site-smoke';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (existsSync(chromium.executablePath()) ? undefined : 'chrome') });
const results = [];
const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const desktop = { viewport: { width: 1440, height: 900 } };

async function check(name, options, callback) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await callback(page, context);
    assert.deepEqual(errors, [], 'uncaught browser errors');
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: error.stack });
    console.error(`✗ ${name}: ${error.message}`);
    await page.screenshot({ path: `${output}/${name.replace(/[^a-z0-9]+/gi, '-')}-failed.png` }).catch(() => {});
  } finally { await context.close(); }
}

async function visit(page, route = '/') {
  await page.goto(base + route);
  await page.waitForFunction(() => document.documentElement.classList.contains('enhanced'));
}

try {
  for (const [name, viewport] of [['desktop', desktop], ['mobile', mobile]]) {
    await check(`${name} image space before downloads`, viewport, async page => {
      await page.route('**/img/**', route => route.abort());
      await visit(page, '/dome-dreaming/');
      const geometry = await page.locator('.media-row img').evaluateAll(images => images.map(image => {
        const rect = image.getBoundingClientRect(); return { width: rect.width, height: rect.height };
      }));
      assert.equal(geometry.length, 20);
      assert.ok(geometry.every(rect => rect.width > 100 && rect.height > 100), JSON.stringify(geometry));
      const headingX = await page.locator('.text-large').first().evaluate(el => el.getBoundingClientRect().left);
      const bodyX = await page.locator('.text-small').first().evaluate(el => el.getBoundingClientRect().left);
      assert.ok(Math.abs(headingX - bodyX) < 1, 'statement and body share an alignment');
    });
  }

  await check('all project routes on mobile', mobile, async page => {
    await visit(page);
    const slugs = await page.evaluate(() => window.__PROJECTS_DATA__.map(project => project.slug));
    assert.ok(slugs.length > 0);
    for (const slug of slugs) {
      await visit(page, `/${slug}/`);
      const state = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        zero: [...document.querySelectorAll('#projects img, #projects video')].some(el => el.getBoundingClientRect().width < 1 || el.getBoundingClientRect().height < 1),
        title: document.title,
        hero: document.querySelector('.hero').getBoundingClientRect().top,
        gutter: parseFloat(getComputedStyle(document.getElementById('content')).paddingTop),
        floatingTitle: document.getElementById('header-toggle').textContent.trim(),
        alt: document.querySelector('.hero img')?.alt || document.querySelector('.hero video')?.getAttribute('aria-label'),
        videoControls: [...document.querySelectorAll('#projects video')].every(video => video.controls === !video.closest('.hero') && video.getAttribute('aria-hidden') !== 'true'),
        creditsAligned: [...document.querySelectorAll('.credits-list')].every(list => getComputedStyle(list).textAlign === 'left'),
        captions: document.querySelectorAll('#projects figcaption, #projects .video-description').length,
        videoDescriptions: [...document.querySelectorAll('#projects video')].every(video => video.getAttribute('aria-label')?.length > 15),
        stripSlugs: [...document.querySelectorAll('#strips .strip:not([hidden])')].map(strip => strip.dataset.project),
        extraNavigation: !!document.querySelector('.project-next'),
        schemas: [...document.querySelectorAll('script[type="application/ld+json"]')].map(script => JSON.parse(script.textContent)),
      }));
      assert.equal(state.overflow, false, `${slug} overflows`);
      assert.equal(state.zero, false, `${slug} has collapsed media`);
      assert.ok(state.alt.length > 15, `${slug} hero description`);
      assert.ok(state.title.endsWith(' — Jonas Johansson'), `${slug} document title`);
      assert.ok(Math.abs(state.hero - state.gutter) < 1, `${slug} hero starts at ${state.hero}`);
      assert.equal(state.title, `${state.floatingTitle} — Jonas Johansson`, `${slug} floating title`);
      assert.equal(state.videoControls, true, `${slug} video controls`);
      assert.equal(state.creditsAligned, true, `${slug} credits alignment`);
      assert.equal(state.captions, 0, `${slug} has no visible media captions`);
      assert.equal(state.videoDescriptions, true, `${slug} retains video descriptions`);
      assert.deepEqual(state.stripSlugs, slugs.filter(project => project !== slug), `${slug} shows only other published projects`);
      assert.equal(state.extraNavigation, false, `${slug} extra navigation`);
      assert.equal(state.schemas.at(-1)['@type'], 'CreativeWork');
    }
  });

  for (const [name, options] of [
    ['small phone', { ...mobile, viewport: { width: 320, height: 740 } }],
    ['phone', mobile],
    ['narrow desktop', { viewport: { width: 860, height: 1000 } }],
    ['touch landscape', { ...mobile, viewport: { width: 844, height: 390 } }],
    ['touch tablet', { ...mobile, viewport: { width: 1024, height: 768 } }],
  ]) {
    await check(`${name} has two columns of named project cards`, options, async page => {
      await visit(page);
      const rects = await page.locator('.strip').evaluateAll(strips => strips.map(strip => {
        const rect = strip.getBoundingClientRect();
        const label = strip.querySelector('.strip-label');
        const labelRect = label.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
          labelVisible: getComputedStyle(label).display !== 'none' && getComputedStyle(label).opacity === '1',
          labelFits: label.scrollWidth <= label.clientWidth && labelRect.height < rect.height && labelRect.right <= rect.right + 1 };
      }));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.ok(rects.every(rect => rect.width > 100 && rect.height >= 160 && rect.labelVisible && rect.labelFits));
      assert.equal(rects[0].y, rects[1].y, 'first two cards share a row');
      assert.equal(rects[0].x, rects[2].x, 'third card starts the next row');
      assert.ok(rects[1].x > rects[0].x + rects[0].width, 'columns have a gutter');
      assert.ok(rects[2].y > rects[0].y + rects[0].height, 'rows have a gutter');
      await page.locator('#collection').scrollIntoViewIfNeeded();
      await page.locator('.strip-image').evaluateAll(images => Promise.all(images.slice(0, 4).map(image => image.decode())));
      await page.screenshot({ path: `${output}/${name.replaceAll(' ', '-')}-cards.png` });
    });
  }

  await check('desktop strips respond while larger images are still downloading', desktop, async page => {
    await visit(page);
    await page.locator('#collection').scrollIntoViewIfNeeded();
    const strip = page.locator('#strip-dome-dreaming');
    const image = strip.locator('img');
    await image.evaluate(image => image.decode());
    const narrowSrc = await image.evaluate(image => image.currentSrc);
    const width = (await strip.boundingBox()).width;
    let release;
    const held = new Promise(resolve => { release = resolve; });
    let pending = 0;
    await page.route('**/img/**', async route => { pending++; await held; await route.continue(); });
    try {
      await strip.hover();
      await page.waitForTimeout(350);
      assert.ok(pending > 0, 'larger image download is pending');
      assert.ok((await strip.boundingBox()).width > width * 4, 'hover expands before download completes');
      assert.equal(await strip.locator('.strip-label').evaluate(label => getComputedStyle(label).opacity), '1');
      await page.mouse.move(0, 0);
      await strip.focus();
      await page.keyboard.press('Tab');
      await page.waitForTimeout(350);
      assert.ok((await page.locator('.strip:focus-visible').boundingBox()).width > width * 4, 'keyboard focus expands before download completes');
    } finally {
      release();
      await page.unrouteAll({ behavior: 'wait' });
    }
    await page.waitForFunction(src => document.querySelector('#strip-dome-dreaming img').currentSrc !== src, narrowSrc);
    await image.evaluate(image => image.decode());
    const fullSrc = await image.evaluate(image => image.currentSrc);
    await strip.hover();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(350);
    assert.equal(await image.evaluate(image => image.currentSrc), fullSrc, 'loaded image is retained after hover');
  });

  await check('keyboard navigation and metadata', desktop, async page => {
    await visit(page);
    await page.locator('#strip-dome-dreaming').focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('#projects #dome-dreaming');
    assert.equal(await page.title(), 'Dome Dreaming — Jonas Johansson');
    assert.equal(await page.locator('[rel="canonical"]').getAttribute('href'), `https://jonasjohansson.se${prefix}/dome-dreaming/`);
    assert.equal(await page.evaluate(() => document.activeElement.className), 'project-title');
    assert.equal(await page.locator('#intro').getAttribute('hidden'), '');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('#projects')), true);
    assert.equal(await page.locator('#header-toggle').textContent(), 'Dome Dreaming');
    await page.locator('#header-toggle').click();
    await page.waitForFunction(() => document.body.dataset.route === 'home');
    assert.equal(await page.title(), 'Jonas Johansson');
    assert.equal(await page.locator('[rel="canonical"]').getAttribute('href'), `https://jonasjohansson.se${prefix}/`);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'strip-dome-dreaming');
    assert.equal(await page.locator('#projects .project').count(), 0);
    assert.equal(await page.locator('#header').isVisible(), false);
  });

  await check('Back cancels a pending project', desktop, async page => {
    await visit(page);
    await page.route('**/firestarter/', async route => { await new Promise(resolve => setTimeout(resolve, 700)); await route.continue().catch(() => {}); });
    await page.locator('#strip-firestarter').focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/firestarter/');
    await page.goBack();
    await page.waitForTimeout(900);
    assert.equal(new URL(page.url()).pathname, `${prefix}/`);
    assert.equal(await page.locator('#projects .project').count(), 0);
    assert.equal(await page.locator('body').getAttribute('data-route'), 'home');
    assert.equal(await page.locator('#main').getAttribute('aria-busy'), 'false');
  });

  await check('failed project has recovery and retry works', desktop, async page => {
    await visit(page);
    await page.route('**/firestarter/', route => route.abort());
    await page.locator('#strip-firestarter').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.getElementById('navigation-actions').hidden);
    assert.equal(new URL(page.url()).pathname, `${prefix}/`);
    assert.equal(await page.locator('body').getAttribute('data-route'), 'home');
    assert.equal(await page.locator('#navigation-fallback').getAttribute('href'), `${prefix}/firestarter/`);
    await page.unroute('**/firestarter/');
    await page.locator('#navigation-retry').click();
    await page.waitForSelector('#projects #firestarter');
    assert.equal(await page.locator('#navigation-status').getAttribute('hidden'), '');
  });

  await check('motion preference applies to every mount and can change', { ...desktop, reducedMotion: 'reduce' }, async page => {
    await visit(page, '/jagad/');
    const video = page.locator('#projects video').first();
    await video.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    assert.equal(await video.evaluate(video => video.paused && !video.autoplay), true);
    await visit(page);
    await page.locator('#strip-jagad').focus(); await page.keyboard.press('Enter');
    await page.waitForSelector('#projects #jagad');
    await video.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
    assert.equal(await video.evaluate(video => video.paused && !video.autoplay), true);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => !document.querySelector('#projects video').paused);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('#projects video').paused);
  });

  await check('video hero uses its first-frame poster on direct and client navigation', { ...mobile, reducedMotion: 'reduce' }, async page => {
    await visit(page);
    await visit(page, '/vi-kommer-i-fred/');
    const hero = page.locator('.hero video');
    const poster = await hero.getAttribute('poster');
    assert.ok(poster.endsWith('.webp'));
    assert.ok(await hero.isVisible());
    assert.equal(await hero.evaluate(video => video.paused && !video.controls), true);
    assert.equal(await page.locator('link[data-hero-preload]').getAttribute('href'), poster);
    assert.equal(await page.locator('#projects video[src$="/02-2x.webm"]').count(), 1);
    assert.ok(await page.locator('#projects img').first().getAttribute('alt').then(alt => alt.includes('freestanding screen')));
    assert.ok((await page.locator('video[src$="/07.webm"]').getAttribute('aria-label')).includes('live street view'));
    await page.screenshot({ path: `${output}/vi-kommer-i-fred-mobile-hero.png` });
    await page.goBack();
    await page.waitForFunction(() => document.body.dataset.route === 'home');
    assert.equal(await page.locator('link[data-hero-preload]').count(), 0);
    const strip = page.locator('#strip-vi-kommer-i-fred');
    const posterHash = poster.match(/\/([^/]+)-\d+\.webp$/)[1];
    assert.ok((await strip.locator('img').getAttribute('src')).includes(posterHash));
    assert.equal(await strip.locator('video').count(), 0);
    await strip.tap();
    await page.waitForSelector('#projects #vi-kommer-i-fred');
    assert.equal(await hero.getAttribute('poster'), poster);
    assert.equal(await hero.evaluate(video => video.paused && !video.controls), true);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => {
      const video = document.querySelector('.hero video');
      return !video.paused && video.currentTime > 0;
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('.hero video').paused);
  });

  await check('returning home restores image strips, about text, focus and position', mobile, async page => {
    await visit(page);
    const order = await page.locator('.strip').evaluateAll(entries => entries.map(entry => entry.id));
    await page.reload();
    assert.deepEqual(await page.locator('.strip').evaluateAll(entries => entries.map(entry => entry.id)), order);
    const about = await page.locator('.intro-text').innerHTML();
    assert.equal(await page.locator('#about').isVisible(), true);
    assert.equal(await page.locator('#intro details, #intro summary').count(), 0);
    const chosen = page.locator('a.strip:visible').nth(10);
    await chosen.scrollIntoViewIfNeeded();
    const id = await chosen.getAttribute('id');
    const y = await page.evaluate(() => scrollY);
    await chosen.tap(); await page.waitForSelector('#projects .project');
    assert.ok(await page.locator('#strips img').count() > 0);
    await page.goBack(); await page.waitForFunction(() => document.body.dataset.route === 'home');
    assert.ok(await page.locator('#strips img').count() > 0);
    assert.equal(await page.locator('#about').isVisible(), true);
    assert.equal(await page.locator('.intro-text').innerHTML(), about);
    assert.deepEqual(await page.locator('.strip').evaluateAll(entries => entries.map(entry => entry.id)), order);
    assert.equal(await page.evaluate(() => document.activeElement.id), id);
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - y) < 2);
    await page.screenshot({ path: `${output}/mobile-restored-strips.png` });
  });

  await check('theme follows the system without preference controls', { ...desktop, colorScheme: 'dark' }, async page => {
    await visit(page);
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.equal(await page.locator('body').evaluate(body => getComputedStyle(body).backgroundColor), 'rgb(34, 31, 28)');
    assert.equal(await page.locator('#sound-toggle, #theme-preference').count(), 0);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light' && getComputedStyle(document.body).backgroundColor === 'rgb(255, 255, 255)');
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  });

  await check('project image strips exclude the open project and support navigation', desktop, async page => {
    await visit(page);
    const count = await page.locator('a.strip:visible').count();
    assert.equal(await page.locator('.collection-toolbar, .collection-controls, #project-filter, #shuffle-projects').count(), 0);
    await page.locator('#strip-jagad').click();
    await page.waitForSelector('#projects #jagad');
    assert.equal(await page.locator('#strip-jagad').isVisible(), false);
    assert.equal(await page.locator('a.strip:visible').count(), count - 1);
    assert.ok(await page.locator('#strips img').count() > 0);
    await page.locator('#collection').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#header').evaluate(header => header.getBoundingClientRect().bottom < 0), true);
    assert.equal(await page.locator('#strips').evaluate(strips => getComputedStyle(strips).display), 'flex');
    await page.locator('#strip-vi-kommer-i-fred').hover();
    await page.locator('#strip-vi-kommer-i-fred img').evaluate(image => image.decode());
    await page.screenshot({ path: `${output}/desktop-project-strips.png` });
    await page.locator('#strip-vi-kommer-i-fred').click();
    await page.waitForSelector('#projects #vi-kommer-i-fred');
    assert.ok(await page.locator('#strips img').count() > 0);
    await page.locator('#header-toggle').click();
    await page.waitForFunction(() => document.body.dataset.route === 'home');
    await page.locator('#strip-jagad').focus();
    await page.locator('#strip-jagad img').evaluate(image => image.decode());
  });

  await check('static HTML works without JavaScript', { ...desktop, javaScriptEnabled: false }, async page => {
    await page.goto(base);
    assert.ok(await page.locator('main #intro h1').isVisible());
    assert.ok(await page.locator('.strip-label').first().isVisible());
    await page.locator('.strip').first().scrollIntoViewIfNeeded();
    await page.locator('.strip img').first().evaluate(image => image.decode());
    await page.goto(base + '/dome-dreaming/');
    assert.equal(await page.locator('#intro').isVisible(), false);
    assert.equal(await page.locator('#header').isVisible(), true);
    assert.equal(await page.locator('.project-next').count(), 0);
    assert.equal(await page.locator('main .project').count(), 1);
    assert.ok(await page.locator('#strips img').count() > 0);
  });

  await check('home image wall stays light and footer has no divider', desktop, async page => {
    await visit(page);
    assert.equal(await page.locator('.strip-upcoming, .strip-status, .strip-meta, #collection [data-view]').count(), 0);
    const published = await page.evaluate(() => window.__PROJECTS_DATA__.map(project => project.slug));
    assert.deepEqual(await page.locator('#strips .strip').evaluateAll(strips => strips.map(strip => strip.dataset.project)), published);
    await page.locator('#collection').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('body').getAttribute('data-route'), 'home');
    await page.evaluate(() => document.activeElement?.blur());
    await page.waitForTimeout(400);
    const images = await page.evaluate(() => performance.getEntriesByType('resource').filter(entry => /\/img\/.*\.(avif|webp)$/.test(entry.name)));
    const bytes = images.reduce((sum, image) => sum + image.transferSize, 0);
    assert.ok(bytes < 2_000_000, `homepage images transferred ${bytes} bytes`);
    assert.ok(await page.locator('#strips img').count() > 0);
    assert.equal(await page.locator('#strips video').count(), 0);
    assert.equal(await page.locator('#intro-links').evaluate(footer => getComputedStyle(footer).borderTopWidth), '0px');
    assert.equal(await page.locator('.strip').last().evaluate(entry => getComputedStyle(entry).borderBottomWidth), '0px');
    results.push({ metric: 'desktop home image transfer bytes', value: bytes });
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: `${output}/desktop-home.png`, fullPage: true });
    await page.locator('#strip-dome-dreaming').hover();
    await page.waitForTimeout(400);
    await page.locator('#strip-dome-dreaming img').evaluate(image => image.decode());
    await page.screenshot({ path: `${output}/desktop-wall-hover.png` });
  });

  await check('mobile project media stays lazy', mobile, async page => {
    await visit(page);
    await page.locator('#strip-klattermusen').tap();
    await page.waitForSelector('#projects #klattermusen');
    await page.waitForTimeout(300);
    const bodyImages = page.locator('#projects .media-item:not(.hero) img');
    assert.equal(await bodyImages.evaluateAll(images => images.every(image => image.loading === 'lazy')), true);
    const loaded = await bodyImages.evaluateAll(images => images.filter(image => image.complete && image.naturalWidth).length);
    assert.ok(loaded < await bodyImages.count(), `loaded all ${loaded} body images`);
    await page.screenshot({ path: `${output}/mobile-project.png` });
    await visit(page);
    await page.screenshot({ path: `${output}/mobile-home.png`, fullPage: true });
  });

  if (!process.env.AUDIT_BASE_URL) {
    const manifest = JSON.parse(readFileSync('dist/image-manifest.json', 'utf8'));
    assert.ok(manifest.length > 0);
    assert.ok(manifest.every(url => existsSync('dist' + url.slice(prefix.length))));
  }
} finally {
  writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
  await server?.close();
}
if (results.some(result => result.passed === false)) process.exitCode = 1;
