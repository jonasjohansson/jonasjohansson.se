// The landing mosaic is a CSS grid. CSS cannot count the tiles, and dense
// auto-flow leaves holes once a big tile falls late in the colour order, so
// this picks the grid and each tile's cell. The column count is the one whose
// cells come closest to square. Big tiles sit where their place in the colour
// order falls; the rest fill the free cells in reading order, a few of them
// two cells wide to use up what the big ones leave over.

const BASE = { xl: [3, 3], l: [2, 2] };

function baseSpan({ size, ratio }) {
  if (BASE[size]) return BASE[size];
  if (size === 'm') return ratio >= 1 ? [2, 1] : [1, 2];
  return [1, 1];
}

function place(spans, cols, rows) {
  const taken = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const fits = (x, y, w, h) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (taken[j][i]) return false;
    return true;
  };
  const cells = new Array(spans.length);
  const count = spans.length;
  // Big tiles first, each at the free spot nearest its share of the wall.
  for (let index = 0; index < count; index++) {
    const [w, h] = spans[index];
    if (w * h === 1) continue;
    if (w > cols || h > rows) return null;
    const target = (index + 0.5) / count * cols * rows;
    const tx = Math.min(cols - w, Math.floor(target % cols)), ty = Math.min(rows - h, Math.floor(target / cols));
    let best = null, bestDistance = Infinity;
    for (let y = 0; y <= rows - h; y++) for (let x = 0; x <= cols - w; x++) {
      const distance = Math.hypot(x - tx, y - ty);
      if (distance < bestDistance && fits(x, y, w, h)) { best = [x, y]; bestDistance = distance; }
    }
    if (!best) return null;
    const [x, y] = best;
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) taken[j][i] = true;
    cells[index] = { x, y, w, h };
  }
  // The rest take the free cells in reading order. Where cells are left
  // over, evenly spaced tiles take two side by side instead of one.
  const free = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!taken[y][x]) free.push([x, y]);
  const small = spans.map((span, index) => index).filter(index => spans[index][0] * spans[index][1] === 1);
  let slack = free.length - small.length;
  if (slack < 0) return null;
  let cursor = 0, due = 0;
  small.forEach((index, k) => {
    const [x, y] = free[cursor];
    due += slack ? (free.length - small.length) / small.length : 0;
    const next = free[cursor + 1];
    const pair = slack > 0 && (due >= 1 || slack >= small.length - k) && next && next[1] === y && next[0] === x + 1;
    cells[index] = { x, y, w: pair ? 2 : 1, h: 1 };
    cursor += pair ? 2 : 1;
    if (pair) { slack--; due--; }
    // Tiles still to come must be able to reach the end.
    if (small.length - k - 1 > free.length - cursor) slack = -1;
  });
  return slack === 0 && cursor === free.length ? cells : null;
}

function bestGrid(spans, width, height) {
  const area = spans.reduce((sum, [w, h]) => sum + w * h, 0);
  const widest = Math.max(...spans.map(([w]) => w));
  const tallest = Math.max(...spans.map(([, h]) => h));
  const options = [];
  for (let cols = widest; cols <= area; cols++) {
    const rows = Math.max(tallest, Math.ceil(area / cols));
    const slack = cols * rows - area;
    const cell = (width / cols) / (height / rows);
    // Square cells first; each widened tile costs a little.
    options.push({ cols, rows, score: Math.abs(Math.log(cell)) + slack * 0.02 });
  }
  options.sort((a, b) => a.score - b.score);
  for (const { cols, rows } of options) {
    const cells = place(spans, cols, rows);
    if (cells) return { cols, rows, cells };
  }
  return null;
}

// tiles: [{ size: 'xl' | 'l' | 'm' | '', ratio }] in wall order.
// Returns { cols, rows, cells: [{ x, y, w, h }] }, zero-based, covering
// cols x rows exactly.
export function layoutMosaic(tiles, width, height) {
  if (!tiles.length) return { cols: 1, rows: 1, cells: [] };
  const spans = tiles.map(baseSpan);
  for (;;) {
    const grid = bestGrid(spans, width, height);
    if (grid) return grid;
    // Nothing fits: the biggest tile steps down and the search runs again.
    // A row of 1x1 tiles always fits, so this ends.
    let biggest = 0;
    spans.forEach(([w, h], index) => { if (w * h > spans[biggest][0] * spans[biggest][1]) biggest = index; });
    spans[biggest] = spans[biggest][0] * spans[biggest][1] === 9 ? [2, 2] : [1, 1];
  }
}
