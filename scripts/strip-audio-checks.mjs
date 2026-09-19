import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

async function observeAudio(page) {
  await page.addInitScript(() => {
    const NativeAudio = window.AudioContext;
    window.__stripSound = { contexts: [], notes: [], active: 0 };
    window.AudioContext = class extends NativeAudio {
      constructor(...args) {
        super(...args);
        const record = window.__stripSound;
        record.contexts.push(this);
        const analyser = this.createAnalyser();
        analyser.connect(this.destination);
        record.analyser = analyser;
        const createGain = this.createGain.bind(this);
        this.createGain = () => {
          const gain = createGain();
          const connect = gain.connect.bind(gain);
          gain.connect = target => connect(target === this.destination ? analyser : target);
          return gain;
        };
        const createOscillator = this.createOscillator.bind(this);
        this.createOscillator = () => {
          const oscillator = createOscillator();
          let frequency = oscillator.frequency.value;
          const setFrequency = oscillator.frequency.setValueAtTime.bind(oscillator.frequency);
          oscillator.frequency.setValueAtTime = (value, ...times) => {
            frequency = value;
            return setFrequency(value, ...times);
          };
          const start = oscillator.start.bind(oscillator);
          oscillator.start = (...times) => {
            record.notes.push(frequency);
            record.active++;
            return start(...times);
          };
          oscillator.addEventListener('ended', () => record.active--);
          return oscillator;
        };
      }
    };
  });
}

