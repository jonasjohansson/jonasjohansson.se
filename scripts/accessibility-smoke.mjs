import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { previewServer } from './preview-server.mjs';
import { readProjects } from './project-data.js';

// Engine and accessibility-tree checks complement hands-on testing with
// VoiceOver/TalkBack and physical phones; they do not replace it.
const server = process.env.AUDIT_BASE_URL ? null : await previewServer();
const base = process.env.AUDIT_BASE_URL || server.url;
const output = 'screenshots/accessibility';
mkdirSync(output, { recursive: true });
const results = [], scans = [];
const engines = { chromium, firefox, webkit };
const names = (process.env.AUDIT_BROWSERS || 'chromium,firefox,webkit').split(',');
const projects = readProjects().filter(project => project.type === 'work');

async function visit(page, route = '/') {
  await page.goto(base + route);
  await page.waitForFunction(() => !!document.getElementById('project-filter'));
  await page.evaluate(() => document.fonts.ready);
}

async function check(browser, name, options, run) {
  const context = await browser.newContext({ reducedMotion: 'reduce', ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await run(page);
    assert.deepEqual(errors, [], 'no uncaught browser errors');
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: error.stack });
    console.error(`✗ ${name}: ${error.message}`);
    await page.screenshot({ path: `${output}/${name.replace(/[^a-z0-9]+/gi, '-')}.png` }).catch(() => {});
  } finally {
    await context.close();
  }
}

