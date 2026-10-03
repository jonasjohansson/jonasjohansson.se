import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { parsePoints } from '../src/js/walk/loader.js';

// The baker runs on the machine that has the scans, not on the build
// server, so its half of the round trip is checked only where it can run.
let baker = true;
try { execFileSync('python3', ['-c', 'import numpy, trimesh'], { stdio: 'ignore' }); } catch { baker = false; }

// What scripts/walk_points.py writes, read back by what the page runs.
function bake(points, colours) {
  const directory = mkdtempSync(path.join(tmpdir(), 'walk-points-'));
  const file = path.join(directory, 'test.pts');
  try {
    execFileSync('python3', ['-c', `
import sys, numpy as np
sys.path.insert(0, 'scripts')
from walk_points import write
write(sys.argv[1], np.array(${JSON.stringify(points)}, dtype=np.float32), np.array(${JSON.stringify(colours)}, dtype=np.uint8))
`, file]);
    const raw = gunzipSync(readFileSync(file));
    return parsePoints(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('a baked file comes back as the same points, to within a couple of millimetres', { skip: !baker && 'needs python3 with numpy and trimesh' }, () => {
  const points = [[-1, 0, -10], [1, 2, 0], [0.5, 1, -3], [0.52, 1.03, -3.04]];
  const colours = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [128, 128, 128]];
  const { positions, colors, count } = bake(points, colours);
  assert.equal(count, 4);
  // The file is reordered along a space-filling curve; match each point.
  for (const [i, point] of points.entries()) {
    const index = [...Array(count).keys()].find(j => Math.hypot(...point.map((v, a) => v - positions[j * 3 + a])) < 0.003);
    assert.ok(index !== undefined, `point ${point} lost`);
    for (let a = 0; a < 3; a++) assert.ok(Math.abs(colors[index * 3 + a] - colours[i][a]) <= 5, `colour ${colours[i]}`);
  }
});

test('anything else is refused rather than drawn as noise', () => {
  assert.throws(() => parsePoints(new ArrayBuffer(40)), /not a point file/);
});
