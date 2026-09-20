import { chromium } from 'playwright';
const out = process.argv[2];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: out, size: { width: 1280, height: 800 } } });
const page = await context.newPage();
await page.goto('https://ode.plxplxplx.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(7000);          // let the vine take hold
await page.mouse.move(640, 400);
// Climb the scaffold: the camera height follows the wheel, so turn it steadily.
for (let i = 0; i < 150; i++) {
  await page.mouse.wheel(0, 26);
  await page.waitForTimeout(66);
}
await page.waitForTimeout(2500);
await context.close();
await browser.close();
