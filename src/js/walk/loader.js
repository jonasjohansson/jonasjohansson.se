// Reads a point file baked by scripts/walk_points.py: gzipped, points in
// Morton order, positions as small steps from the point before in 12-bit
// fractions of the bounding box, colours in 5 bits a channel, each kind of
// value in its own plane. Returns the shape the renderer takes.

export function parsePoints(buffer) {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
  if (magic !== 'PTS2') throw new Error('not a point file');
  const count = view.getUint32(4, true);
  const low = [0, 1, 2].map(i => view.getFloat32(8 + i * 4, true));
  const high = [0, 1, 2].map(i => view.getFloat32(20 + i * 4, true));
  const positionTop = (1 << view.getUint8(32)) - 1;
  const colourTop = (1 << view.getUint8(33)) - 1;
  const bytes = new Uint8Array(buffer, 36);
  const plane = index => bytes.subarray(index * count, (index + 1) * count);
  const positions = new Float32Array(count * 3);
  for (let axis = 0; axis < 3; axis++) {
    const lo = plane(axis), hi = plane(axis + 3);
    const scale = (high[axis] - low[axis]) / positionTop;
    let q = 0;
    for (let i = 0; i < count; i++) {
      const step = lo[i] | (hi[i] << 8);
      q += step > 32767 ? step - 65536 : step;
      positions[i * 3 + axis] = low[axis] + q * scale;
    }
  }
  const colors = new Uint8Array(count * 3);
  for (let channel = 0; channel < 3; channel++) {
    const values = plane(6 + channel);
    for (let i = 0; i < count; i++) colors[i * 3 + channel] = Math.round(values[i] * 255 / colourTop);
  }
  return { positions, colors, count };
}

export async function loadPoints(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const raw = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  return parsePoints(raw);
}
