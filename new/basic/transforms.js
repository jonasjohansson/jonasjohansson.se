// transforms.js — math for transforms & background panning

export const CONFIG = {
  MAX_ROT_DEG: 35,
  MAX_SKEW_DEG: 10,
  EASE: 0.18,
};

// 1 at center, ~0.2 at edges
export function edgeAmplitude(norm) {
  const edge = Math.abs(norm - 0.5) * 2;
  return 0.2 + (1.0 - edge) * 0.8;
}

export function transformForVertical(dx, amp, cfg = CONFIG) {
  const maxRot = cfg.MAX_ROT_DEG * amp;
  const maxSkw = cfg.MAX_SKEW_DEG * amp;
  const angleY = clamp(dx * maxRot, -maxRot, maxRot);
  const skewY = clamp(dx * maxSkw, -maxSkw, maxSkw);
  return `rotateY(${angleY.toFixed(2)}deg) skewY(${-skewY.toFixed(2)}deg)`;
}

export function transformForHorizontal(dy, amp, cfg = CONFIG) {
  const maxRot = cfg.MAX_ROT_DEG * amp;
  const maxSkw = cfg.MAX_SKEW_DEG * amp;
  const angleX = clamp(-dy * maxRot, -maxRot, maxRot);
  const skewX = clamp(dy * maxSkw, -maxSkw, maxSkw);
  return `rotateX(${angleX.toFixed(2)}deg) skewX(${skewX.toFixed(2)}deg)`;
}

export const bgXFrom = (curX) => `${(curX * 100).toFixed(1)}% 50%`;
export const bgYFrom = (curY) => `50% ${(curY * 100).toFixed(1)}%`;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
