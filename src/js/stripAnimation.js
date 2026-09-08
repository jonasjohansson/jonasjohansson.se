const motion = matchMedia('(prefers-reduced-motion: reduce)');

export function initAnimation(container, signal) {
  const images = [...container.querySelectorAll('.strip:not([hidden]) .strip-image')];
  if (!images.length) return;
  let frame = null;
  let x = 0.5, y = 0.5, targetX = x, targetY = y;
  const reset = () => {
    cancelAnimationFrame(frame);
    frame = null;
    images.forEach(image => { image.style.removeProperty('--bg-x'); image.style.removeProperty('--bg-y'); });
  };
  const tick = () => {
    x += (targetX - x) * 0.18;
    y += (targetY - y) * 0.18;
    images.forEach((image, index) => {
      const position = images.length > 1 ? index / (images.length - 1) : 0.5;
      image.style.setProperty('--bg-x', `${50 + (x - position) * 15}%`);
      image.style.setProperty('--bg-y', `${40 + y * 20}%`);
    });
    frame = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.001 ? requestAnimationFrame(tick) : null;
  };
  container.addEventListener('pointermove', event => {
    if (motion.matches || event.pointerType !== 'mouse' || !matchMedia('(min-width: 901px)').matches) return;
    const rect = container.getBoundingClientRect();
    targetX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    targetY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    if (frame === null) frame = requestAnimationFrame(tick);
  }, { signal });
  motion.addEventListener('change', reset, { signal });
  signal.addEventListener('abort', reset, { once: true });
}