export async function checkStripAudio({ check, visit, desktop, mobile }) {
  await check('Mario strip melody sounds on movement and survives filtering and navigation', desktop, async page => {
    await observeAudio(page);
    await visit(page);
    const notes = () => page.evaluate(() => window.__stripSound.notes.filter((_, index) => index % 2 === 0));
    assert.equal(await page.evaluate(() => window.__stripSound.contexts.length), 0, 'page load does not start an audio context');
    // Unlock real Web Audio with an ordinary click, without opening a project.
    await page.mouse.click(8, 8);
    await page.waitForFunction(() => window.__stripSound.contexts[0]?.state === 'running');
    assert.deepEqual(await notes(), [], 'unlocking audio does not play a note');
    const melody = [659.25, 659.25, 659.25, 523.25, 659.25, 783.99, 392, 523.25];
    // The whole Mario sequence, read from the site's melody module, for relative checks later.
    const source = readFileSync(new URL('../src/js/melody.js', import.meta.url), 'utf8');
    const frequencies = Object.fromEntries([...source.matchAll(/^\s*"?([A-G]#?\d)"?:\s*([\d.]+)/gm)].map(match => [match[1], Number(match[2])]));
    const sequence = [...source.slice(source.indexOf('MARIO_MELODY = ['), source.indexOf('];', source.indexOf('MARIO_MELODY = ['))).matchAll(/note: "([A-G]#?\d)"/g)].map(match => frequencies[match[1]]);
    assert.deepEqual(sequence.slice(0, 8), melody, 'the melody module still opens with the known first eight notes');
    const strips = page.locator('#strips .strip:not([hidden])');
    for (let i = 0; i < melody.length; i++) {
      await strips.nth(i).hover();
      await page.waitForFunction(count => window.__stripSound.notes.length === count * 2, i + 1);
      assert.ok(Math.abs((await notes())[i] - melody[i]) < 0.01, 'strip crossings advance the original Mario sequence');
      if (i === 0) {
        await page.waitForFunction(() => {
          const analyser = window.__stripSound.analyser;
          const samples = new Float32Array(analyser.fftSize);
          analyser.getFloatTimeDomainData(samples);
          return samples.some(sample => Math.abs(sample) > 0.001);
        });
      }
    }
    // Let the hovered strip finish widening before measuring it, or the move
    // below can land on its neighbour for a frame and sound an extra note.
    await page.waitForFunction(() => new Promise(resolve => {
      const strip = document.querySelectorAll('#strips .strip:not([hidden])')[7];
      const width = strip.getBoundingClientRect().width;
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(strip.getBoundingClientRect().width === width)));
    }));
    const box = await strips.nth(7).boundingBox();
    // Counts from here are relative: the layout shift of a hover can land the
    // pointer on a neighbour for a frame in CI, which is a real note, not a bug.
    const settled = (await notes()).length;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width / 2 + 1, box.y + box.height / 2);
    await page.waitForTimeout(400);
    assert.equal((await notes()).length, settled, 'moving inside a strip and resting do not repeat the note');
    assert.equal(await page.evaluate(() => window.__stripSound.active), 0, 'short notes finish and release their oscillators');
    await page.mouse.move(8, 8);
    await page.getByRole('combobox', { name: 'Year', exact: true }).selectOption('2025');
    assert.equal((await notes()).length, settled, 'filter changes are silent');
    await strips.first().hover();
    await page.waitForFunction(count => window.__stripSound.notes.length === count * 2, settled + 1);
    assert.ok(Math.abs((await notes())[settled] - sequence[settled % sequence.length]) < 0.01, 'the melody continues with a small filtered collection');
    const chosen = await strips.first().getAttribute('data-project');
    await strips.first().click();
    await page.waitForSelector(`#projects [data-project="${chosen}"]`);
    await page.mouse.move(8, 8);
    const before = (await notes()).length;
    await page.locator('#collection').evaluate(collection => collection.scrollIntoView({ block: 'start' }));
    await strips.first().hover();
    assert.equal((await notes()).length, before + 1, 'the project page wall also plays one note per crossing');
    await page.goBack();
    await page.waitForFunction(() => document.body.dataset.route === 'home');
    await page.mouse.move(8, 8);
    const restored = (await notes()).length;
    await strips.first().hover();
    assert.equal((await notes()).length, restored + 1, 'Back restores one listener, without doubling notes');
    assert.equal(await page.evaluate(() => window.__stripSound.contexts.length), 1, 'navigation and filtering reuse the audio context');
  });

  await check('blocked hover keeps the first Mario note until audio is available', desktop, async page => {
    await observeAudio(page);
    await visit(page);
    await page.mouse.click(8, 8);
    await page.waitForFunction(() => window.__stripSound.contexts[0]?.state === 'running');
    await page.evaluate(() => window.__stripSound.contexts[0].suspend());
    const strips = page.locator('#strips .strip:not([hidden])');
    await strips.nth(0).hover();
    await strips.nth(1).hover();
    assert.equal(await page.evaluate(() => window.__stripSound.notes.length), 0, 'suspended hover does not consume or queue notes');
    await page.mouse.click(8, 8);
    await page.waitForFunction(() => window.__stripSound.contexts[0]?.state === 'running');
    assert.equal(await page.evaluate(() => window.__stripSound.notes.length), 0, 'unlocking does not flush queued hover notes');
    await strips.nth(2).hover();
    assert.equal(await page.evaluate(() => window.__stripSound.notes[0]), 659.25);
  });

  await check('touch taps open a project from its card and play Mario', mobile, async page => {
    await observeAudio(page);
    await visit(page);
    await page.locator('#strip-klattermusen').tap();
    await page.waitForSelector('#projects #klattermusen');
    await page.waitForFunction(() => window.__stripSound.notes.length >= 1);
    assert.equal(await page.evaluate(() => window.__stripSound.notes[0]), 659.25, 'the tap plays the first note');
    await page.waitForFunction(() => window.__stripSound.active === 0);
    await page.locator('#collection').evaluate(collection => collection.scrollIntoView({ block: 'start' }));
    const before = await page.evaluate(() => window.__stripSound.notes.length);
    await page.locator('#strips .strip:not([hidden])').first().tap();
    await page.waitForFunction(count => window.__stripSound.notes.length > count, before);
    await page.waitForFunction(() => document.documentElement.dataset.project !== 'klattermusen');
  });

  await check('touch cards scroll the page and open nothing until tapped', mobile, async page => {
    await observeAudio(page);
    await visit(page);
    const cards = page.locator('#strips .strip:not([hidden])');
    assert.ok(await cards.count() > 1, 'the card list holds every project');
    assert.equal(await page.locator('#strips').evaluate(list => list.scrollWidth <= list.clientWidth + 1), true, 'the list does not scroll sideways');
    const box = await cards.first().boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const from = await page.evaluate(() => scrollY);
    // A swipe scrolls the page; nothing opens in place and nothing is captioned.
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 8; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 40 * step }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(top => scrollY > top, from);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.project), undefined, 'a swipe opens no project');
    assert.equal(await page.locator('#strips .strip.is-active').count(), 0, 'cards never open in place');
    assert.equal(await page.locator('#strip-caption').isVisible(), false, 'phones show no strip caption');
    assert.equal(await page.evaluate(() => window.__stripSound.notes.length), 0, 'a swipe plays nothing');
  });

  await check('strip navigation works when Web Audio is unavailable', desktop, async page => {
    await page.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
    await visit(page);
    await page.locator('#strip-kagora').hover();
    await page.locator('#strip-kagora').click();
    await page.waitForSelector('#projects #kagora');
  });

  await check('squeezing the window plays the wall like an accordion', desktop, async page => {
    await observeAudio(page);
    await visit(page);
    const notes = () => page.evaluate(() => window.__stripSound.notes.filter((_, index) => index % 2 === 0));
    // Audio unlocks on a real gesture in the page; dragging a window edge is
    // not one, so a resize on a cold load is silent by design.
    await page.mouse.click(8, 8);
    await page.waitForFunction(() => window.__stripSound.contexts[0]?.state === 'running');
    assert.deepEqual(await notes(), [], 'unlocking still plays nothing');
    const strip = await page.evaluate(() => innerWidth / document.querySelectorAll('#strips .strip:not([hidden])').length);
    for (let step = 1; step <= 4; step++) {
      await page.setViewportSize({ width: Math.round(1440 - strip * step), height: 900 });
      await page.waitForTimeout(80);
    }
    const squeezed = (await notes()).length;
    assert.ok(squeezed > 0, 'squeezing the window sounds the wall');
    assert.ok(squeezed <= 6, `a drag plays a run, not a burst (${squeezed} notes for four steps)`);
    // An accordion sounds both ways: letting the window back out plays on.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(150);
    assert.ok((await notes()).length > squeezed, 'widening the window plays too');
    const melody = [659.25, 659.25, 659.25, 523.25, 659.25, 783.99, 392, 523.25];
    const played = await notes();
    assert.ok(played.every((frequency, index) => Math.abs(frequency - melody[index % melody.length]) < 0.01),
      'the squeeze continues the same Mario sequence the pointer plays');
  });

  await check('rotating a phone does not sound the strips', mobile, async page => {
    await observeAudio(page);
    await visit(page);
    // Unlock first, so silence here is the guard working and not a missing context.
    await page.mouse.click(8, 8);
    const size = page.viewportSize();
    await page.setViewportSize({ width: size.height, height: size.width });
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.__stripSound.notes.length), 0, 'a rotation is not a squeeze');
  });
}
