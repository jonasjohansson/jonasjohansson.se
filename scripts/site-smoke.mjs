import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { previewServer } from './preview-server.mjs';
import { readProjects } from './project-data.js';
import { ogFingerprint } from './images.js';
import { checkStripAudio } from './strip-audio-checks.mjs';

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
    console.error(`✗ ${name}: ${error.stack || error.message}`);
    await page.screenshot({ path: `${output}/${name.replace(/[^a-z0-9]+/gi, '-')}-failed.png` }).catch(() => {});
  } finally { await context.close(); }
}

async function visit(page, route = '/') {
  // The landing page opens on About; most checks start from the wall.
  const url = base + (route === '/' ? '/#collection' : route);
  // Going to the same URL with a hash does not reload, so start over explicitly.
  if (page.url() === url) await page.reload();
  else await page.goto(url);
  await page.waitForFunction(() => document.documentElement.classList.contains('enhanced'));
  if (route === '/') await waitForHomeWall(page);
}

// Phones open a strip with the first tap, naming it, and enter with the second.
async function openStrip(page, strip, via = 'tap') {
  const once = () => via === 'dispatch' ? strip.evaluate(link => link.click()) : via === 'click' ? strip.click() : strip.tap();
  await once();
  if (await page.evaluate(() => matchMedia('(hover: none)').matches)) await once();
}

async function waitForHomeWall(page) {
  await page.waitForFunction(() => document.body.dataset.route === 'home' && document.body.dataset.homeView === 'projects' && Math.abs(document.getElementById('intro-links').getBoundingClientRect().bottom - innerHeight) < 1);
}

// The bottom-left caption names the hovered project.
const caption = page => page.locator('#strip-caption').evaluate(caption => caption.hidden ? '' : caption.textContent);

async function checkFooter(page) {
  const footer = await page.locator('#intro-links').boundingBox();
  const wall = await page.locator('#strips').boundingBox();
  const touch = await page.evaluate(() => matchMedia('(hover: none)').matches);
  if (touch) assert.ok(Math.abs(footer.y - wall.y - wall.height) < 1, 'on phones the categories sit directly below the strips');
  else assert.ok(footer.y < wall.y + wall.height && footer.y + footer.height >= wall.y + wall.height - 1, 'the categories float over the foot of the strips');
  assert.ok(Math.abs(footer.y + footer.height - page.viewportSize().height) < 1, 'footer fits within the strip viewport');
  const home = await page.locator('body').getAttribute('data-route') === 'home';
  const header = page.locator(home ? '#home-header' : '#collection-header');
  const contacts = header.locator('.header-contacts');
  const contactBox = await contacts.boundingBox();
  const contactRow = await header.boundingBox();
  assert.deepEqual((await contacts.locator('a').allTextContents()).map(text => text.trim()), ['Labs', 'Instagram', 'CV', 'Email'], 'contact links stay concise');
  assert.equal(await contacts.locator('svg').count(), 0, 'contact links are plain text');
  const printButton = contacts.locator('button[data-action="print"]');
  assert.equal(await printButton.count(), 1, 'a print button sits with the contacts');
  if (touch) assert.equal(await printButton.isVisible(), false, 'the print button stays off touch devices');
  else assert.equal((await printButton.textContent()).trim(), 'Print', 'the print button is plain text');
  assert.ok(contactBox.x + contactBox.width <= wall.x + wall.width + 1, 'contact links stay within the strips');
  assert.ok(contactBox.y >= contactRow.y && contactBox.y + contactBox.height <= contactRow.y + contactRow.height + 1, 'contacts fit in the row above the strips');
  const name = await header.locator(home ? '#home-title' : '.collection-home-link').boundingBox();
  assert.ok(name.x + name.width <= contactBox.x || name.y + name.height <= contactBox.y, 'contact links do not overlap the name (beside it, or on a second row on narrow screens)');
  assert.equal(name.x, wall.x, 'the name block sits flush with the wall’s corner');
  if (touch) assert.ok(Math.abs(contactRow.y + contactRow.height - wall.y) < 1, 'on phones the header sits directly above the strips');
  else assert.ok(contactRow.y <= wall.y + 1 && contactRow.y + contactRow.height > wall.y, 'the header floats over the top of the strips');
  if (!home) {
    if (touch) assert.equal(await page.locator('#header').isVisible(), false, 'phones show no project title');
    else {
      const title = await page.locator('#header-toggle').boundingBox();
      assert.ok(Math.abs(title.x + title.width / 2 - page.viewportSize().width / 2) < 1, 'project title remains centered');
    }
    assert.equal(await page.locator('#header .header-contacts').count(), 0, 'project hero header contains only the title');
  }
  await contacts.evaluate(nav => { nav.scrollLeft = nav.scrollWidth; });
  const email = await contacts.locator('a[href^="mailto:"]').boundingBox();
  assert.ok(email.x >= contactBox.x && email.x + email.width <= contactBox.x + contactBox.width + 1, 'Email remains reachable in the scrolling contact row on phones');
  await contacts.evaluate(nav => { nav.scrollLeft = 0; });
  assert.equal(await page.locator('#intro a[href^="mailto:"]').count(), 0, 'contacts stay outside About');
  assert.equal(await page.locator('#project-filters').isVisible(), true, 'tag filters are available on both strip walls');
  const filterBounds = await page.locator('#project-filters').evaluate(filters => {
    const rect = filters.getBoundingClientRect(), footer = filters.closest('footer').getBoundingClientRect();
    return { top: rect.top - footer.top, bottom: footer.bottom - rect.bottom };
  });
  assert.ok(filterBounds.top >= -1 && filterBounds.bottom >= -1, 'filters fit inside the footer');
}