try {
  for (const name of names) {
    assert.ok(engines[name], `Unknown browser: ${name}`);
    const browser = await engines[name].launch(name === 'chromium' && !existsSync(chromium.executablePath()) ? { channel: 'chrome' } : {});
    try {
      const modes = [
        { label: 'desktop', viewport: { width: 1440, height: 900 } },
        ...(name === 'firefox' ? [] : [{ label: 'touch', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]),
      ];
      for (const { label, ...options } of modes) {
        const prefix = `${name} ${label}`;
        // All authored projects in Chromium; representative image, video-hero,
        // audio and custom-font templates in every other browser/device mode.
        const routes = name === 'chromium' && label === 'desktop'
          ? ['/', ...projects.map(project => `/${project.slug}/`)]
          : ['/', '/vista/', '/society-expo/', '/borderlan/', '/plx/'];
        for (const route of routes) {
          await check(browser, `${prefix} accessibility ${route}`, options, async page => {
            await visit(page, route);
            const scan = await new AxeBuilder({ page }).analyze();
            scans.push({ browser: name, mode: label, route, violations: scan.violations, incomplete: scan.incomplete });
            assert.deepEqual(scan.violations.map(violation => ({
              rule: violation.id, targets: violation.nodes.map(node => node.target),
            })), [], 'no automatically detected accessibility violations');
            assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1, 'one accessible page heading');
          });
        }

        await check(browser, `${prefix} keyboard navigation and history`, options, async page => {
          await visit(page);
          // macOS WebKit uses Option-Tab to include links unless the user's
          // Safari preference enables full keyboard access with plain Tab.
          await page.keyboard.press(name === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab');
          assert.equal(await page.locator('.skip-link').evaluate(link => link === document.activeElement), true);
          await page.keyboard.press('Enter');
          assert.equal(await page.locator('#main').evaluate(main => main === document.activeElement), true);
          const link = page.getByRole('link', { name: 'Vista', exact: true });
          await link.focus();
          await page.keyboard.press('Enter');
          await page.waitForSelector('#projects #vista');
          assert.equal(await page.locator('.project-title').evaluate(title => title === document.activeElement), true, 'one activation enters and focuses the project');
          assert.equal(await page.locator('#route-announcer').textContent(), 'Opened Vista');
          await page.goBack();
          await page.waitForFunction(() => document.body.dataset.route === 'home' && document.getElementById('main').getAttribute('aria-busy') === 'false');
          assert.equal(await link.evaluate(link => link === document.activeElement), true, 'Back restores the focused project link');
          assert.equal(await page.getByRole('link', { name: 'Email', exact: true }).isVisible(), true);
          assert.equal(await page.getByRole('link', { name: 'CV', exact: true }).isVisible(), true);
        });

        await check(browser, `${prefix} filters and project activation`, options, async page => {
          await visit(page);
          const filter = page.getByRole('combobox', { name: 'Filter projects' });
          await filter.selectOption('light');
          const count = await page.locator('#strips .strip:not([hidden])').count();
          assert.ok(count > 0 && count < projects.length);
          assert.equal(await page.locator('#project-count').textContent(), `${count} projects`);
          await filter.selectOption('');
          const link = page.getByRole('link', { name: 'Vista', exact: true });
          if (options.hasTouch) {
            await link.tap();
            assert.equal(await page.locator('body').getAttribute('data-route'), 'home');
            assert.equal(await page.locator('#strip-vista.is-active').count(), 1);
            await link.tap();
          } else {
            const search = page.getByRole('searchbox', { name: 'Find a project by name' });
            await search.fill('vista');
            assert.equal(await page.locator('#strips .strip:not([hidden])').count(), 1);
            await search.press('Escape');
            assert.ok(await page.locator('#strips .strip:not([hidden])').count() > 1);
            await link.click();
          }
          await page.waitForSelector('#projects #vista');
          assert.match(await page.title(), /^Vista \|/);
          await page.getByRole('link', { name: 'Vista, Return to projects' }).click();
          await page.waitForFunction(() => document.body.dataset.route === 'home');
        });

        await check(browser, `${prefix} hero playback with reduced motion`, options, async page => {
          await visit(page, '/society-expo/');
          const video = page.locator('.hero video');
          assert.equal(await video.evaluate(video => video.paused), true);
          if (options.hasTouch) {
            const reveal = page.locator('.hero').getByRole('button', { name: /^Show video controls:/ });
            await reveal.focus();
            await page.keyboard.press('Enter');
            assert.equal(await reveal.isHidden(), true);
          }
          assert.equal(await video.evaluate(video => video.controls && video.paused), true, 'native controls are available without starting playback');
          // Decode the real MP4 as well as checking the control state.
          await video.evaluate(async video => { await video.play(); });
          await page.waitForFunction(() => document.querySelector('.hero video').currentTime > 0);
          await video.dispatchEvent('pointerdown');
          await video.evaluate(video => video.pause());
          await page.emulateMedia({ reducedMotion: 'no-preference' });
          await page.locator('#collection').scrollIntoViewIfNeeded();
          await page.waitForFunction(() => document.querySelector('.hero video').paused);
          await video.scrollIntoViewIfNeeded();
          await page.waitForTimeout(250);
          assert.equal(await video.evaluate(video => video.paused), true, 'a deliberate pause survives scrolling and motion-preference changes');
        });

        await check(browser, `${prefix} 320px reflow and contact access`, options, async page => {
          await page.setViewportSize({ width: 320, height: 640 });
          for (const route of ['/', '/eastern-city-portal/']) {
            await visit(page, route);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${route} has no horizontal page overflow`);
            const email = page.getByRole('link', { name: 'Email', exact: true }).first();
            await email.scrollIntoViewIfNeeded();
            const bounds = await email.boundingBox();
            assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 320, 'email fits within the viewport');
          }
          await page.screenshot({ path: `${output}/${prefix.replaceAll(' ', '-')}-320px.png` });
        });
      }

      await check(browser, `${name} no-JavaScript navigation and media`, { viewport: { width: 390, height: 844 }, javaScriptEnabled: false }, async page => {
        await page.goto(base + '/');
        assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
        await page.getByRole('link', { name: 'Society Expo', exact: true }).click();
        await page.waitForURL('**/society-expo/');
        assert.equal(await page.locator('.hero video').evaluate(video => video.controls && video.paused), true);
        await page.getByRole('link', { name: 'Society Expo, Return to projects' }).click();
        assert.equal(await page.getByRole('link', { name: 'Email', exact: true }).isVisible(), true);
      });
    } finally {
      await browser.close();
    }
  }
} finally {
  await server?.close();
  writeFileSync(`${output}/results.json`, JSON.stringify({ results, scans }, null, 2));
}

const failures = results.filter(result => !result.passed);
console.log(`\n${results.length - failures.length}/${results.length} browser/accessibility checks passed.`);
console.log(`Manual-review findings and scan details: ${output}/results.json`);
if (failures.length) process.exitCode = 1;
