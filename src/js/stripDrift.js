// On touch screens the wall is wider than the viewport, but nothing says so.
// A slow drift shows the strips moving until the visitor takes over: the
// first touch, wheel or keyboard scroll on the wall ends it for good.
const touch = matchMedia('(hover: none)');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const SPEED = 14; // CSS pixels per second
const DELAY = 1200; // ms of stillness before the drift begins
let dismissed = false; // once the visitor has taken over, stay still for the rest of the session

export function initDrift(container, signal) {
  if (dismissed || !touch.matches || motion.matches) return;
  let frame = null;
  let last = 0;
  let direction = 1;
  let visible = false;
  let position = container.scrollLeft;
  const stop = () => {
    dismissed = true;
    cancelAnimationFrame(frame);
    frame = null;
    clearTimeout(timer);
  };
  const tick = now => {
    const max = container.scrollWidth - container.clientWidth;
    if (max <= 0) { frame = null; return; }
    const step = (now - last) / 1000 * SPEED;
    last = now;
    position = Math.max(0, Math.min(max, position + step * direction));
    if (position === 0 || position === max) direction = -direction;
    container.scrollLeft = position;
    frame = requestAnimationFrame(tick);
  };
  const start = () => {
    if (frame !== null || !visible || document.hidden) return;
    position = container.scrollLeft;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };
  let timer = setTimeout(start, DELAY);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) { clearTimeout(timer); timer = setTimeout(start, DELAY); }
    else if (frame !== null) { cancelAnimationFrame(frame); frame = null; }
  }, { threshold: 0.5 });
  observer.observe(container);
  for (const type of ['pointerdown', 'touchstart', 'wheel', 'keydown']) {
    container.addEventListener(type, stop, { signal, passive: true });
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = null; } else if (visible) start(); }, { signal });
  const halt = () => { cancelAnimationFrame(frame); frame = null; clearTimeout(timer); };
  motion.addEventListener('change', halt, { signal });
  signal.addEventListener('abort', () => { halt(); observer.disconnect(); }, { once: true });
}
