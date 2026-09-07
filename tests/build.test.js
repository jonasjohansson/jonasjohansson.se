import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { groupMedia, readProjects, validateProject } from '../scripts/project-data.js';
import { ogFingerprint } from '../scripts/images.js';

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
    assert.throws(() => validateProject({ ...data, blocks: [{ ...data.blocks[0], src: 'missing.jpg' }] }, 'example', directory), /blocks\[0\].src: missing/);
    assert.throws(() => validateProject({ ...data, blocks: [data.blocks[0], { type: 'unknown' }] }, 'example', directory), /blocks\[1\]: unknown/);
    assert.throws(() => validateProject({ ...data, blocks: [{ ...data.blocks[0], alt: '' }] }, 'example', directory), /hero needs/);
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
    writeFileSync(source, 'replacement image');
    assert.notEqual(first, ogFingerprint(source));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
