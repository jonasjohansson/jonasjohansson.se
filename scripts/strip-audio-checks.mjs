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
    // A stable width is not a stable position: the strips on either side are
    // still redistributing, so strip 8 can still be sliding when its box is
    // read, and the point below then lands on a neighbour. Wait for the edge
    // as well as the width, which is what actually decides what is under the
    // pointer. This failed three CI runs in a day before the x was included.
    await page.waitForFunction(() => new Promise(resolve => {
      const strip = document.querySelectorAll('#strips .strip:not([hidden])')[7];
      const { x, width } = strip.getBoundingClientRect();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const settled = strip.getBoundingClientRect();
        resolve(settled.width === width && settled.x === x);
      }));
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
    await page.locator('#project-filter').selectOption('2025');
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

  // The landing's wall is slivers on a phone: the first tap opens one and names
  // it, the second enters. A project page lists cards, which open on one tap.
  await check('a tap opens a strip, a second enters it, and both play Mario', mobile, async page => {
    await observeAudio(page);
    await visit(page);
    const strip = page.locator('#strip-klattermusen');
    await strip.tap();
    await page.waitForFunction(() => !!document.querySelector('.strip.is-active'));
    await page.evaluate(() => new Promise(resolve => {
      const open = document.querySelector('.strip.is-active');
      open.addEventListener('transitionend', resolve, { once: true });
      setTimeout(resolve, 1200);
    }));
    assert.equal(await page.locator('#strip-klattermusen.is-active').count(), 1, 'the first tap opens that strip');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.project), undefined, 'and does not enter the project');
    await page.waitForFunction(() => window.__stripSound.notes.length >= 1);
    assert.equal(await page.evaluate(() => window.__stripSound.notes[0]), 659.25, 'the tap plays the first note');
    await strip.tap();
    await page.waitForSelector('#projects #klattermusen');
    await page.waitForFunction(() => window.__stripSound.active === 0);
    await page.locator('#collection').evaluate(collection => collection.scrollIntoView({ block: 'start' }));
    const before = await page.evaluate(() => window.__stripSound.notes.length);
    // A project's wall is slivers too, so it answers a thumb the same way: the
    // first tap opens and names, the second enters.
    const onward = page.locator('#strips .strip:not([hidden])').first();
    await onward.tap();
    await page.waitForFunction(count => window.__stripSound.notes.length > count, before);
    await page.waitForFunction(() => !!document.querySelector('.strip.is-active'));
    assert.equal(await page.evaluate(() => document.documentElement.dataset.project), 'klattermusen', 'the first tap opens rather than leaves');
    await onward.tap();
    await page.waitForFunction(() => document.documentElement.dataset.project !== 'klattermusen');
  });

  await check('a swipe through a project wall scrolls it and opens nothing', mobile, async page => {
    await observeAudio(page);
    await visit(page, '/klattermusen/');
    // The wall and its footer end the page, so leave room below to scroll into.
    await page.locator('#collection').evaluate(collection => scrollTo(0, collection.getBoundingClientRect().top + scrollY - 100));
    const cards = page.locator('#strips .strip:not([hidden])');
    assert.ok(await cards.count() > 1, 'the grid holds every other project');
    assert.equal(await page.locator('#strips').evaluate(grid => grid.scrollWidth <= grid.clientWidth + 1), true, 'the grid does not scroll sideways');
    const box = await cards.first().boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const from = await page.evaluate(() => scrollY);
    // A swipe scrolls the page; nothing opens in place.
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 8; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 40 * step }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(top => scrollY > top, from);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.project), 'klattermusen', 'a swipe opens no project');
    assert.equal(await page.locator('#strips .strip.is-active').count(), 0, 'cards never open in place');
    assert.equal(await page.evaluate(() => window.__stripSound.notes.length), 0, 'a swipe plays nothing');
  });

  await check('strip navigation works when Web Audio is unavailable', desktop, async page => {
    await page.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
    await visit(page);
    await page.locator('#strip-kagora').hover();
    await page.locator('#strip-kagora').click();
    await page.waitForSelector('#projects #kagora');
  });

  // Resizing the window used to play the wall; that instrument is gone, so a
  // resize on any device now sounds nothing at all.
  await check('resizing the window sounds nothing', desktop, async page => {
    await observeAudio(page);
    await visit(page);
    // Unlock first, so silence here is the absence of the instrument and not a
    // missing audio context.
    await page.mouse.click(8, 8);
    await page.waitForFunction(() => window.__stripSound.contexts[0]?.state === 'running');
    const strip = await page.evaluate(() => innerWidth / document.querySelectorAll('#strips .strip:not([hidden])').length);
    for (let step = 1; step <= 4; step++) {
      await page.setViewportSize({ width: Math.round(1440 - strip * step), height: 900 });
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => window.__stripSound.notes.length), 0, 'a squeeze plays nothing');
    assert.equal(await page.evaluate(() => window.__stripSound.active), 0, 'and leaves nothing sounding');
  });
}
