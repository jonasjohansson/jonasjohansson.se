// Scroll is the walk's timeline. Progress runs 0 to 1 over the whole page;
// the path position t runs 0 to 1 along the camera path. Between stops the
// walk eases in and out, so it slows as it reaches someone. At a stop t holds
// still for a stretch of scroll while focus rises to 1 and falls again: the
// camera turns to look over that person's shoulder and then walks on.

const ease = u => u * u * u * (u * (u * 6 - 15) + 10);
const rise = (edge, u) => {
  const x = Math.min(1, Math.max(0, u / edge));
  return x * x * (3 - 2 * x);
};

export function createTimeline(stops, { dwell = 0.12 } = {}) {
  // Alternating travel and dwell segments, weighted by distance travelled and
  // a fixed share of scroll per stop.
  const segments = [];
  let from = 0;
  stops.forEach((stop, index) => {
    segments.push({ kind: 'travel', from, to: stop.at, weight: stop.at - from });
    segments.push({ kind: 'dwell', at: stop.at, stop: index, weight: dwell });
    from = stop.at;
  });
  segments.push({ kind: 'travel', from, to: 1, weight: 1 - from });
  const total = segments.reduce((sum, segment) => sum + segment.weight, 0);
  let start = 0;
  for (const segment of segments) {
    segment.start = start / total;
    start += segment.weight;
    segment.end = start / total;
  }

  function at(progress) {
    const p = Math.min(1, Math.max(0, progress));
    const segment = segments.find(s => p <= s.end) || segments.at(-1);
    const span = segment.end - segment.start;
    const u = span > 0 ? (p - segment.start) / span : 1;
    if (segment.kind === 'dwell') {
      return { t: segment.at, stop: segment.stop, focus: Math.min(rise(0.25, u), rise(0.25, 1 - u)) };
    }
    return { t: Math.min(1, segment.from + (segment.to - segment.from) * ease(u)), stop: -1, focus: 0 };
  }

  function progressOf(index) {
    const segment = segments.find(s => s.kind === 'dwell' && s.stop === index);
    return (segment.start + segment.end) / 2;
  }

  return { at, progressOf };
}
