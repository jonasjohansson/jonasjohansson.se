#!/usr/bin/env node
import { chromium, devices } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { previewServer } from './preview-server.mjs';

const server = process.env.AUDIT_BASE_URL ? null : await previewServer();
const base = process.env.AUDIT_BASE_URL || server.url;
const output = 'screenshots/visual-audit';
mkdirSync(output, { recursive: true });

const viewports = [
  { name: 'mobile', ...devices['iPhone 13'] },
  { name: 'landscape', ...devices['iPhone 13 landscape'] },
  { name: 'tablet', ...devices['iPad Mini'] },
  { name: 'laptop', viewport: { width: 1280, height: 800 } },
  { name: 'desktop', viewport: { width: 1920, height: 1080 } },
];
const routes = ['/', '/dome-dreaming/', '/jagad/', '/vi-kommer-i-fred/', '/tufting-ex-machina/', '/nava/', '/klattermusen/', '/facing-worlds/'];
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (existsSync(chromium.executablePath()) ? undefined : 'chrome') });

async function capture(page, filename) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const visible = [...document.images].filter(image => {
      const rect = image.getBoundingClientRect();
      return rect.height && rect.top < innerHeight && rect.bottom > 0;
    });
    await Promise.all(visible.map(image => image.decode().catch(() => {})));
  });
  await page.screenshot({ path: `${output}/${filename}.png` });
}

try {
  for (const { name, ...options } of viewports) {
    const context = await browser.newContext({ ...options, reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const route of routes) {
      await page.goto(base + route);
      await page.waitForFunction(() => document.documentElement.classList.contains('enhanced'));
      const slug = route === '/' ? 'home' : route.split('/')[1];
      await capture(page, `${name}--${slug}`);
      if (route === '/') {
        await page.locator('#collection').scrollIntoViewIfNeeded();
        await capture(page, `${name}--index`);
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor === 'rgb(34, 31, 28)');
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await capture(page, `${name}--index-dark`);
        await page.emulateMedia({ colorScheme: 'light' });
        await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor === 'rgb(232, 228, 221)');
      } else {
        const detail = page.locator('.media-row, .project-grid > .media-item:not(.hero)').first();
        if (await detail.count()) {
          await detail.scrollIntoViewIfNeeded();
          await capture(page, `${name}--${slug}-detail`);
        }
      }
      console.log(`✓ ${name} ${slug}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
  await server?.close();
}
console.log(`Screenshots saved in ${output}/; previous review evidence is retained.`);
