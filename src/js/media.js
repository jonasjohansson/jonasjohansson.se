const motion = matchMedia('(prefers-reduced-motion: reduce)');
let observer;
let controller;
let records = [];

function update(record) {
  if (document.hidden || !record.visible) {
    record.video.pause();
  } else if (!motion.matches && !record.manual) {
    record.video.play().catch(() => { /* Keep the poster when playback is blocked. */ });
  }
}

export function mountMedia(root) {
  observer?.disconnect();
  controller?.abort();
  records.forEach(({ video }) => video.pause());
  controller = new AbortController();
  records = [...root.querySelectorAll('video[data-preview]')].map(video => ({ video, visible: false, manual: false }));
  const byVideo = new Map(records.map(record => [record.video, record]));
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const record = byVideo.get(entry.target);
      record.visible = entry.isIntersecting;
      update(record);
    }
  }, { threshold: 0.15 });
  for (const record of records) {
    record.video.removeAttribute('autoplay');
    record.video.pause();
    // Once someone touches the native controls, their playback choice wins.
    if (record.video.controls) {
      for (const event of ['pointerdown', 'keydown']) {
        record.video.addEventListener(event, () => { record.manual = true; }, { signal: controller.signal });
      }
    }
    observer.observe(record.video);
  }
}

motion.addEventListener('change', () => {
  for (const record of records) {
    if (motion.matches) record.video.pause();
    else update(record);
  }
});
document.addEventListener('visibilitychange', () => records.forEach(update));
