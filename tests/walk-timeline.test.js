import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimeline } from '../src/js/walk/timeline.js';

const stops = [{ at: 0.25 }, { at: 0.5 }, { at: 0.8 }];
const timeline = createTimeline(stops, { dwell: 0.12 });

test('the walk starts at the beginning of the path and ends at its end', () => {
  assert.equal(timeline.at(0).t, 0);
  assert.equal(timeline.at(1).t, 1);
  assert.equal(timeline.at(-1).t, 0);
  assert.equal(timeline.at(2).t, 1);
});

test('scrolling forward never walks backward', () => {
  let last = -1;
  for (let p = 0; p <= 1; p += 0.001) {
    const { t } = timeline.at(p);
    assert.ok(t >= last - 1e-9, `t fell from ${last} to ${t} at ${p}`);
    last = t;
  }
});

test('a stop holds the camera still and turns it to the screen', () => {
  stops.forEach((stop, index) => {
    const middle = timeline.progressOf(index);
    const here = timeline.at(middle);
    assert.equal(here.stop, index);
    assert.ok(Math.abs(here.t - stop.at) < 1e-9);
    assert.ok(here.focus > 0.99);
    for (const offset of [-0.03, 0.03]) {
      const near = timeline.at(middle + offset);
      assert.ok(Math.abs(near.t - stop.at) < 1e-9, `drifts at offset ${offset}`);
      assert.ok(near.focus > 0.5);
    }
  });
});

test('between stops the camera faces the way it walks', () => {
  const between = (timeline.progressOf(0) + timeline.progressOf(1)) / 2;
  assert.equal(timeline.at(between).focus, 0);
  assert.equal(timeline.at(between).stop, -1);
});

test('the camera never leaves the path, even by a rounding error', () => {
  const steep = createTimeline([{ at: 0.24 }, { at: 0.52 }, { at: 0.8 }], { dwell: 0.14 });
  for (let p = 0; p <= 1.00001; p += 0.0005) {
    const { t } = steep.at(p);
    assert.ok(t >= 0 && t <= 1, `t is ${t} at ${p}`);
  }
});
