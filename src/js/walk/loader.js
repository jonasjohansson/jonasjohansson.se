// Reads a point file baked by scripts/walk_points.py: positions stored as
// 16-bit fractions of the bounding box, colours as bytes. Returns the shape
// the renderer takes, the same one the stand-in alley builds.

export function parsePoints(buffer) {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
  if (magic !== 'PTS1') throw new Error('not a point file');
  const count = view.getUint32(4, true);
  const low = [0, 1, 2].map(i => view.getFloat32(8 + i * 4, true));
  const high = [0, 1, 2].map(i => view.getFloat32(20 + i * 4, true));
  const quantised = new Uint16Array(buffer.slice(32, 32 + count * 6));
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) {
    const axis = i % 3;
    positions[i] = low[axis] + quantised[i] / 65535 * (high[axis] - low[axis]);
  }
  const colors = new Uint8Array(buffer, 32 + count * 6, count * 3);
  return { positions, colors, count };
}

export async function loadPoints(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return parsePoints(await response.arrayBuffer());
}
