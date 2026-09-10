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
  if (route === '/') await waitForHomeWall(page);
}

async function waitForHomeWall(page) {
  await page.waitForFunction(() => document.body.dataset.route === 'home' && document.body.dataset.homeView === 'projects' && Math.abs(document.getElementById('intro-links').getBoundingClientRect().bottom - innerHeight) < 1);
}

async function checkFooter(page) {
  const footer = await page.locator('#intro-links').boundingBox();
  const wall = await page.locator('#strips').boundingBox();
  assert.ok(Math.abs(footer.y - wall.y - wall.height) < 1, 'footer sits directly below the strips');
  assert.ok(Math.abs(footer.y + footer.height - page.viewportSize().height) < 1, 'footer fits within the strip viewport');
  assert.equal((await page.locator('#project-preview-name').boundingBox()).x, wall.x, 'project preview name aligns with the left edge');
  const home = await page.locator('body').getAttribute('data-route') === 'home';
  const header = page.locator(home ? '#home-header' : '#collection-header');
  const contacts = header.locator('.header-contacts');
  const contactBox = await contacts.boundingBox();
  const contactRow = await header.boundingBox();
  assert.deepEqual(await contacts.locator('a').allTextContents(), ['Labs', 'Instagram', 'CV', 'Email'], 'contact links stay concise');
  assert.ok(Math.abs(contactBox.x + contactBox.width - wall.x - wall.width) < 1, 'contact links align with the right edge of the strips');
  assert.ok(contactBox.y >= contactRow.y && contactBox.y + contactBox.height <= contactRow.y + contactRow.height + 1, 'contacts fit in the row above the strips');
  const name = await header.locator(home ? '#home-link' : '.collection-home-link').boundingBox();
  assert.ok(name.x + name.width <= contactBox.x, 'contact links do not overlap the name');
  assert.equal(name.x, wall.x, 'name aligns with the strips');
  assert.ok(Math.abs(contactRow.y + contactRow.height - wall.y) < 1, 'header sits immediately above the strips');
  if (!home) {
    const title = await page.locator('#header-toggle').boundingBox();
    assert.ok(Math.abs(title.x + title.width / 2 - page.viewportSize().width / 2) < 1, 'project title remains centered');
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
      assert.ok(state.title.endsWith(' | Jonas Johansson'), `${slug} document title`);
      assert.ok(Math.abs(state.hero - state.gutter) < 1, `${slug} hero starts at ${state.hero}`);
      assert.equal(state.title, `${state.floatingTitle} | Jonas Johansson`, `${slug} floating title`);
      assert.equal(state.videoControls, true, `${slug} video controls`);
      assert.equal(state.creditsAligned, true, `${slug} credits alignment`);
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
        assert.equal(hero.x, 24, `${slug} hero starts at the page gutter`);
        assert.equal(hero.width, options.viewport.width - 48, `${slug} hero uses the full content width`);
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
    await check(`${name} opens on the wall with About above it`, options, async page => {
      await visit(page);
      const wall = await page.locator('#strips').boundingBox();
      const header = await page.locator('#home-header').boundingBox();
      assert.equal(wall.x, 24);
      assert.equal(wall.width, options.viewport.width - 48);
      assert.equal((await page.locator('#home-link').boundingBox()).x, wall.x, 'name aligns with the strips');
      assert.ok(Math.abs(wall.y - header.height) < 1, 'wall starts directly below the header');
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
      assert.ok(entries.every(entry => entry.width >= (options.hasTouch ? 44 : 18) && entry.height === wall.height && entry.named && entry.visibleText === ''));
      await page.locator('.strip:not([hidden]) .strip-image').evaluateAll(images => Promise.all(images.slice(0, 4).map(image => image.decode())));
      await page.screenshot({ path: `${output}/${name.replaceAll(' ', '-')}-home-wall.png` });
      await page.locator('#home-link').click();
      await page.waitForFunction(() => scrollY < 1 && document.activeElement.id === 'intro');
      const aboutHeader = await page.locator('#home-header').boundingBox();
      assert.ok(Math.abs(aboutHeader.y - intro.height) < 1, 'the name and contacts scroll with the strips');
      assert.ok(Math.abs((await page.locator('#strips').boundingBox()).y - aboutHeader.y - aboutHeader.height) < 1, 'header stays attached to the wall');
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
      assert.equal(wall.x, (await page.locator('.hero').boundingBox()).x, 'strips share the project media gutter');
      assert.equal(wall.width, options.viewport.width - 48);
      assert.equal(wall.height, options.viewport.height - (await page.locator('#collection-header').boundingBox()).height - (await page.locator('#intro-links').boundingBox()).height);
      assert.ok((await page.locator('#projects').boundingBox()).y < wall.y);
      const rects = await page.locator('.strip:not([hidden])').evaluateAll(strips => strips.map(strip => {
        const rect = strip.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
          named: strip.getAttribute('aria-label') === window.__PROJECTS_DATA__.find(project => project.slug === strip.dataset.project).title,
          visibleText: strip.textContent.trim() };
      }));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.ok(rects.every(rect => rect.width >= (options.hasTouch ? 44 : 18) && rect.height === wall.height && rect.named && rect.visibleText === ''));
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

  await check('name toggles About with keyboard and reduced motion', { ...desktop, reducedMotion: 'reduce' }, async page => {
    await visit(page);
    assert.equal(await page.locator('#home-link').getAttribute('aria-label'), 'Jonas Johansson, About');
    await page.locator('#home-link').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => scrollY < 1 && document.activeElement.id === 'intro');
    assert.equal((await page.locator('.intro-text').boundingBox()).x, 24, 'About stays left aligned on wide screens');
    await page.locator('#home-link').click();
    await waitForHomeWall(page);
  });

  for (const [name, options] of [['desktop', desktop], ['mobile', mobile]]) {
    await check(`${name} toggles multiple tags and preserves the selection after Back`, options, async page => {
      await visit(page);
      const projects = await page.evaluate(() => window.__PROJECTS_DATA__);
      const tags = await page.locator('#project-filters button').evaluateAll(buttons => buttons.map(button => button.dataset.filter));
      assert.deepEqual(new Set(tags), new Set(projects.flatMap(project => project.tags).filter(tag => tag !== 'installation')));
      assert.equal(tags.includes(''), false, 'there is no All button');
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
        assert.equal((await page.locator('#strips').boundingBox()).height, options.viewport.height - (await page.locator('#home-header').boundingBox()).height - (await page.locator('#intro-links').boundingBox()).height);
      };
      const toggle = async tag => {
        await page.locator('#project-filters button').nth(tags.indexOf(tag)).click();
        if (selected.has(tag)) selected.delete(tag);
        else selected.add(tag);
        await checkSelection();
      };
      await checkSelection();
      assert.equal(await page.locator('.strip:not([hidden])').count(), projects.length, 'all tags start on, including projects tagged only Installation');
      for (const tag of tags.slice(0, -1)) await toggle(tag);
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
      await select(['mixed reality', 'av']);
      const expected = await visibleSlugs();
      const chosen = page.locator('.strip:not([hidden])').first();
      const id = await chosen.getAttribute('id');
      await chosen.click();
      await page.waitForSelector('#projects .project');
      assert.equal(await page.locator('.strip:not([hidden])').count(), projects.length - 1, 'project pages show all other projects');
      await page.goBack();
      await waitForHomeWall(page);
      assert.deepEqual(await visibleSlugs(), expected);
      assert.equal(await page.evaluate(() => document.activeElement.id), id);
      await checkSelection();
      const education = page.locator('#project-filters [data-filter="education"]');
      await education.focus();
      await page.keyboard.press('Space');
      selected.add('education');
      await checkSelection();
      await toggle('mixed reality');
      await toggle('av');
      assert.equal(await page.locator('#project-count').textContent(), '1 project');
      for (const tag of tags.filter(tag => !selected.has(tag))) await toggle(tag);
      assert.equal(await page.locator('.strip:not([hidden])').count(), projects.length);
      await page.locator('#home-link').click();
      await page.waitForFunction(() => scrollY < 1);
      await toggle('education');
      await waitForHomeWall(page);
    });
  }

  for (const [name, options] of [['desktop', desktop], ['mobile', mobile]]) {
    await check(`${name} filters other projects without leaving the project wall`, options, async page => {
      await visit(page, '/emerging-sensation/');
      await page.locator('#collection').evaluate(collection => collection.scrollIntoView({ block: 'start' }));
      await checkFooter(page);
      // Education belongs only to the open project. Keep another usable tag
      // active when the remaining toggles would otherwise leave no strips.
      for (const button of await page.locator('#project-filters button:not([data-filter="education"])').all()) {
        await button.click({ force: true });
      }
      assert.ok(await page.locator('.strip:not([hidden])').count() > 0, 'cannot filter down to only the excluded project');
      const before = await page.locator('.strip:not([hidden])').evaluateAll(strips => strips.map(strip => strip.dataset.project));
      await page.locator('#project-filters [aria-disabled="true"]').click({ force: true });
      assert.deepEqual(await page.locator('.strip:not([hidden])').evaluateAll(strips => strips.map(strip => strip.dataset.project)), before);
      const community = page.locator('#project-filters [data-filter="community"]');
      if (await community.getAttribute('aria-pressed') !== 'true') await community.click();
      for (const button of await page.locator('#project-filters [aria-pressed="true"]:not([data-filter="community"])').all()) await button.click();
      const expected = await page.evaluate(() => window.__PROJECTS_DATA__.filter(project => project.slug !== 'emerging-sensation' && project.tags.includes('community')).map(project => project.slug));
      assert.deepEqual(await page.locator('.strip:not([hidden])').evaluateAll(strips => strips.map(strip => strip.dataset.project)), expected);
      assert.equal(new URL(page.url()).pathname, `${prefix}/emerging-sensation/`, 'filtering stays on the project');
      assert.equal(await page.locator('#strip-emerging-sensation').isVisible(), false, 'open project stays excluded');
      await page.waitForFunction(() => Math.abs(document.getElementById('collection').getBoundingClientRect().top) < 1);
      await checkFooter(page);
      await page.locator('.strip:not([hidden])').first().click();
      await page.waitForFunction(() => document.documentElement.dataset.project !== 'emerging-sensation');
      await page.goBack();
      await page.waitForFunction(() => document.documentElement.dataset.project === 'emerging-sensation');
      assert.deepEqual(await page.locator('#project-filters [aria-pressed="true"]').evaluateAll(buttons => buttons.map(button => button.dataset.filter)), ['community']);
      assert.deepEqual(await page.locator('.strip:not([hidden])').evaluateAll(strips => strips.map(strip => strip.dataset.project)), expected);
      await page.locator('.collection-home-link').click();
      await waitForHomeWall(page);
      assert.equal(await page.locator('#project-filters [aria-pressed="false"]').count(), 0, 'project filters do not change the homepage selection');
      await checkFooter(page);
    });
  }

  for (const [name, options] of [['desktop', desktop], ['mobile', mobile]]) {
    await check(`${name} returns from a direct project to the full wall`, options, async page => {
      await visit(page, '/lyra/');
      await page.locator('#header-toggle').click();
      await waitForHomeWall(page);
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
        assert.equal(await page.locator('#project-preview-name').textContent(), await image.locator('..').locator('..').getAttribute('aria-label'), 'hover shows the project name on both home and project pages');
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

  await check('strip images keep their scale throughout hover and keyboard expansion', { viewport: { width: 1800, height: 420 } }, async page => {
    for (const route of ['/', '/jagad/']) {
      await visit(page, route);
      if (route === '/') {
        for (const button of await page.locator('#project-filters button:not([data-filter="mixed reality"])').all()) await button.click();
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
      assert.equal(await page.locator('#project-preview-name').textContent(), 'Society Expo');
      await page.mouse.move(0, 0);
      assert.equal(await page.locator('#project-preview-name').textContent(), '', 'name clears when leaving the strips');
      await strip.focus();
      assert.equal(await page.locator('#project-preview-name').textContent(), 'Society Expo', 'keyboard focus also previews the name');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(350);
      assert.ok((await page.locator('.strip:focus-visible').boundingBox()).width > width * 4, 'keyboard focus expands before download completes');
      assert.equal(await page.locator('#project-preview-name').textContent(), await page.locator('.strip:focus-visible').getAttribute('aria-label'));
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
    await waitForHomeWall(page);
    assert.equal(await page.locator('#intro details, #intro summary').count(), 0);
    const chosen = page.locator('a.strip:visible').nth(10);
    await chosen.scrollIntoViewIfNeeded();
    const id = await chosen.getAttribute('id');
    const y = await page.evaluate(() => scrollY);
    const x = await page.locator('#strips').evaluate(strips => strips.scrollLeft);
    await chosen.tap(); await page.waitForSelector('#projects .project');
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
    assert.equal(await page.locator('body').evaluate(body => getComputedStyle(body).backgroundColor), 'rgb(34, 31, 28)');
    assert.equal(await page.locator('body').evaluate(body => getComputedStyle(body).color), 'rgb(255, 255, 255)');
    assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'), '#221f1c');
    assert.equal(await page.locator('#sound-toggle, #theme-preference').count(), 0);
    await page.emulateMedia({ colorScheme: 'dark' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.locator('#strip-dome-dreaming').click();
    await page.waitForSelector('#projects #dome-dreaming');
    assert.equal(await page.locator('body').evaluate(body => getComputedStyle(body).backgroundColor), 'rgb(34, 31, 28)');
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
    assert.equal(await page.locator('body').evaluate(body => getComputedStyle(body).backgroundColor), 'rgb(34, 31, 28)');
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
    await page.locator('#strip-klattermusen').tap();
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
