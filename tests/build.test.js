import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { composeUltraWide, groupMedia, readProjects, validateProject } from '../scripts/project-data.js';
import sharp from 'sharp';
import { ogFingerprint, ogImage, imageCache } from '../scripts/images.js';

test('authored projects validate, and sorting is deterministic', () => {
  const projects = readProjects().filter(project => project.type === 'work');
  assert.ok(projects.length > 0);
  assert.deepEqual(projects.map(project => project.slug), readProjects().filter(project => project.type === 'work').map(project => project.slug));
});

test('invalid content reports the project and field rather than disappearing', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'site-data-'));
  try {
    writeFileSync(path.join(directory, 'hero.jpg'), 'fixture');
    const data = { title: 'Example', date: '2026-01-01', blocks: [{ type: 'image', src: 'hero.jpg', alt: 'An example artwork.' }] };
    assert.throws(() => validateProject({ ...data, date: 'bad date' }, 'example', directory), /example\/data.md: date/);
    assert.throws(() => validateProject({ ...data, unlisted: 'yes' }, 'example', directory), /unlisted must be/);
    assert.doesNotThrow(() => validateProject({ ...data, unlisted: true }, 'example', directory));
    assert.throws(() => validateProject({ ...data, blocks: [{ ...data.blocks[0], src: 'missing.jpg' }] }, 'example', directory), /blocks\[0\].src: missing/);
    assert.throws(() => validateProject({ ...data, blocks: [data.blocks[0], { type: 'unknown' }] }, 'example', directory), /blocks\[1\]: unknown/);
    assert.throws(() => validateProject({ ...data, blocks: [{ ...data.blocks[0], alt: '' }] }, 'example', directory), /hero needs/);
    for (const zoom of [0, 4, '1.8', Infinity]) {
      assert.throws(() => validateProject({ ...data, blocks: [{ ...data.blocks[0], zoom }] }, 'example', directory), /blocks\[0\].zoom/);
    }
    assert.throws(() => validateProject({ ...data, blocks: [data.blocks[0], null] }, 'example', directory), /blocks\[1\] must be/);
    assert.throws(() => validateProject({ ...data, blocks: [data.blocks[0], { type: 'text', content: 'Text', fontSize: 12 }] }, 'example', directory), /blocks\[1\].fontSize/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('media grouping preserves heroes, authored placements and balanced rows', () => {
  const image = { type: 'image', ar: 0.667 };
  const content = [image, { type: 'text' }, ...Array.from({ length: 9 }, () => ({ ...image }))];
  const grouped = groupMedia(content);
  assert.equal(grouped[0], image);
  assert.deepEqual(grouped.slice(2).map(row => row.items.length), [3, 3, 3]);
  const authored = { ...image, colStart: 2, colSpan: 4 };
  assert.equal(groupMedia([image, authored, image])[1], authored);
  const pair = groupMedia([image, { ...image, size: 'half-left' }, { type: 'image', ar: 1.5, size: 'half-right' }]);
  assert.equal(pair[1].items.length, 2);
  assert.equal(pair[1].arSum, 2.167);
});

test('portrait triptychs retain their images and video without absorbing adjacent landscapes', () => {
  const hero = { type: 'image', ar: 1.5 };
  const image = { type: 'image', ar: 0.5625 };
  const video = { type: 'video', ar: 0.5625, src: '07.webm', poster: '07-poster.jpg' };
  const triptych = [image, image, video].map((block, i) => ({ ...block, colStart: 1 + i * 4, colSpan: 4 }));
  const content = [hero, { type: 'text' }, ...triptych, hero, { type: 'text' }];
  const grouped = groupMedia(content);
  assert.deepEqual(grouped[2].items, triptych, 'the third panel stays with the first two');
  assert.equal(grouped[2].arSum, 1.6875);
  assert.equal(grouped[2].gutters, 2);
  assert.equal(grouped[3], hero, 'the following landscape stays outside the triptych');
  assert.deepEqual(grouped.flatMap(block => block.items || [block]), content, 'all media and text keep their order');

  const automatic = groupMedia([video, { type: 'text' }, image, image, video, hero]);
  assert.equal(automatic[0], video, 'a portrait video hero remains separate');
  assert.deepEqual(automatic[2].items, [image, image, video], 'unplaced portrait videos also belong in portrait rows');
  assert.equal(automatic[3], hero, 'landscapes end automatic portrait rows');
});

test('authored media rows stop at missing columns, text, and a new row', () => {
  const hero = { type: 'image', ar: 1.5 };
  const image = { type: 'image', ar: 0.5625, colStart: 1, colSpan: 4 };
  for (const next of [{ ...image, colStart: 9 }, { type: 'text' }, hero]) {
    assert.deepEqual(groupMedia([hero, image, next]), [hero, image, next]);
  }
  const pair = [{ type: 'video', ar: 1.5, size: 'half-left' }, { type: 'video', ar: 1.5, size: 'half-right' }];
  const grouped = groupMedia([hero, ...pair, ...pair]);
  assert.deepEqual(grouped.slice(1).map(row => row.items), [pair, pair], 'two video pairs remain distinct rows');
});

test('video heroes require a local poster and a reserved aspect ratio', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'site-video-hero-'));
  try {
    writeFileSync(path.join(directory, 'hero.webm'), 'video fixture');
    writeFileSync(path.join(directory, 'first-frame.jpg'), 'poster fixture');
    const hero = { type: 'video', src: 'hero.webm', poster: 'first-frame.jpg', ar: 1.5, alt: 'An alien craft emerging from clouds.' };
    const data = { title: 'Example', date: '2026-01-01', blocks: [hero] };
    assert.doesNotThrow(() => validateProject(data, 'example', directory));
    assert.throws(() => validateProject({ ...data, blocks: [{ ...hero, poster: undefined }] }, 'example', directory), /hero video needs a poster/);
    assert.throws(() => validateProject({ ...data, blocks: [{ ...hero, poster: 'missing.jpg' }] }, 'example', directory), /blocks\[0\].poster: missing/);
    assert.throws(() => validateProject({ ...data, blocks: [{ ...hero, ar: undefined }] }, 'example', directory), /video needs an aspect ratio/);
    assert.equal(groupMedia([hero, { type: 'image', ar: 0.75 }])[0], hero);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('sharing image cache keys change when the source changes', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'site-og-'));
  try {
    const source = path.join(directory, 'hero.jpg');
    writeFileSync(source, 'first image');
    const first = ogFingerprint(source);
    assert.equal(first, ogFingerprint(source));
    assert.notEqual(ogFingerprint(source, '50% 35%'), ogFingerprint(source, '50% 60%'), 'changing the hero crop also refreshes the sharing image URL');
    writeFileSync(source, 'replacement image');
    assert.notEqual(first, ogFingerprint(source));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('sharing previews apply orientation before the authored focal crop', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'site-og-orientation-'));
  let output;
  try {
    const source = path.join(directory, 'hero.jpg');
    const blue = await sharp({ create: { width: 320, height: 320, channels: 3, background: '#0000ff' } }).png().toBuffer();
    await sharp({ create: { width: 320, height: 640, channels: 3, background: '#ff0000' } })
      .composite([{ input: blue, left: 0, top: 320 }]).withMetadata({ orientation: 8 }).jpeg().toFile(source);
    const url = await ogImage(source, path.basename(directory), '50% 50%');
    output = path.join(imageCache, 'og', path.basename(url));
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.format, 'jpeg');
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 630);
    assert.equal(metadata.space, 'srgb');
    const left = await sharp(await sharp(output).extract({ left: 40, top: 300, width: 20, height: 20 }).toBuffer()).stats();
    const right = await sharp(await sharp(output).extract({ left: 1140, top: 300, width: 20, height: 20 }).toBuffer()).stats();
    assert.ok(left.channels[0].mean > 240 && left.channels[2].mean < 15, 'red appears on the left after rotation');
    assert.ok(right.channels[2].mean > 240 && right.channels[0].mean < 15, 'blue appears on the right after rotation');
  } finally {
    if (output) rmSync(output, { force: true });
    rmSync(directory, { recursive: true, force: true });
  }
});

