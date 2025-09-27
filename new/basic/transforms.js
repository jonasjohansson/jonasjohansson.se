// transforms.js — math for transforms & background panning

export const CONFIG = {
  MAX_ROT_DEG: 35,
  MAX_SKEW_DEG: 10,
  EASE: 0.18,
};

// Tunable non-linearity for local falloff (higher = less movement near cursor)
export const LOCAL_FALLOFF_K = 4.0;

// 1 at center, ~0.2 at edges
export function edgeAmplitude(norm) {
  const edge = Math.abs(norm - 0.5) * 2;
  return 0.2 + (1.0 - edge) * 0.8;
}

// Map distance from the active strip (0..~0.5) to a 0..1 factor
// Near the cursor -> ~0; farther away -> ~1
function distanceFalloff(d) {
  const dn = Math.min(1, Math.abs(d) * 2); // normalize (0..1)
  const K = LOCAL_FALLOFF_K;
  const num = 1 - Math.exp(-K * dn);
  const den = 1 - Math.exp(-K);
  return den === 0 ? dn : num / den;
}

export function transformForVertical(dx, amp, cfg = CONFIG) {
  const maxRot = cfg.MAX_ROT_DEG * amp;
  const s = dx < 0 ? -1 : 1;
  const mag = distanceFalloff(dx);
  const angleY = clamp(s * mag * maxRot, -maxRot, maxRot);
  return `translateZ(0) rotateY(${angleY.toFixed(2)}deg)`; // no skew
}

export function transformForHorizontal(dy, amp, cfg = CONFIG) {
  const maxRot = cfg.MAX_ROT_DEG * amp;
  const s = dy < 0 ? -1 : 1;
  const mag = distanceFalloff(dy);
  const angleX = clamp(-s * mag * maxRot, -maxRot, maxRot);
  return `translateZ(0) rotateX(${angleX.toFixed(2)}deg)`; // no skew
}

// (Kept for reference; no longer used by strips.js)
export const bgXFrom = (curX) => `${(curX * 100).toFixed(1)}% 50%`;
export const bgYFrom = (curY) => `50% ${(curY * 100).toFixed(1)}%`;

// Per-strip background positions with local falloff:
// We blend between the center (50%) and the global cursor target based on distanceFalloff.
export function bgXForStrip(curX, dx) {
  const mag = distanceFalloff(dx);
  const p = 0.5 + (curX - 0.5) * mag; // 0..1
  return `${(p * 100).toFixed(1)}% 50%`;
}
export function bgYForStrip(curY, dy) {
  const mag = distanceFalloff(dy);
  const p = 0.5 + (curY - 0.5) * mag; // 0..1
  return `50% ${(p * 100).toFixed(1)}%`;
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
