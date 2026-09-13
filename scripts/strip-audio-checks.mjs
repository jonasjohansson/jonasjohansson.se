import assert from 'node:assert/strict';

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
    const box = await strips.nth(7).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width / 2 + 1, box.y + box.height / 2);
    await page.waitForTimeout(400);
    assert.equal((await notes()).length, 8, 'moving inside a strip and resting do not repeat the note');
    assert.equal(await page.evaluate(() => window.__stripSound.active), 0, 'short notes finish and release their oscillators');
    await page.mouse.move(8, 8);
    await page.getByRole('combobox', { name: 'Year', exact: true }).selectOption('2025');
    assert.equal((await notes()).length, 8, 'filter changes are silent');
    await strips.first().hover();
    assert.ok(Math.abs((await notes())[8] - 392) < 0.01, 'the melody continues with a small filtered collection');
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

  await check('touch strip taps play Mario once without blocking project navigation', mobile, async page => {
    await observeAudio(page);
    await visit(page);
    await page.locator('#strip-klattermusen').tap();
    await page.waitForSelector('#projects #klattermusen');
    await page.waitForFunction(() => window.__stripSound.notes.length === 2);
    assert.equal(await page.evaluate(() => window.__stripSound.notes[0]), 659.25, 'the first tap plays the first note');
    await page.waitForFunction(() => window.__stripSound.active === 0);
    await page.locator('#collection').evaluate(collection => collection.scrollIntoView({ block: 'start' }));
    await page.locator('#strips .strip:not([hidden])').first().tap();
    await page.waitForFunction(() => window.__stripSound.notes.length === 4);
    await page.waitForFunction(() => document.documentElement.dataset.project !== 'klattermusen');
  });

  await check('touch scrub opens the strip under the finger and plays notes without opening a project', mobile, async page => {
    await observeAudio(page);
    await visit(page);
    const wall = page.locator('#strips');
    const box = await wall.boundingBox();
    assert.ok(await wall.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'the touch wall fits the screen');
    const widths = () => page.locator('#strips .strip:not([hidden])').evaluateAll(strips => strips.map(strip => strip.getBoundingClientRect().width));
    const before = await widths();
    const cdp = await page.context().newCDPSession(page);
    const y = box.y + box.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 12, y }] });
    await page.waitForFunction(() => document.querySelector('#strips .strip.is-active'));
    const first = await page.locator('#strips .strip.is-active').getAttribute('id');
    await page.waitForFunction(() => document.querySelector('#strips .strip.is-active').getBoundingClientRect().width > 60);
    for (let x = box.x + 12; x < box.x + box.width - 12; x += 24) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      await page.waitForTimeout(30);
    }
    const last = await page.locator('#strips .strip.is-active').getAttribute('id');
    assert.notEqual(last, first, 'the open strip follows the finger');
    await page.waitForFunction(() => window.__stripSound.notes.length >= 6, null, { timeout: 5000 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.project), undefined, 'lifting after a scrub opens nothing');
    assert.equal(await page.locator('#strips .strip.is-active').count(), 1, 'the last strip stays open after the finger lifts');
    const after = await widths();
    assert.ok(Math.max(...after) > Math.max(...before) * 3, 'the open strip is clearly wider than the rest');
    await page.locator('#strips .strip.is-active').tap();
    await page.waitForFunction(id => document.documentElement.dataset.project === id.replace('strip-', ''), last);
  });

  await check('strip navigation works when Web Audio is unavailable', desktop, async page => {
    await page.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
    await visit(page);
    await page.locator('#strip-kagora').hover();
    await page.locator('#strip-kagora').click();
    await page.waitForSelector('#projects #kagora');
  });
}