test('audio samples require an accessible label and an existing project asset', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'site-audio-'));
  try {
    writeFileSync(path.join(directory, 'hero.jpg'), 'image fixture');
    writeFileSync(path.join(directory, 'sample.mp3'), 'audio fixture');
    const hero = { type: 'image', src: 'hero.jpg', alt: 'The installation.' };
    const audio = { type: 'audio', src: 'sample.mp3', label: 'Music and game sounds, 18 seconds' };
    const data = { title: 'Example', date: '2026-01-01', blocks: [hero, audio] };
    assert.doesNotThrow(() => validateProject(data, 'example', directory));
    for (const label of ['', undefined, 42]) {
      assert.throws(() => validateProject({ ...data, blocks: [hero, { ...audio, label }] }, 'example', directory), /blocks\[1\].label/);
    }
    for (const src of ['missing.mp3', '../sample.mp3', 'https://example.com/sample.mp3']) {
      assert.throws(() => validateProject({ ...data, blocks: [hero, { ...audio, src }] }, 'example', directory), /blocks\[1\].src/);
    }
    assert.deepEqual(groupMedia([hero, audio, hero]), [hero, audio, hero], 'audio keeps its authored place between images');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('ultra-wide spreads take the writing after an image, and other standalone images pair', () => {
  const image = { type: 'image', ar: 1.5 };
  const text = { type: 'text' };
  const flags = blocks => composeUltraWide(blocks).map(({ spreadStart, spreadFlip, spreadEnd, pairStart, pairEnd }) =>
    [spreadStart && (spreadFlip ? 'spread-flip' : 'spread'), spreadEnd && 'end', pairStart && 'pair', pairEnd && 'pair-end'].filter(Boolean).join(' '));
  assert.deepEqual(flags([image, text, image, image, image, text, text, image, text]),
    ['', '', 'pair', 'pair-end', 'spread', '', 'end', 'spread-flip', 'end'], 'the hero stays alone; spreads alternate sides');
  assert.deepEqual(flags([image, image, image, image]), ['', 'pair', 'pair-end', ''], 'an odd image out stays full width');
  assert.deepEqual(flags([image, { ...image, pair: false }, image, image]), ['', '', 'pair', 'pair-end'], 'pair: false keeps an image alone');
  assert.deepEqual(flags([image, { type: 'row', items: [] }, image]), ['', '', ''], 'authored rows never pair');
  const banner = { type: 'image', ar: 9.33 };
  assert.deepEqual(flags([image, banner, text, banner, image]), ['', '', '', '', ''], 'banners stay full width, away from writing and pairs');
});

test('the About text splits into its first sentence and the rest', async () => {
  const { splitLead } = await import('../scripts/intro.js');
  assert.deepEqual(splitLead('One is here. Two [links](https://a.b/c.d) here.\n\nThree.'), { lead: 'One is here.', rest: 'Two [links](https://a.b/c.d) here.\n\nThree.' });
  assert.deepEqual(splitLead('Only one.'), { lead: 'Only one.', rest: '' });
  assert.deepEqual(splitLead(''), { lead: '', rest: '' });
});
