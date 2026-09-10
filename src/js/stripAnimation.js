const motion = matchMedia('(prefers-reduced-motion: reduce)');

export function initAnimation(container, signal) {
  const strips = [...container.querySelectorAll('.strip:not([hidden])')];
  if (!strips.length) return;
  let frame = null;
  let x = 0.5, y = 0.5, targetX = x, targetY = y;
  const reset = () => {
    cancelAnimationFrame(frame);
    frame = null;
    strips.forEach(strip => { strip.style.removeProperty('--bg-x'); strip.style.removeProperty('--bg-y'); });
  };
  const tick = () => {
    x += (targetX - x) * 0.18;
    y += (targetY - y) * 0.18;
    strips.forEach(strip => {
      strip.style.setProperty('--bg-x', `${x * 100}%`);
      strip.style.setProperty('--bg-y', `${40 + y * 20}%`);
    });
    frame = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.001 ? requestAnimationFrame(tick) : null;
  };
  container.addEventListener('pointermove', event => {
    if (motion.matches || event.pointerType !== 'mouse') return;
    const rect = container.getBoundingClientRect();
    targetX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    targetY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    if (frame === null) frame = requestAnimationFrame(tick);
  }, { signal });
  motion.addEventListener('change', reset, { signal });
  signal.addEventListener('abort', reset, { once: true });
}
