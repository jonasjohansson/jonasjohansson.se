import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutMosaic } from '../src/js/mosaic.js';

const screens = [[390, 844], [768, 1024], [1440, 900], [1920, 1080], [3440, 1440]];
// 34 projects like the wall: the newest eight carry sizes, scattered through colour order.
const wall = Array.from({ length: 34 }, (_, index) => ({ size: '', ratio: index % 3 ? 1.5 : 0.75 }));
[[4, 'xl'], [11, 'l'], [29, 'l'], [2, 'm'], [17, 'm'], [20, 'm'], [26, 'm'], [33, 'm']].forEach(([index, size]) => { wall[index].size = size; });

function covers({ cols, rows, cells }) {
  const hits = new Array(cols * rows).fill(0);
  for (const { x, y, w, h } of cells) {
    if (x < 0 || y < 0 || x + w > cols || y + h > rows) return false;
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) hits[j * cols + i]++;
  }
  return hits.every(hit => hit === 1);
}

test('the mosaic fills its grid exactly for every count and screen', () => {
  for (const [width, height] of screens) {
    for (let count = 1; count <= wall.length; count++) {
      // Both ends of the wall, so a filter keeping only the tail is covered too.
      for (const tiles of [wall.slice(0, count), wall.slice(-count)]) {
        const grid = layoutMosaic(tiles, width, height);
        assert.equal(grid.cells.length, tiles.length);
        assert.ok(covers(grid), `${count} tiles on ${width}x${height} leave a gap or overlap`);
      }
    }
  }
});

test('the full wall keeps every size and near-square cells on each screen', () => {
  for (const [width, height] of screens) {
    const { cols, rows, cells } = layoutMosaic(wall, width, height);
    assert.deepEqual([cells[4].w, cells[4].h], [3, 3], `${width}x${height}`);
    assert.deepEqual([cells[29].w, cells[29].h], [2, 2], `${width}x${height}`);
    const cell = (width / cols) / (height / rows);
    assert.ok(cell > 0.7 && cell < 1.45, `cells are ${cell.toFixed(2)}:1 on ${width}x${height}`);
  }
});
