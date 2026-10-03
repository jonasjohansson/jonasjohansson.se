import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePoints } from '../src/js/walk/loader.js';

// The same layout scripts/walk_points.py writes.
function pack(points, colours, low, high) {
  const buffer = new ArrayBuffer(4 + 4 + 24 + points.length * 2 + colours.length);
  const view = new DataView(buffer);
  'PTS1'.split('').forEach((c, i) => view.setUint8(i, c.charCodeAt(0)));
  view.setUint32(4, points.length / 3, true);
  [...low, ...high].forEach((v, i) => view.setFloat32(8 + i * 4, v, true));
  points.forEach((v, i) => view.setUint16(32 + i * 2, v, true));
  new Uint8Array(buffer, 32 + points.length * 2).set(colours);
  return buffer;
}

test('a baked file unpacks to metres and colours', () => {
  const buffer = pack([0, 0, 0, 65535, 65535, 65535, 32768, 0, 65535], [10, 20, 30, 40, 50, 60, 70, 80, 90], [-1, 0, -10], [1, 2, 0]);
  const { positions, colors, count } = parsePoints(buffer);
  assert.equal(count, 3);
  assert.deepEqual([...positions.slice(0, 6)], [-1, 0, -10, 1, 2, 0]);
  assert.ok(Math.abs(positions[6] - 0) < 1e-4);
  assert.deepEqual([...colors], [10, 20, 30, 40, 50, 60, 70, 80, 90]);
});

test('anything else is refused rather than drawn as noise', () => {
  assert.throws(() => parsePoints(new ArrayBuffer(40)), /not a point file/);
});
