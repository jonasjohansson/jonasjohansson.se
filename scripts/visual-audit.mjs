#!/usr/bin/env node
import { chromium, devices } from "playwright";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.AUDIT_BASE_URL || "http://localhost:8080";
const OUT = "screenshots";

const viewports = [
  { name: "mobile-portrait", ...devices["iPhone 13"] },
  { name: "mobile-landscape", ...devices["iPhone 13 landscape"] },
  { name: "tablet-portrait", ...devices["iPad Mini"] },
  { name: "laptop", viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  { name: "desktop", viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
];

const pages = [
  { name: "home", path: "/" },
  { name: "project-dome-dreaming", path: "/dome-dreaming/" },
];

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: vp.viewport,
    deviceScaleFactor: vp.deviceScaleFactor,
    userAgent: vp.userAgent,
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch,
  });

  for (const p of pages) {
    const page = await context.newPage();
    const url = BASE + p.path;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const file = join(OUT, `${vp.name}--${p.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`✓ ${file}`);
    await page.close();
  }

  await context.close();
}

await browser.close();
console.log(`\nDone. ${viewports.length * pages.length} screenshots in ./${OUT}/`);
