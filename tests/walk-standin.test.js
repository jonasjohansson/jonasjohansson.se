import test from 'node:test';
import assert from 'node:assert/strict';
import { standinAlley, ALLEY } from '../src/js/walk/standin.js';

const figures = [
  { x: -1, z: -12, pose: 'laptop', facing: Math.PI / 2 },
  { x: 1, z: -26, pose: 'phone', facing: -Math.PI / 2 },
];
const scene = standinAlley({ seed: 7, density: 0.2, figures });

test('the same seed builds the same alley', () => {
  const again = standinAlley({ seed: 7, density: 0.2, figures });
  assert.deepEqual(again.positions, scene.positions);
  assert.deepEqual(again.colors, scene.colors);
});

test('arrays agree with the point count', () => {
  assert.ok(scene.count > 1000);
  assert.equal(scene.positions.length, scene.count * 3);
  assert.equal(scene.colors.length, scene.count * 3);
});

test('every point is inside the alley', () => {
  for (let i = 0; i < scene.count; i++) {
    const x = scene.positions[i * 3], y = scene.positions[i * 3 + 1], z = scene.positions[i * 3 + 2];
    assert.ok(Math.abs(x) <= ALLEY.width / 2 + 0.6, `x ${x}`);
    assert.ok(y >= -0.01 && y <= ALLEY.height + 1, `y ${y}`);
    assert.ok(z <= 2 && z >= -ALLEY.length - 2, `z ${z}`);
  }
});

test('each figure is made of points', () => {
  for (const { x, z } of figures) {
    let near = 0;
    for (let i = 0; i < scene.count; i++) {
      const dx = scene.positions[i * 3] - x, dy = scene.positions[i * 3 + 1] - 1, dz = scene.positions[i * 3 + 2] - z;
      if (Math.hypot(dx, dy, dz) < 0.6) near++;
    }
    assert.ok(near > 200, `${near} points near the figure at ${x}, ${z}`);
  }
});
