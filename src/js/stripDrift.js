// On touch screens the wall is wider than the viewport, but nothing says so.
// A slow drift shows the strips moving until the visitor takes over: the
// first touch, wheel or keyboard scroll on the wall ends it for good.
// The movement is a transform rather than scrollLeft, which browsers round
// to whole pixels and would make a slow drift step instead of glide.
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
  let offset = 0; // drifted distance beyond the real scroll position
  const paint = () => {
    container.dataset.drifting = '';
    container.style.setProperty('--drift', `${-offset}px`);
  };
  const clear = () => {
    delete container.dataset.drifting;
    container.style.removeProperty('--drift');
  };
  const halt = () => { cancelAnimationFrame(frame); frame = null; clearTimeout(timer); };
  // Hand the drifted distance to the scroll container, then let the browser take over.
  const stop = () => {
    dismissed = true;
    halt();
    if (offset) container.scrollLeft += Math.round(offset);
    offset = 0;
    clear();
  };
  const tick = now => {
    const max = container.scrollWidth - container.clientWidth - container.scrollLeft;
    if (max <= 0) { frame = null; return; }
    const step = (now - last) / 1000 * SPEED;
    last = now;
    offset = Math.max(0, Math.min(max, offset + step * direction));
    if (offset === 0 || offset === max) direction = -direction;
    paint();
    frame = requestAnimationFrame(tick);
  };
  const start = () => {
    if (frame !== null || !visible || document.hidden) return;
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
  motion.addEventListener('change', stop, { signal });
  signal.addEventListener('abort', () => { halt(); offset = 0; clear(); observer.disconnect(); }, { once: true });
}