try {
  await checkStripAudio({ check, visit, desktop, mobile });
  await check('the print button prints the portfolio', desktop, async page => {
    await visit(page, '/');
    await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed += 1; }; });
    await page.locator('#home-header button[data-action="print"]').click();
    await page.waitForFunction(() => window.__printed === 1);
  });

  await check('every project shares its hero without JavaScript', { ...desktop, javaScriptEnabled: false }, async (page, context) => {
    // Share crawlers need complete tags in the original HTML, before the router runs.
    await page.route(/\.(?:avif|webp|mp4|webm)(?:\?.*)?$/, route => route.abort());
    for (const project of readProjects().filter(project => project.type === 'work')) {
      const hero = project.blocks[0];
      const source = `${project.directory}/${hero.type === 'video' ? hero.poster : hero.src}`;
      const expectedPath = `${prefix}/img/og/${project.slug}-${ogFingerprint(source, hero.focal)}.jpg`;
      const expectedImage = `https://jonasjohansson.se${expectedPath}`;
      const response = await page.goto(`${base}/${project.slug}/`, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200, project.slug);
      for (const selector of ['meta[property="og:image"]', 'meta[property="og:image:secure_url"]', 'meta[name="twitter:image"]']) {
        assert.equal(await page.locator(selector).count(), 1, `${project.slug} has one ${selector}`);
        assert.equal(await page.locator(selector).getAttribute('content'), expectedImage, `${project.slug} uses its original hero or video poster`);
      }
      for (const selector of ['meta[property="og:image:alt"]', 'meta[name="twitter:image:alt"]']) {
        assert.equal(await page.locator(selector).getAttribute('content'), hero.alt, `${project.slug} describes the hero`);
      }
      assert.equal(await page.locator('meta[property="og:image:type"]').getAttribute('content'), 'image/jpeg');
      assert.equal(await page.locator('meta[property="og:image:width"]').getAttribute('content'), '1200');
      assert.equal(await page.locator('meta[property="og:image:height"]').getAttribute('content'), '630');
      assert.equal(await page.locator('meta[name="twitter:card"]').getAttribute('content'), 'summary_large_image');
      assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'), `${project.title} | Jonas Johansson`);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      assert.equal(canonical, `https://jonasjohansson.se${prefix}/${project.slug}/`);
      assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'), canonical);
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      assert.ok(description.length > 20, `${project.slug} has a sharing description`);
      assert.equal(await page.locator('meta[property="og:description"]').getAttribute('content'), description);
      assert.equal(await page.locator('meta[name="twitter:description"]').getAttribute('content'), description);
      const work = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => JSON.parse(node.textContent)).find(schema => schema['@type'] === 'CreativeWork'));
      assert.equal(work.image, expectedImage, `${project.slug} structured data uses the same hero`);
      const image = await context.request.get(new URL(expectedPath, base).href);
      assert.equal(image.status(), 200, `${project.slug} sharing image is published`);
      assert.match(image.headers()['content-type'], /^image\/jpeg/);
      const metadata = await sharp(await image.body()).metadata();
      assert.deepEqual([metadata.width, metadata.height, metadata.format, metadata.space], [1200, 630, 'jpeg', 'srgb'], `${project.slug} sharing image dimensions and format`);
    }
  });

  await check('sharing metadata follows client navigation and Back', desktop, async page => {
    const sharing = () => page.evaluate(() => ({
      images: [...document.querySelectorAll('meta[property="og:image"]')].map(node => node.content),
      twitter: [...document.querySelectorAll('meta[name="twitter:image"]')].map(node => node.content),
      url: document.querySelector('meta[property="og:url"]').content,
      work: [...document.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent)).find(schema => schema['@type'] === 'CreativeWork')?.image,
    }));
    await visit(page);
    const home = await sharing();
    await page.evaluate(() => { window.metadataNavigationMarker = true; });
    await page.locator('#strip-balena-voladora').click();
    await page.waitForSelector('#projects #balena-voladora');
    const whale = await sharing();
    assert.equal(whale.images.length, 1);
    assert.match(whale.images[0], /\/og\/balena-voladora-[a-f0-9]+\.jpg$/);
    assert.deepEqual(whale.twitter, whale.images);
    assert.equal(whale.work, whale.images[0]);
    await page.locator('#strip-society-expo').click();
    await page.waitForSelector('#projects #society-expo');
    const video = await sharing();
    assert.equal(video.images.length, 1);
    assert.match(video.images[0], /\/og\/society-expo-[a-f0-9]+\.jpg$/);
    assert.deepEqual(video.twitter, video.images);
    assert.equal(video.work, video.images[0]);
    assert.equal(await page.evaluate(() => window.metadataNavigationMarker), true, 'navigation did not reload the document');
    await page.goBack();
    await page.waitForSelector('#projects #balena-voladora');
    assert.deepEqual(await sharing(), whale, 'Back restores the previous sharing tags');
    await page.goBack();
    await waitForHomeWall(page);
    assert.deepEqual(await sharing(), home, 'home restores its own sharing tags');
  });

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
        touch: matchMedia('(hover: none)').matches,
        alt: document.querySelector('.hero img')?.alt || document.querySelector('.hero video')?.getAttribute('aria-label'),
        videoControls: [...document.querySelectorAll('#projects video')].every(video => !video.controls && video.getAttribute('aria-hidden') !== 'true' && (video.closest('.hero') || video.nextElementSibling?.matches('button.media-controls-reveal:not([hidden])'))),
        creditsAligned: [...document.querySelectorAll('.credits-list')].every(list => getComputedStyle(list).textAlign === 'left'),
        ending: document.querySelector('.project-grid > :last-child')?.matches('.text-block, .presskit-block'),
        captions: document.querySelectorAll('#projects figcaption, #projects .video-description').length,
        videoDescriptions: [...document.querySelectorAll('#projects video')].every(video => video.getAttribute('aria-label')?.length > 15),
        stripSlugs: [...document.querySelectorAll('#strips .strip:not([hidden])')].map(strip => strip.dataset.project),
        extraNavigation: !!document.querySelector('.project-next'),
        schemas: [...document.querySelectorAll('script[type="application/ld+json"]')].map(script => JSON.parse(script.textContent)),
      }));
      assert.equal(state.overflow, false, `${slug} overflows`);
      assert.equal(state.zero, false, `${slug} has collapsed media`);
      assert.ok(state.alt.length > 15, `${slug} hero description`);
      assert.ok(state.title.endsWith(' | Jonas Johansson'), `${slug} document title`);
      // Phones open on the hero, flush with the top of the screen; elsewhere it starts one gutter down.
      assert.ok(Math.abs(state.hero - (state.touch ? 0 : state.gutter)) < 1, `${slug} hero starts at ${state.hero}`);
      assert.equal(state.title, `${state.floatingTitle} | Jonas Johansson`, `${slug} floating title`);
      assert.equal(state.videoControls, true, `${slug} video controls`);
      assert.equal(state.creditsAligned, true, `${slug} credits alignment`);
      assert.equal(state.ending, true, `${slug} ends with text after its media`);
      assert.equal(state.captions, 0, `${slug} has no visible media captions`);
      assert.equal(state.videoDescriptions, true, `${slug} retains video descriptions`);
      assert.deepEqual(state.stripSlugs, slugs.filter(project => project !== slug), `${slug} shows only other published projects`);
      assert.equal(state.extraNavigation, false, `${slug} extra navigation`);
      assert.equal(state.schemas.at(-1)['@type'], 'CreativeWork');
    }
  });

  for (const [name, options] of [['wide desktop', { viewport: { width: 1920, height: 1080 } }], ['mobile', mobile]]) {
    await check(`${name} heroes fill the page width`, options, async page => {
      for (const slug of ['klattermusen', 'lights-for-ukraine', 'people-in-orbit', 'dome-dreaming', 'vi-kommer-i-fred']) {
        await visit(page, `/${slug}/`);
        const hero = await page.locator('.hero').boundingBox();
        const media = await page.locator('.hero img, .hero video').boundingBox();
        // Phones run the hero edge to edge; elsewhere it sits inside the page gutter.
        const inset = options.hasTouch ? 0 : 24;
        assert.equal(hero.x, inset, `${slug} hero starts at ${inset ? 'the page gutter' : 'the screen edge'}`);
        assert.ok(Math.abs(hero.width - (options.viewport.width - 2 * inset)) < 1, `${slug} hero uses the full ${inset ? 'content' : 'screen'} width`);
        assert.equal(media.width, hero.width, `${slug} image or video fills the hero frame`);
        const fittedWidth = await page.locator('.hero').evaluate(hero => {
          if (!hero.classList.contains('hero-contain')) return hero.clientWidth;
          const style = getComputedStyle(hero);
          const ratio = Number(style.getPropertyValue(innerWidth <= 768 ? '--mobile-ar' : '--ar'));
          return Math.min(hero.clientWidth, hero.clientHeight * ratio);
        });
        assert.ok(Math.abs(fittedWidth - hero.width) < 1, `${slug} uncropped image has no unused space at its sides`);
        if (slug === 'klattermusen') {
          await page.locator('.hero img').evaluate(image => image.decode());
          await page.screenshot({ path: `${output}/${name.replaceAll(' ', '-')}-full-width-hero.png` });
        }
      }
    });
  }

  for (const [name, options] of [
    ['small phone', { ...mobile, viewport: { width: 320, height: 740 } }],
    ['phone', mobile],
    ['narrow desktop', { viewport: { width: 860, height: 1000 } }],
    ['touch landscape', { ...mobile, viewport: { width: 844, height: 390 } }],
    ['touch tablet', { ...mobile, viewport: { width: 1024, height: 768 } }],
  ]) {
    await check(`${name} wall sits below About`, options, async page => {
      await visit(page);
      const wall = await page.locator('#strips').boundingBox();
      const header = await page.locator('#home-header').boundingBox();
      assert.equal(wall.x, 24);
      assert.equal(wall.width, options.viewport.width - 48);
      assert.equal((await page.locator('#home-link').boundingBox()).x, wall.x, 'the name starts at the wall’s left edge');
      if (options.hasTouch) assert.ok(Math.abs(wall.y - header.y - header.height) < 1, 'on phones the wall starts directly below the header');
      else assert.ok(Math.abs(wall.y - header.y - 24) < 1, 'the wall starts one gutter below the top of the floating header');
      await checkFooter(page);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const intro = await page.locator('#intro').boundingBox();
      assert.ok(intro.y < 0 && Math.abs(intro.y + intro.height - header.y) < 1, 'About is physically above the header and strips');
      const entries = await page.locator('.strip').evaluateAll(strips => strips.map(strip => ({
        width: strip.getBoundingClientRect().width,
        height: strip.getBoundingClientRect().height,
        named: strip.getAttribute('aria-label') === window.__PROJECTS_DATA__.find(project => project.slug === strip.dataset.project).title,
        visibleText: strip.textContent.trim(),
      })));
      // Touch strips are thin like desktop ones: the strip under a finger opens before the finger lifts.
      assert.ok(entries.every(entry => entry.width >= 8 && entry.height === wall.height && entry.named && entry.visibleText === ''));
      await page.locator('.strip:not([hidden]) .strip-image').evaluateAll(images => Promise.all(images.slice(0, 4).map(image => image.decode())));
      await page.screenshot({ path: `${output}/${name.replaceAll(' ', '-')}-home-wall.png` });
      await page.locator('#home-link').click();
      await page.waitForFunction(() => scrollY < 1 && document.activeElement.id === 'intro');
      const aboutHeader = await page.locator('#home-header').boundingBox();
      assert.ok(Math.abs(aboutHeader.y - intro.height) < 1, 'the name and contacts scroll with the strips');
      const wallTop = (await page.locator('#strips').boundingBox()).y;
      if (options.hasTouch) assert.ok(Math.abs(wallTop - aboutHeader.y - aboutHeader.height) < 1, 'header stays attached above the wall');
      else assert.ok(Math.abs(wallTop - aboutHeader.y - 24) < 1, 'header stays over the top of the wall');
      const text = await page.locator('.intro-text').boundingBox();
      assert.equal(text.x, wall.x, 'About shares the strips’ left edge');
      assert.ok(aboutHeader.y - text.y - text.height <= 81, 'About ends after its content without an empty viewport');
      assert.equal(await page.locator('#home-link').textContent(), 'Jonas Johansson');
      assert.equal(await page.locator('#home-link').getAttribute('aria-label'), 'Jonas Johansson, Projects');
      assert.equal(await page.locator('#intro').evaluate(intro => intro.inert), false);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'intro');
      assert.equal((await page.locator('#strips').boundingBox()).height, wall.height, 'the wall keeps its height when scrolling');
      assert.equal(await page.locator('#intro').evaluate(intro => getComputedStyle(intro).opacity), '1');
      await page.screenshot({ path: `${output}/${name.replaceAll(' ', '-')}-about-above.png` });
      await page.keyboard.press('Escape');
      await waitForHomeWall(page);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'home-link');
    });

    await check(`${name} has the same vertical strip wall below project pages`, options, async page => {
      await visit(page, '/jagad/');
      const wall = await page.locator('#strips').boundingBox();
      assert.equal(wall.x, 24);
      // Phones run the hero edge to edge, so there the strips keep the page gutter instead.
      assert.equal(wall.x, options.hasTouch ? 24 : (await page.locator('.hero').boundingBox()).x, 'strips share the project media gutter');
      assert.equal(wall.width, options.viewport.width - 48);
      if (options.hasTouch) assert.equal(wall.height, options.viewport.height - 48 - (await page.locator('#collection-header').boundingBox()).height - (await page.locator('#intro-links').boundingBox()).height + 24, 'on phones the wall fills what the header, categories and gutters leave');
      else assert.equal(wall.height, options.viewport.height - 48, 'the wall keeps the page gutter above and below');
      assert.ok((await page.locator('#projects').boundingBox()).y < wall.y);
      const rects = await page.locator('.strip:not([hidden])').evaluateAll(strips => strips.map(strip => {
        const rect = strip.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
          named: strip.getAttribute('aria-label') === window.__PROJECTS_DATA__.find(project => project.slug === strip.dataset.project).title,
          visibleText: strip.textContent.trim() };
      }));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.ok(rects.every(rect => rect.width >= 8 && rect.height === wall.height && rect.named && rect.visibleText === ''));
      for (let index = 1; index < rects.length; index++) {
        assert.equal(rects[index].y, rects[0].y, 'strips share an alignment');
        assert.ok(Math.abs(rects[index].x - rects[index - 1].x - rects[index - 1].width) < 1, 'images touch horizontally');
      }
      assert.equal(new Set(rects.map(rect => rect.height)).size, 1, 'image heights are uniform');
      await page.locator('#collection').evaluate(collection => collection.scrollIntoView({ block: 'start' }));
      await checkFooter(page);
      await page.locator('.strip:not([hidden]) .strip-image').evaluateAll(images => Promise.all(images.slice(0, 4).map(image => image.decode())));
      await page.screenshot({ path: `${output}/${name.replaceAll(' ', '-')}-project-wall.png` });
    });
  }

  for (const [name, options] of [['desktop', desktop], ['mobile', mobile]]) {
    await check(`${name} landing opens on About with the name hidden until the strips fill the screen`, options, async page => {
      await page.goto(base + '/');
      await page.waitForFunction(() => document.documentElement.classList.contains('enhanced') && document.body.dataset.homeView === 'about' && scrollY < 1);
      const opacity = () => page.locator('#home-title').evaluate(title => getComputedStyle(title).opacity);
      assert.equal(await opacity(), '0', 'the name is hidden while About shows');
      assert.equal(await page.locator('#home-link').getAttribute('aria-label'), 'Jonas Johansson, Projects');
      assert.ok(await page.locator('.header-contacts').first().isVisible(), 'the contacts stay visible');
      assert.equal(await caption(page), '', 'no caption until a strip is hovered');
      // Scroll rather than press Escape: a keyboard-focused name stays visible on purpose.
      await page.evaluate(() => scrollTo({ top: document.getElementById('collection').getBoundingClientRect().top + scrollY, behavior: 'instant' }));
      await waitForHomeWall(page);
      assert.equal(await opacity(), '1', 'the name shows once the strips fill the screen');
      await page.evaluate(() => scrollBy({ top: -120, behavior: 'instant' }));
      await page.waitForFunction(() => document.body.dataset.homeView === 'about');
      assert.equal(await opacity(), '0', 'scrolling back up towards About hides the name again');
    });
  }

  await check('phone taps open a strip and name it before entering the project', mobile, async page => {
    await visit(page);
    const first = page.locator('#strip-harpa');
    const second = page.locator('#strip-jagad');
    await first.tap();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.project), undefined, 'the first tap does not open the project');
    assert.equal(await first.evaluate(strip => strip.classList.contains('is-active')), true, 'the tapped strip opens');
    assert.equal(await caption(page), 'Harpa', 'the open strip is named');
    const openWidth = (await first.boundingBox()).width;
    assert.ok(openWidth > (await second.boundingBox()).width * 2, 'the open strip is clearly wider than the rest');
    await second.tap();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.project), undefined, 'tapping another strip moves the opening, it does not navigate');
    assert.equal(await caption(page), 'Jagad', 'the caption follows the open strip');
    assert.equal(await first.evaluate(strip => strip.classList.contains('is-active')), false, 'only one strip stays open');
    await second.tap();
    await page.waitForFunction(() => document.documentElement.dataset.project === 'jagad');
  });

  await check('scroll up reaches About without fading or resizing the strips', desktop, async page => {
    await visit(page);
    const height = (await page.locator('#strips').boundingBox()).height;
    await page.mouse.move(700, 400);
    await page.mouse.wheel(0, -250);
    await page.waitForFunction(() => document.body.dataset.homeView === 'about');
    assert.equal(await page.locator('#intro').evaluate(intro => getComputedStyle(intro).opacity), '1');
    assert.equal((await page.locator('#strips').boundingBox()).height, height);
    await page.mouse.wheel(0, -2000);
    await page.waitForFunction(() => scrollY < 1);
    assert.equal(await page.locator('#intro').evaluate(intro => intro.inert), false);
    await page.mouse.wheel(0, 2000);
    await waitForHomeWall(page);
    await checkFooter(page);
  });

  for (const [name, options] of [['narrow desktop', { viewport: { width: 1280, height: 900 } }], ['below desktop breakpoint', { viewport: { width: 1439, height: 900 } }], ['mobile', mobile]]) {
    await check(`${name} gallery images share the hero margins`, options, async page => {
      for (const slug of ['borderlan', 'wysiwyg', 'kagora', 'dome-dreaming']) {
        await visit(page, `/${slug}/`);
        const geometry = await page.evaluate(() => {
          const hero = document.querySelector('.hero').getBoundingClientRect();
          const images = [...document.querySelectorAll('.project-grid > .media-item.wide:not([class*="size-"]):not([style*="--col-start"]), .project-grid > .media-row')];
          return { hero: { x: hero.x, width: hero.width }, images: images.map(image => { const r = image.getBoundingClientRect(); return { x: r.x, width: r.width }; }) };
        });
        assert.ok(geometry.images.length > 0, `${slug} has gallery media to check`);
        // Phones keep the gallery inside the page gutter while the hero runs edge to edge.
        const inset = options.hasTouch ? 24 : geometry.hero.x;
        const width = options.hasTouch ? options.viewport.width - 48 : geometry.hero.width;
        for (const image of geometry.images) {
          assert.ok(Math.abs(image.x - inset) < 1, `${slug} gallery starts at ${options.hasTouch ? 'the page gutter' : "the hero's left edge"}`);
          assert.ok(Math.abs(image.width - width) < 1, `${slug} gallery uses ${options.hasTouch ? 'the content width' : "the hero's width"}`);
        }
      }
    });
  }

  for (const width of [1440, 1850, 2560]) {
    await check(`${width}px galleries pair adjacent media and give single items the full width`, { viewport: { width, height: 1000 } }, async page => {
      await visit(page);
      const slugs = await page.evaluate(() => window.__PROJECTS_DATA__.map(project => project.slug));
      for (const slug of slugs) {
        await visit(page, `/${slug}/`);
        const geometry = await page.locator('.project-grid').evaluate(grid => {
          const box = node => {
            const r = node.getBoundingClientRect();
            const media = node.matches('.media-item:not(.hero)');
            const element = media && node.querySelector('img, video');
            const image = element && element.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, right: r.right, height: r.height, media,
              ar: Number(node.style.getPropertyValue('--ar')),
              fit: element && getComputedStyle(element).objectFit,
              alt: element && (element.alt || element.getAttribute('aria-label')),
              imageWidth: image && image.width, imageHeight: image && image.height,
              sizes: node.querySelector('picture source')?.getAttribute('sizes') };
          };
          return {
            width: grid.clientWidth,
            hero: box(grid.querySelector('.hero')),
            children: [...grid.children].map(box),
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        assert.equal(geometry.overflow, false, `${slug} stays within the viewport`);
        assert.ok(Math.abs(geometry.hero.width - geometry.width) < 1, `${slug} hero keeps the full width`);
        for (let i = 1; i < geometry.children.length; i++) {
          const media = geometry.children[i], next = geometry.children[i + 1];
          if (!media.media) continue;
          if (next?.media) {
            assert.ok(Math.abs(media.y - next.y) < 1, `${slug} adjacent media share a row`);
            for (const item of [media, next]) {
              assert.ok(item.width <= (geometry.width - 16) / 2 + 1, `${slug} paired media fit their half of the row`);
              assert.ok(item.x >= 24 && item.right <= width - 24 + 1, `${slug} keeps the outer gutter`);
            }
            i++;
          } else {
            assert.ok(Math.abs(media.width - geometry.width) < 1, `${slug} lone media fill the row`);
            assert.ok(Math.abs(media.height - Math.min(geometry.width / media.ar, 800, 896)) < 1, `${slug} lone media use a bounded height`);
            const authored = readProjects().find(project => project.slug === slug).blocks.find(block => block.alt === media.alt);
            assert.equal(media.fit, authored?.fit || 'cover', `${slug} respects the authored crop within the frame`);
            assert.ok(media.imageWidth >= media.width - 1 && media.imageHeight >= media.height - 1, `${slug} media fill their frame, including authored zoom crops`);
            if (media.sizes) assert.ok(media.sizes.startsWith('(min-width: 1440px) calc(100vw - 48px)'), `${slug} downloads a full-width image for an unpaired frame`);
          }
        }
        for (let i = 1; i < geometry.children.length; i++) {
          assert.ok(geometry.children[i].y >= geometry.children[i - 1].y - 1, `${slug} keeps its authored sequence`);
        }
      }
      await visit(page, '/borderlan/');
      const entrance = page.locator('img[alt^="An illuminated BorderLAN sign"]');
      const players = page.locator('img[alt^="Four players sit around BorderLAN"]');
      const first = await entrance.boundingBox(), second = await players.boundingBox();
      assert.ok(Math.abs(first.y - second.y) < 1, 'the entrance and Counter-Strike room photograph share a row');
      assert.ok(Math.abs(second.x - first.x - first.width - 16) < 1, 'the two photographs have the normal gutter');
      await entrance.scrollIntoViewIfNeeded();
      await entrance.evaluate(image => image.decode());
      await players.evaluate(image => image.decode());
      await page.screenshot({ path: `${output}/borderlan-two-images-${width}.png` });
    });
  }

  for (const width of [390, 1280, 1850, 2560]) {
    await check(`${width}px portrait triptych keeps images and video together`, width === 390 ? mobile : { viewport: { width, height: 1000 } }, async page => {
      await visit(page, '/vi-kommer-i-fred/');
      const row = page.locator('.media-row:has(video[src$="/07.webm"])');
      assert.equal(await row.locator('img').count(), 2, 'both still panels remain in the group');
      assert.equal(await row.locator('video').count(), 1, 'the moving panel remains in the group');
      const geometry = await row.evaluate(row => {
        const box = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
        return {
          row: box(row),
          items: [...row.children].map(item => ({ ...box(item), ar: Number(item.style.getPropertyValue('--ar')), media: box(item.querySelector('img, video')) })),
          after: box(row.nextElementSibling),
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.equal(geometry.overflow, false);
      assert.equal(geometry.row.x, 24);
      assert.ok(Math.abs(geometry.row.width - width + 48) < 1, 'the group uses the page width');
      for (const [i, item] of geometry.items.entries()) {
        assert.ok(Math.abs(item.media.width - item.width) < 1, 'media fill each panel');
        assert.ok(Math.abs(item.media.width / item.media.height - item.ar) < 0.001, 'tall panels retain their uncropped proportions');
        if (width > 768) {
          assert.ok(Math.abs(item.y - geometry.items[0].y) < 1, 'all three panels share a row');
          assert.ok(Math.abs(item.height - geometry.items[0].height) < 1, 'the image and video panels have equal heights');
          if (i) assert.ok(Math.abs(item.x - geometry.items[i - 1].right - 16) < 1, 'no oversized gap between panels');
        } else {
          assert.equal(item.x, 24, 'mobile panels align with the page');
          assert.ok(Math.abs(item.width - geometry.row.width) < 1, 'mobile panels use full width');
          if (i) assert.ok(Math.abs(item.y - geometry.items[i - 1].bottom - 16) < 1, 'mobile panels have the normal gap');
        }
      }
      assert.ok(geometry.after.y >= geometry.row.bottom, 'the following landscape starts after all three panels');
      if (width >= 1440) assert.ok(Math.abs(geometry.after.width - geometry.row.width) < 1, 'the following lone image keeps its full-width frame');
      const video = row.locator('video');
      await video.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('video[src$="/07.webm"]').currentTime > 0);
      if (width === 390) {
        assert.equal(await video.evaluate(video => video.controls), false, 'grouped videos also hide mobile controls initially');
        await row.locator('.media-controls-reveal').click();
        assert.equal(await video.evaluate(video => video.controls), true, 'tapping reveals grouped video controls');
      }
      await row.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await row.screenshot({ path: `${output}/vi-kommer-i-fred-triptych-${width}.png` });
    });
  }

  for (const [name, options] of [['desktop', desktop], ['mobile', mobile]]) {
    await check(`${name} film scan orientation matches its gallery frame`, options, async page => {
      await visit(page, '/balena-voladora/');
      const image = page.locator('img[alt^="A film photograph looking through"]');
      await image.scrollIntoViewIfNeeded();
      const geometry = await image.evaluate(async image => {
        await image.decode();
        const figure = image.closest('figure'), rect = image.getBoundingClientRect();
        return { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, displayed: rect.width / rect.height,
          frame: Number(figure.style.getPropertyValue('--ar')),
          height: rect.height, previousHeight: figure.previousElementSibling.getBoundingClientRect().height };
      });
      const expected = 2075 / 3130;
      // Browsers round density-corrected natural dimensions to whole pixels.
      assert.ok(Math.abs(geometry.naturalWidth - geometry.naturalHeight * expected) < 1, 'generated images apply the counterclockwise EXIF orientation');
      assert.ok(Math.abs(geometry.displayed - expected) < 0.001, 'the photo displays upright without distortion');
      assert.ok(Math.abs(geometry.frame - expected) < 0.001, 'the gallery uses the oriented aspect ratio');
      if (name === 'desktop') assert.ok(Math.abs(geometry.height - geometry.previousHeight) < 1, 'the rotated scan still matches its neighbour in height');
      await image.locator('xpath=../..').screenshot({ path: `${output}/balena-oriented-scan-${name}.png` });
    });
  }

  await check('name toggles About with keyboard and reduced motion', { ...desktop, reducedMotion: 'reduce' }, async page => {
    await visit(page);
    await page.evaluate(() => document.fonts.ready);
    await waitForHomeWall(page);
    assert.equal(await page.locator('#home-link').getAttribute('aria-label'), 'Jonas Johansson, About');
    await page.locator('#home-link').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => scrollY < 1 && document.activeElement.id === 'intro');
    assert.equal((await page.locator('.intro-text').boundingBox()).x, 24, 'About stays left aligned on wide screens');
    await page.keyboard.press('Escape');
    await waitForHomeWall(page);
    await page.evaluate(() => {
      scrollTo({ top: 0, behavior: 'instant' });
      document.getElementById('home-link').click();
    });
    await waitForHomeWall(page);
  });

  for (const [name, options] of [['desktop', desktop], ['mobile', mobile]]) {
    await check(`${name} toggles multiple tags and preserves the selection after Back`, options, async page => {
      await visit(page);
      const projects = await page.evaluate(() => window.__PROJECTS_DATA__);
      const tags = await page.locator('#project-filters button').evaluateAll(buttons => buttons.map(button => button.dataset.filter));
      assert.deepEqual(new Set(tags), new Set(projects.flatMap(project => project.tags).filter(tag => tag !== 'installation' && !/^\d{4}$/.test(tag))));
      assert.equal(tags.includes(''), false, 'there is no All button');
      assert.equal(tags.includes('education'), false, 'Education is no longer a filter');
      assert.ok(projects.find(project => project.slug === 'visualia').tags.includes('community'), 'Visualia belongs to Community');
      assert.ok(projects.find(project => project.slug === 'svartljus').tags.includes('community'), 'Svartljus belongs to Community');
      const selected = new Set(tags);
      const visibleSlugs = () => page.locator('.strip:not([hidden])').evaluateAll(strips => strips.map(strip => strip.dataset.project));
      const checkSelection = async () => {
        const expected = projects.filter(project => selected.size === tags.length || project.tags.some(tag => selected.has(tag))).map(project => project.slug);
        assert.deepEqual(await visibleSlugs(), expected, 'show projects matching any enabled tag');
        assert.deepEqual(await page.locator('#project-filters [aria-pressed="true"]').evaluateAll(buttons => buttons.map(button => button.dataset.filter)), tags.filter(tag => selected.has(tag)));
        assert.ok(selected.size > 0 && expected.length > 0, 'at least one tag and its projects stay visible');
        assert.equal(await page.locator('#project-filters [aria-disabled="true"]').count(), selected.size === 1 ? 1 : 0);
        assert.equal((await page.locator('#strips').boundingBox()).height, options.hasTouch ? options.viewport.height - 48 - (await page.locator('#home-header').boundingBox()).height - (await page.locator('#intro-links').boundingBox()).height + 48 : options.viewport.height - 48);
      };
      const toggle = async tag => {
        await page.locator('#project-filters button').nth(tags.indexOf(tag)).click();
        if (selected.size === tags.length) {
          selected.clear();
          selected.add(tag);
        } else if (selected.has(tag)) selected.delete(tag);
        else selected.add(tag);
        await checkSelection();
      };
      await checkSelection();
      assert.equal(await page.locator('.strip:not([hidden])').count(), projects.length, 'all tags start on, including projects tagged only Installation');
      await toggle('light');
      assert.deepEqual(await page.locator('#project-filters [aria-pressed="true"]').evaluateAll(buttons => buttons.map(button => button.dataset.filter)), ['light'], 'first click selects only Light');
      const last = page.locator('#project-filters [aria-pressed="true"]');
      await last.click({ force: true });
      await checkSelection();
      await last.focus();
      await page.keyboard.press('Space');
      await checkSelection();
      await page.keyboard.press('Enter');
      await checkSelection();
      await checkFooter(page);
      const select = async wanted => {
        for (const tag of wanted.filter(tag => !selected.has(tag))) await toggle(tag);
        for (const tag of [...selected].filter(tag => !wanted.includes(tag))) await toggle(tag);
      };
      for (const tag of tags) {
        await select([tag]);
      }
      await select(['mixed reality', 'community']);
      const expected = await visibleSlugs();
      const chosen = page.locator('.strip:not([hidden])').first();
      const id = await chosen.getAttribute('id');
      await openStrip(page, chosen, 'click');
      await page.waitForSelector('#projects .project');
      assert.equal(await page.locator('.strip:not([hidden])').count(), projects.length - 1, 'project pages show all other projects');
      await page.goBack();
      await waitForHomeWall(page);
      assert.deepEqual(await visibleSlugs(), expected);
      assert.equal(await page.evaluate(() => document.activeElement.id), id);
      await checkSelection();
      const design = page.locator('#project-filters [data-filter="design"]');
      await design.focus();
      await page.keyboard.press('Space');
      selected.add('design');
      await checkSelection();
      await toggle('mixed reality');
      await toggle('community');
      const designCount = projects.filter(project => project.tags.includes('design')).length;
      assert.equal(await page.locator('#project-count').textContent(), `${designCount} ${designCount === 1 ? 'project' : 'projects'}`);
      for (const tag of tags.filter(tag => !selected.has(tag))) await toggle(tag);
      assert.equal(await page.locator('.strip:not([hidden])').count(), projects.length);
      await page.locator('#home-link').click();
      await page.waitForFunction(() => scrollY < 1);
      await design.focus();
      await page.keyboard.press('Space');
      selected.clear();
      selected.add('design');
      await checkSelection();
      await waitForHomeWall(page);
    });
  }

  await check('unlisted projects keep their page but stay off the wall, sitemap and search', desktop, async page => {
    const unlisted = readProjects().filter(project => project.type === 'work' && project.unlisted);
    const sitemap = await (await page.request.get(`${base}/sitemap.xml`)).text();
    await visit(page, '/');
    for (const project of unlisted) {
      assert.equal(await page.locator(`#strip-${project.slug}`).count(), 0, `${project.slug} has no strip`);
      assert.ok(!sitemap.includes(`/${project.slug}/`), `${project.slug} is not in the sitemap`);
    }
    assert.ok(!(await page.evaluate(() => window.__PROJECTS_DATA__.map(project => project.slug))).some(slug => unlisted.some(project => project.slug === slug)), 'unlisted projects are not filterable');
    for (const project of unlisted) {
      const response = await page.goto(`${base}/${project.slug}/`, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200, `${project.slug} still opens directly`);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
      assert.equal(await page.locator('#strips .strip:not([hidden])').count(), await page.locator('#strips .strip').count(), 'every listed project stays on its wall');
    }
  });

  for (const [name, options] of [['desktop', desktop], ['mobile', mobile]]) {
    await check(`${name} year and categories reset each other on both strip walls`, options, async page => {
      const datedProjects = readProjects().filter(project => project.type === 'work' && !project.unlisted);
      const expected = (year, excluded = '', tags = []) => datedProjects
        .filter(project => project.slug !== excluded && (!year || project.date.startsWith(year) || project.years.includes(year)) && (!tags.length || project.tags.some(tag => tags.includes(tag))))
        .map(project => project.slug);
      await visit(page);
      // The wall is ordered by colour, not date; expectations follow the wall.
      const wallOrder = await page.locator('#strips .strip').evaluateAll(strips => strips.map(strip => strip.dataset.project));
      datedProjects.sort((a, b) => wallOrder.indexOf(a.slug) - wallOrder.indexOf(b.slug));
      const yearSelect = page.getByRole('combobox', { name: 'Year', exact: true });
      const tag = value => page.locator(`#project-filters [data-filter="${value}"]`);
      const visible = () => page.locator('#strips .strip:not([hidden])').evaluateAll(strips => strips.map(strip => strip.dataset.project));
      assert.equal(await yearSelect.getAttribute('multiple'), null, 'the year selector cannot select multiple years');
      assert.deepEqual(await yearSelect.locator('option').allTextContents(), ['All years', '2026', '2025', '2024', '2023']);
      assert.equal(await page.locator('#project-filters button').evaluateAll(buttons => buttons.some(button => /^\d{4}$/.test(button.dataset.filter))), false, 'years are no longer toggle buttons');
      for (const year of ['2025', '2024', '2023', '2026', '']) {
        await yearSelect.selectOption(year);
        assert.deepEqual(await visible(), expected(year), 'changing year replaces the previous selection');
        assert.equal(await yearSelect.inputValue(), year);
      }
      const pressed = () => page.locator('#project-filters [aria-pressed="true"]').evaluateAll(buttons => buttons.map(button => button.dataset.filter));
      const allTags = await page.locator('#project-filters button').evaluateAll(buttons => buttons.map(button => button.dataset.filter));
      await yearSelect.selectOption('2025');
      await tag('mixed reality').click();
      assert.equal(await yearSelect.inputValue(), '', 'choosing a category clears the year');
      assert.deepEqual(await visible(), expected('', '', ['mixed reality']), 'the category applies across all years');
      await tag('community').click();
      assert.deepEqual(await visible(), expected('', '', ['mixed reality', 'community']), 'categories still combine');
      await yearSelect.selectOption('2024');
      assert.deepEqual(await pressed(), allTags, 'choosing a year turns every category back on');
      assert.deepEqual(await visible(), expected('2024'), 'the year applies across all categories');
      assert.equal(await page.locator('#project-year option[disabled]').count(), 0, 'every year stays available');
      await tag('community').click();
      assert.equal(await yearSelect.inputValue(), '');
      assert.deepEqual(await visible(), expected('', '', ['community']));
      await tag('design').click();
      await tag('community').click();
      assert.deepEqual(await visible(), expected('', '', ['design']));

      // Restore all categories and check the single-year state through navigation.
      const inactiveTags = await page.locator('#project-filters [aria-pressed="false"]').evaluateAll(buttons => buttons.map(button => button.dataset.filter));
      for (const value of inactiveTags) await tag(value).click();
      await yearSelect.selectOption('2023');
      await yearSelect.scrollIntoViewIfNeeded();
      const yearBounds = await yearSelect.boundingBox(), filterBounds = await page.locator('#project-filters').boundingBox();
      assert.ok(yearBounds.x >= filterBounds.x - 1 && yearBounds.x + yearBounds.width <= filterBounds.x + filterBounds.width + 1, 'the year dropdown is reachable in the scrolling footer');
      await checkFooter(page);
      await page.screenshot({ path: `${output}/year-filter-${name}.png` });
      const chosen = expected('2023')[0];
      await openStrip(page, page.locator(`#strip-${chosen}`), 'click');
      await page.waitForSelector(`#projects [data-project="${chosen}"]`);
      await page.locator('#collection').evaluate(collection => collection.scrollIntoView({ block: 'start' }));
      assert.equal(await yearSelect.inputValue(), '', 'new project walls start with all years');
      await yearSelect.selectOption('2023');
      assert.deepEqual(await visible(), expected('2023', chosen), 'project pages exclude the open project');
      await yearSelect.selectOption('2024');
      assert.deepEqual(await visible(), expected('2024', chosen));
      await page.goBack();
      await waitForHomeWall(page);
      assert.deepEqual(await visible(), expected('2023'), 'Back restores the homepage year selection');
      assert.equal(await yearSelect.inputValue(), '2023');
      await page.goForward();
      await page.waitForSelector(`#projects [data-project="${chosen}"]`);
      assert.equal(await yearSelect.inputValue(), '2024', 'Forward restores the project wall year selection');
      assert.deepEqual(await visible(), expected('2024', chosen));
    });
  }

  for (const [name, options] of [['desktop', desktop], ['mobile', mobile]]) {
    await check(`${name} filters a project wall with a category unique to the open project`, options, async page => {
      // Keep the empty-result guard covered as the real collection grows.
      // The unmodified collection and all its tags are exercised above.
      await page.route(`${base}/society-expo/`, async route => {
        const response = await route.fetch();
        const body = (await response.text()).replace(/(window\.__PROJECTS_DATA__\s*=\s*)(\[.*?\])(\s*;)/s, (_, assignment, json, end) => {
          const fixture = JSON.parse(json).map(project => ({
            ...project,
            tags: project.slug === 'society-expo' ? project.tags : project.tags.filter(tag => tag !== 'light'),
          }));
          return assignment + JSON.stringify(fixture) + end;
        });
        await route.fulfill({ response, body });
      });
      await visit(page, '/society-expo/');
      await page.locator('#collection').evaluate(collection => collection.scrollIntoView({ block: 'start' }));
      await checkFooter(page);
      // In this fixture Light belongs only to the open project, so selecting it
      // alone must not hide every strip.
      const unique = page.locator('#project-filters [data-filter="light"]');
      const before = await page.locator('.strip:not([hidden])').evaluateAll(strips => strips.map(strip => strip.dataset.project));
      assert.equal(await unique.getAttribute('aria-disabled'), 'true');
      await unique.click({ force: true });
      assert.deepEqual(await page.locator('.strip:not([hidden])').evaluateAll(strips => strips.map(strip => strip.dataset.project)), before);
      assert.equal(await page.locator('#project-filters [aria-pressed="false"]').count(), 0, 'an unavailable solo tag leaves all selected');
      const community = page.locator('#project-filters [data-filter="community"]');
      await community.click();
      assert.deepEqual(await page.locator('#project-filters [aria-pressed="true"]').evaluateAll(buttons => buttons.map(button => button.dataset.filter)), ['community'], 'first click selects only Community on project pages too');
      await unique.click();
      assert.equal(await community.getAttribute('aria-disabled'), 'true');
      await community.click({ force: true });
      assert.equal(await community.getAttribute('aria-pressed'), 'true', 'keep a usable tag when the other selection belongs only to the open project');
      await unique.click();
      const expected = await page.evaluate(() => window.__PROJECTS_DATA__.filter(project => project.slug !== 'society-expo' && project.tags.includes('community')).map(project => project.slug));
      assert.deepEqual(await page.locator('.strip:not([hidden])').evaluateAll(strips => strips.map(strip => strip.dataset.project)), expected);
      assert.equal(new URL(page.url()).pathname, `${prefix}/society-expo/`, 'filtering stays on the project');
      assert.equal(await page.locator('#strip-society-expo').isVisible(), false, 'open project stays excluded');
      await page.waitForFunction(() => Math.abs(document.getElementById('collection').getBoundingClientRect().top) < 1);
      await checkFooter(page);
      await openStrip(page, page.locator('.strip:not([hidden])').first(), 'click');
      await page.waitForFunction(() => document.documentElement.dataset.project !== 'society-expo');
      await page.goBack();
      await page.waitForFunction(() => document.documentElement.dataset.project === 'society-expo');
      assert.ok(await page.evaluate(() => scrollY) < 1, 'Back from a strip returns to the top of the project, not the wall it was clicked in');
      assert.deepEqual(await page.locator('#project-filters [aria-pressed="true"]').evaluateAll(buttons => buttons.map(button => button.dataset.filter)), ['community']);
      assert.deepEqual(await page.locator('.strip:not([hidden])').evaluateAll(strips => strips.map(strip => strip.dataset.project)), expected);
      await page.locator('.collection-home-link').click();
      await page.waitForFunction(() => document.body.dataset.route === 'home' && document.body.dataset.homeView === 'about' && scrollY < 1);
      assert.equal(await page.locator('#project-filters [aria-pressed="false"]').count(), 0, 'project filters do not change the homepage selection');
      await page.evaluate(() => scrollTo({ top: document.getElementById('collection').getBoundingClientRect().top + scrollY, behavior: 'instant' }));
      await waitForHomeWall(page);
      await checkFooter(page);
    });
  }

  for (const [name, options] of [['desktop', desktop], ['mobile', mobile]]) {
    await check(`${name} leaving a project for the landing page resets the filters`, options, async page => {
      await visit(page);
      const yearSelect = page.getByRole('combobox', { name: 'Year', exact: true });
      const pressed = () => page.locator('#project-filters [aria-pressed="true"]').evaluateAll(buttons => buttons.map(button => button.dataset.filter));
      const allTags = await page.locator('#project-filters button').evaluateAll(buttons => buttons.map(button => button.dataset.filter));
      await page.locator('#project-filters [data-filter="light"]').click();
      assert.deepEqual(await pressed(), ['light'], 'a single category is selected');
      const first = page.locator('#strips .strip:not([hidden])').first();
      const slug = await first.getAttribute('data-project');
      await openStrip(page, first, 'dispatch');
      await page.waitForFunction(slug => document.documentElement.dataset.project === slug, slug);
      if (options.hasTouch) {
        // Phones show no project title; the name above the project's strips leads home.
        await page.locator('#collection').evaluate(collection => collection.scrollIntoView({ block: 'start' }));
        await page.locator('.collection-home-link').click();
        await page.waitForFunction(() => document.body.dataset.route === 'home');
        await page.evaluate(() => scrollTo({ top: document.getElementById('collection').getBoundingClientRect().top + scrollY, behavior: 'instant' }));
      } else await page.locator('#header-toggle').click();
      await waitForHomeWall(page);
      assert.deepEqual(await pressed(), allTags, 'leaving the project for the landing page turns every category on');
      assert.equal(await yearSelect.inputValue(), '', 'and no year');
      await yearSelect.selectOption('2024');
      await openStrip(page, page.locator('#strips .strip:not([hidden])').first(), 'dispatch');
      await page.waitForFunction(() => !!document.documentElement.dataset.project);
      await page.goBack();
      await waitForHomeWall(page);
      assert.equal(await yearSelect.inputValue(), '2024', 'Back keeps the filters as they were');
    });

    await check(`${name} name above project strips opens the homepage`, options, async page => {
      await visit(page);
      await page.locator('#home-link').click();
      await page.waitForFunction(() => scrollY < 1 && document.body.dataset.homeView === 'about');
      // Enter with About still open, without Playwright scrolling the home
      // wall into view first. This used to save About as the name-link target.
      await openStrip(page, page.locator('#strip-lyra'), 'dispatch');
      await page.waitForFunction(() => document.documentElement.dataset.project === 'lyra');
      await page.locator('#collection').evaluate(collection => collection.scrollIntoView({ block: 'start' }));
      await page.locator('.collection-home-link').click();
      await page.waitForFunction(() => document.body.dataset.route === 'home' && document.body.dataset.homeView === 'about' && scrollY < 1);
      assert.equal(new URL(page.url()).pathname, `${prefix}/`);
      assert.equal(new URL(page.url()).hash, '');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'home-title');
      await page.goBack();
      await page.waitForFunction(() => document.documentElement.dataset.project === 'lyra' && scrollY < 1);
      assert.equal(await page.evaluate(() => document.activeElement.className), 'project-title', 'Back shows the project itself, not its wall');
      await page.goBack();
      await page.waitForFunction(() => document.body.dataset.route === 'home' && document.body.dataset.homeView === 'about' && scrollY < 1);
    });
  }

  for (const [name, options] of [['desktop', desktop], ['mobile', mobile]]) {
    await check(`${name} returns from a direct project to the full wall`, options, async page => {
      await visit(page, '/lyra/');
      if (options.hasTouch) {
        assert.equal(await page.locator('#header-toggle').isVisible(), false, 'phones show no project title to return with');
        return;
      }
      await page.locator('#header-toggle').click();
      await waitForHomeWall(page);
      assert.equal(new URL(page.url()).hash, '', 'return links use the clean homepage URL');
      await checkFooter(page);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'strip-lyra');
      const project = await page.locator('#strip-lyra').boundingBox();
      assert.ok(project.x >= 0 && project.x + project.width <= options.viewport.width + 1, 'originating project is visible');
    });
  }

  for (const [name, options] of [['desktop', desktop], ['narrow desktop', { viewport: { width: 860, height: 1000 } }]]) {
    await check(`${name} images follow the cursor on home and project walls`, options, async page => {
      for (const route of ['/', '/jagad/']) {
        await visit(page, route);
        await page.locator('#collection').scrollIntoViewIfNeeded();
        const wall = await page.locator('#strips').boundingBox();
        const image = page.locator('.strip:not([hidden]) .strip-image').first();
        await page.mouse.move(wall.x + 10, wall.y + wall.height / 2);
        assert.equal(await caption(page), await image.locator('..').locator('..').getAttribute('aria-label'), 'hover names the project bottom left on both home and project pages');
        assert.equal((await page.locator('#strip-caption').boundingBox()).x, wall.x, 'the caption sits in the bottom-left corner');
        await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('.strip:not([hidden]) .strip-image')).objectPosition) < 10);
        await page.mouse.move(wall.x + wall.width - 10, wall.y + wall.height / 2);
        await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('.strip:not([hidden]) .strip-image')).objectPosition) > 90);
        await page.waitForTimeout(700);
        const settled = await image.evaluate(image => getComputedStyle(image).objectPosition);
        await page.waitForTimeout(100);
        assert.equal(await image.evaluate(image => getComputedStyle(image).objectPosition), settled, 'animation stops when the pointer rests');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.strip:not([hidden]) .strip-image')).objectPosition === '50% 50%');
        await page.mouse.move(wall.x + 10, wall.y + wall.height / 2);
        assert.equal(await image.evaluate(image => getComputedStyle(image).objectPosition), '50% 50%', 'reduced motion disables cursor movement');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
      }
    });
  }

  await check('strip previews highlight enabled tags without changing filters', desktop, async page => {
    const highlighted = () => page.locator('#project-filters .is-preview-tag').evaluateAll(buttons => buttons.map(button => button.dataset.filter));
    const selected = () => page.locator('#project-filters [aria-pressed="true"]').evaluateAll(buttons => buttons.map(button => button.dataset.filter));
    const footerLayout = () => page.locator('#project-filters').evaluate(filters => {
      const rect = filters.getBoundingClientRect();
      const collection = document.getElementById('collection').getBoundingClientRect();
      return { x: rect.x - collection.x, y: rect.y - collection.y, width: rect.width, height: rect.height };
    });
    for (const route of ['/', '/jagad/']) {
      await visit(page, route);
      await page.locator('#collection').evaluate(collection => collection.scrollIntoView({ block: 'start' }));
      const before = await selected();
      const footer = await footerLayout();
      await page.locator('#strip-kagora').hover();
      assert.deepEqual(await highlighted(), ['light', 'community'], 'Kagora highlights its enabled categories');
      assert.deepEqual(await selected(), before, 'previewing a project does not toggle filters');
      const opacities = await page.locator('#project-filters button').evaluateAll(buttons => Object.fromEntries(buttons.map(button => [button.dataset.filter, Number(getComputedStyle(button).opacity)])));
      assert.equal(opacities.light, 1, 'matching tags keep full opacity');
      assert.ok(Object.entries(opacities).every(([tag, opacity]) => ['light', 'community'].includes(tag) || opacity < 0.5), 'non-matching tags are dimmed');
      assert.equal(await page.locator('#project-filters [data-filter="light"]').evaluate(button => getComputedStyle(button).textDecorationLine), 'none', 'matching tags are not underlined');
      assert.deepEqual(await footerLayout(), footer, 'the highlight does not shift the footer within the collection');
      await page.screenshot({ path: `${output}/tag-preview${route === '/' ? '-home' : '-project'}.png` });
      await page.mouse.move(0, 0);
      assert.deepEqual(await highlighted(), [], 'highlight clears on pointer leave');
      await page.locator('#project-filters [data-filter="light"]').click();
      const filtered = await selected();
      await page.locator('#strip-kagora').hover();
      assert.deepEqual(await highlighted(), ['light'], 'disabled categories do not highlight');
      assert.deepEqual(await selected(), filtered);
      await page.mouse.move(0, 0);
      await page.locator('#strip-svartljus').focus();
      assert.deepEqual(await highlighted(), ['light'], 'keyboard focus previews matching tags too');
      await page.locator('#project-filters [data-filter="light"]').focus();
      assert.deepEqual(await highlighted(), [], 'highlight clears on blur');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('#strip-kagora').hover();
      assert.deepEqual(await highlighted(), ['light'], 'reduced motion preserves the static highlight');
      await page.locator('#strip-kagora').click();
      await page.waitForFunction(() => document.documentElement.dataset.project === 'kagora');
      assert.deepEqual(await highlighted(), [], 'navigation clears the previous preview');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    }
  });

  await check('touch devices download the 640w strip image at any pixel density', { ...mobile, deviceScaleFactor: 3 }, async page => {
    await visit(page);
    await page.waitForFunction(() => document.querySelector('#strips img')?.currentSrc);
    const sources = await page.locator('#strips img').evaluateAll(images => images.map((image, index) => ({ index, src: image.currentSrc, loading: image.loading, priority: image.getAttribute('fetchpriority') })).filter(image => image.src));
    assert.ok(sources.length > 0);
    assert.ok(sources.every(({ src }) => /-640\.(avif|webp)$/.test(src)), `strips stay at 640w on touch: ${sources.find(({ src }) => !/-640\./.test(src))?.src}`);
    assert.deepEqual(sources.filter(({ loading }) => loading === 'eager').map(({ index }) => index), [0, 1, 2], 'only the first three home strips load eagerly');
    assert.equal(sources[0].priority, 'high', 'the first strip is the likely largest paint and gets priority');
    await visit(page, '/jagad/');
    assert.ok(await page.locator('#strips img').evaluateAll(images => images.every(image => image.loading === 'lazy')), 'project pages keep every strip lazy');
  });

  await check('strip images keep their scale throughout hover and keyboard expansion', { viewport: { width: 1800, height: 420 } }, async page => {
    for (const route of ['/', '/jagad/']) {
      await visit(page, route);
      if (route === '/') {
        await page.locator('#project-filters button[data-filter="mixed reality"]').click();
      }
      await page.locator('#collection').scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      const strip = page.locator('.strip:not([hidden])').first();
      const image = strip.locator('img');
      await image.evaluate(image => image.decode());
      const width = (await strip.boundingBox()).width;
      const imageWidth = (await image.boundingBox()).width;
      const samples = page.evaluate(() => new Promise(resolve => {
        const sizes = [], start = performance.now();
        function sample() {
          const strip = document.querySelector('.strip:not([hidden])');
          sizes.push(strip.querySelector('img').getBoundingClientRect().width);
          if (performance.now() - start < 550) requestAnimationFrame(sample);
          else resolve(sizes);
        }
        requestAnimationFrame(sample);
      }));
      await strip.hover();
      assert.ok((await samples).every(value => Math.abs(value - imageWidth) < 0.1), 'photograph width stays fixed for every expansion frame');
      assert.ok((await strip.boundingBox()).width > width * 1.8, 'the strip still opens');
      await page.mouse.move(0, 0);
      await page.waitForTimeout(300);
      await strip.focus();
      await page.waitForTimeout(300);
      assert.ok(Math.abs((await image.boundingBox()).width - imageWidth) < 0.1, 'keyboard expansion keeps the same image scale');
      const bounds = await strip.evaluate(strip => {
        const frame = strip.getBoundingClientRect(), image = strip.querySelector('img').getBoundingClientRect();
        return { covered: image.left <= frame.left + 1 && image.right >= frame.right - 1 };
      });
      assert.ok(bounds.covered, 'the open strip remains covered by the image');
    }
  });

  await check('desktop strips respond while larger images are still downloading', desktop, async page => {
    await visit(page);
    await page.locator('#collection').scrollIntoViewIfNeeded();
    const strip = page.locator('#strip-society-expo');
    const image = strip.locator('img');
    await image.evaluate(image => image.decode());
    const narrowSrc = await image.evaluate(image => image.currentSrc);
    const width = (await strip.boundingBox()).width;
    const renderedHeight = () => image.evaluate(image => {
      const rect = image.getBoundingClientRect();
      return Math.max(rect.height, rect.width * image.naturalHeight / image.naturalWidth);
    });
    const initialHeight = await renderedHeight();
    let release;
    const held = new Promise(resolve => { release = resolve; });
    let pending = 0;
    await page.route('**/img/**', async route => { pending++; await held; await route.continue(); });
    try {
      await strip.hover();
      await page.waitForTimeout(350);
      assert.ok(pending > 0, 'larger image download is pending');
      assert.ok((await strip.boundingBox()).width > width * 4, 'hover expands before download completes');
      assert.equal(await renderedHeight(), initialHeight, 'preview stays at the same scale while the strip opens');
      assert.equal(await strip.getAttribute('aria-label'), 'Society Expo');
      assert.equal(await caption(page), 'Society Expo');
      await page.mouse.move(0, 0);
      assert.equal(await caption(page), '', 'the caption clears when leaving the strips');
      await strip.focus();
      assert.equal(await caption(page), 'Society Expo', 'keyboard focus also names the project');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(350);
      assert.ok((await page.locator('.strip:focus-visible').boundingBox()).width > width * 4, 'keyboard focus expands before download completes');
      assert.equal(await caption(page), await page.locator('.strip:focus-visible').getAttribute('aria-label'));
      await checkFooter(page);
    } finally {
      release();
      await page.unrouteAll({ behavior: 'wait' });
    }
    await page.waitForFunction(src => document.querySelector('#strip-society-expo img').currentSrc !== src, narrowSrc);
    await image.evaluate(image => image.decode());
    assert.equal(await renderedHeight(), initialHeight, 'larger image keeps the preview scale');
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
    assert.equal(await page.title(), 'Dome Dreaming | Jonas Johansson');
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

  await check('failed project fetch falls back to a full page load', desktop, async page => {
    await visit(page);
    await page.route('**/firestarter/', route => route.request().resourceType() === 'fetch' ? route.abort() : route.continue());
    await page.locator('#strip-firestarter').focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/firestarter/');
    await page.waitForSelector('#projects #firestarter');
    assert.equal(await page.locator('body').getAttribute('data-route'), 'project');
    assert.equal(await page.locator('.navigation-status').count(), 0);
  });

  for (const [name, options] of [['desktop', desktop], ['mobile', mobile]]) {
    await check(`${name} audio samples load on demand and stop on navigation`, options, async page => {
      const downloads = [];
      page.on('request', request => { if (/room-mix-.*\.mp3$/.test(request.url())) downloads.push(request.url()); });
      await visit(page);
      await openStrip(page, page.locator('#strip-borderlan'), 'click');
      await page.waitForSelector('#projects #borderlan');
      const samples = page.locator('#projects audio');
      assert.equal(await samples.count(), 3);
      assert.equal(await samples.evaluateAll(nodes => nodes.every(audio => audio.paused && !audio.autoplay && audio.preload === 'none' && audio.controls && audio.getAttribute('aria-label'))), true);
      await samples.first().scrollIntoViewIfNeeded();
      assert.equal(downloads.length, 0, 'scrolling to the players does not download audio');
      const play = async index => {
        const player = samples.nth(index);
        const box = await player.boundingBox();
        await player.click({ position: { x: 20, y: box.height / 2 } });
        await page.waitForFunction(index => {
          const audio = document.querySelectorAll('#projects audio')[index];
          return !audio.paused && audio.currentTime > 0;
        }, index);
      };
      for (let index = 0; index < 3; index++) {
        await play(index);
        assert.ok(await samples.nth(index).evaluate(audio => Math.abs(audio.duration - 90) < 0.1), 'each actual 90-second mix decodes');
        assert.equal(await samples.evaluateAll((nodes, active) => nodes.every((audio, i) => i === active || audio.paused), index), true, 'samples cannot overlap');
      }
      const playing = await samples.nth(2).elementHandle();
      await page.goBack();
      await page.waitForFunction(() => document.body.dataset.route === 'home');
      assert.equal(await playing.evaluate(audio => audio.paused), true, 'detached audio stops when leaving the project');
      await page.goForward();
      await page.waitForSelector('#projects #borderlan');
      assert.equal(await samples.evaluateAll(nodes => nodes.every(audio => audio.paused)), true, 'returning does not resume playback');
    });
  }

  await check('WYSIWYG scene recordings play real moving frames', desktop, async page => {
    await visit(page, '/wysiwyg/');
    for (const name of ['birds-day', 'fireflies-night', 'walking-figures', 'animal-stampede']) {
      const selector = `video[src$="/${name}.mp4"]`;
      const video = page.locator(selector);
      await video.scrollIntoViewIfNeeded();
      await page.waitForFunction(selector => {
        const v = document.querySelector(selector);
        return !v.paused && v.currentTime > 1;
      }, selector);
      assert.ok(await video.evaluate(v => v.videoWidth === 1280 && v.videoHeight === 720 && Math.abs(v.duration - 8) < 0.1), `${name} decodes its full 8-second recording`);
      const frame = () => video.evaluate(v => {
        const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 90;
        const ctx = canvas.getContext('2d'); ctx.drawImage(v, 0, 0, 160, 90);
        return canvas.toDataURL();
      });
      const first = await frame();
      await page.waitForTimeout(800);
      assert.notEqual(await frame(), first, `${name} contains movement`);
    }
  });

  await check('mobile video controls appear on tap without changing playback', mobile, async page => {
    await visit(page, '/kagora/');
    const video = page.locator('#projects video').first();
    const reveal = page.getByRole('button', { name: /^Show video controls:/ }).first();
    await video.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.querySelector('#projects video').paused);
    assert.equal(await video.evaluate(video => video.controls), false, 'autoplay does not show controls');
    await reveal.tap();
    assert.equal(await video.evaluate(video => video.controls && !video.paused), true, 'first tap reveals controls without pausing');
    assert.equal(await reveal.isVisible(), false, 'native controls receive subsequent taps');
    await video.press('Space');
    await page.waitForFunction(() => document.querySelector('#projects video').paused);
    await page.locator('.project-grid > .media-item').last().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.querySelector('#projects video').controls);
    await video.scrollIntoViewIfNeeded();
    assert.equal(await video.evaluate(video => video.paused), true, 'manual pause survives scrolling away and back');
    await reveal.focus();
    await page.keyboard.press('Enter');
    assert.equal(await video.evaluate(video => video.controls && video.paused), true, 'keyboard can reveal controls without resuming');
  });

  await check('mobile video controls respect reduced motion and client navigation', { ...mobile, reducedMotion: 'reduce' }, async page => {
    await visit(page);
    await openStrip(page, page.locator('#strip-kagora'));
    await page.waitForSelector('#projects #kagora');
    const video = page.locator('#projects video').first();
    const reveal = page.getByRole('button', { name: /^Show video controls:/ }).first();
    await video.scrollIntoViewIfNeeded();
    assert.equal(await video.evaluate(video => video.paused && !video.controls), true);
    await reveal.tap();
    assert.equal(await video.evaluate(video => video.controls && video.paused), true, 'revealing controls does not autoplay with reduced motion');
    await page.goBack();
    await page.waitForFunction(() => document.body.dataset.route === 'home');
    await openStrip(page, page.locator('#strip-kagora'));
    await page.waitForSelector('#projects #kagora');
    assert.equal(await page.locator('#projects .media-controls-reveal').count(), 1, 'remount does not duplicate the tap target');
    assert.equal(await video.evaluate(video => video.paused && !video.controls), true, 'returning starts with controls hidden');
  });

  await check('native gallery controls remain available without JavaScript', { ...mobile, javaScriptEnabled: false }, async page => {
    await page.goto(base + '/kagora/');
    assert.equal(await page.locator('#projects video').evaluate(video => video.controls), true);
  });

  await check('motion preference applies to every mount and can change', { ...desktop, reducedMotion: 'reduce' }, async page => {
    await visit(page, '/jagad/');
    const video = page.locator('#projects video').first();
    assert.equal(await video.evaluate(video => video.controls), true, 'desktop keeps native controls');
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
    await openStrip(page, strip);
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
    await waitForHomeWall(page);
    assert.equal(await page.locator('#intro details, #intro summary').count(), 0);
    const chosen = page.locator('a.strip:visible').nth(10);
    await chosen.scrollIntoViewIfNeeded();
    const id = await chosen.getAttribute('id');
    const y = await page.evaluate(() => scrollY);
    const x = await page.locator('#strips').evaluate(strips => strips.scrollLeft);
    await openStrip(page, chosen); await page.waitForSelector('#projects .project');
    assert.ok(await page.locator('#strips img').count() > 0);
    await page.goBack(); await page.waitForFunction(() => document.body.dataset.route === 'home');
    assert.ok(await page.locator('#strips img').count() > 0);
    await waitForHomeWall(page);
    assert.equal(await page.locator('.intro-text').innerHTML(), about);
    assert.deepEqual(await page.locator('.strip').evaluateAll(entries => entries.map(entry => entry.id)), order);
    assert.equal(await page.evaluate(() => document.activeElement.id), id);
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - y) < 2);
    assert.ok(Math.abs(await page.locator('#strips').evaluate(strips => strips.scrollLeft) - x) < 2);
    await page.screenshot({ path: `${output}/mobile-restored-strips.png` });
  });

  await check('warm charcoal theme stays consistent across system preferences', { ...desktop, colorScheme: 'light' }, async page => {
    await visit(page);
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.equal(await page.locator('body').evaluate(body => getComputedStyle(body).backgroundColor), 'rgb(26, 24, 22)');
    assert.equal(await page.locator('body').evaluate(body => getComputedStyle(body).color), 'rgb(255, 255, 255)');
    assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'), '#1a1816');
    assert.equal(await page.locator('#sound-toggle, #theme-preference').count(), 0);
    await page.emulateMedia({ colorScheme: 'dark' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.locator('#strip-dome-dreaming').click();
    await page.waitForSelector('#projects #dome-dreaming');
    assert.equal(await page.locator('body').evaluate(body => getComputedStyle(body).backgroundColor), 'rgb(26, 24, 22)');
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
    assert.equal(await page.locator('body').evaluate(body => getComputedStyle(body).backgroundColor), 'rgb(26, 24, 22)');
    assert.ok(await page.locator('main #home-title').isVisible());
    assert.ok(await page.getByRole('link', { name: 'Klättermusen', exact: true }).isVisible());
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
    await waitForHomeWall(page);
    await page.screenshot({ path: `${output}/desktop-home.png` });
    await page.locator('#strip-dome-dreaming').hover();
    await page.waitForTimeout(400);
    await page.locator('#strip-dome-dreaming img').evaluate(image => image.decode());
    await page.screenshot({ path: `${output}/desktop-wall-hover.png` });
  });

  await check('mobile project media stays lazy', mobile, async page => {
    await visit(page);
    await openStrip(page, page.locator('#strip-klattermusen'));
    await page.waitForSelector('#projects #klattermusen');
    await page.waitForTimeout(300);
    const bodyImages = page.locator('#projects .media-item:not(.hero) img');
    assert.equal(await bodyImages.evaluateAll(images => images.every(image => image.loading === 'lazy')), true);
    const loaded = await bodyImages.evaluateAll(images => images.filter(image => image.complete && image.naturalWidth).length);
    assert.ok(loaded < await bodyImages.count(), `loaded all ${loaded} body images`);
    await page.screenshot({ path: `${output}/mobile-project.png` });
    await visit(page);
    await page.screenshot({ path: `${output}/mobile-home.png` });
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
