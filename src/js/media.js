const motion = matchMedia('(prefers-reduced-motion: reduce)');
const touch = matchMedia('(any-pointer: coarse)');
let observer;
let controller;
let records = [];
let audioSamples = [];

function resetControls(record) {
  if (!record.reveal) return;
  record.video.controls = !touch.matches;
  record.reveal.hidden = !touch.matches;
}

function update(record) {
  if (document.hidden || !record.visible) {
    record.video.pause();
    if (!record.visible) resetControls(record);
  } else if (!motion.matches && !record.manual) {
    record.video.play().catch(() => { /* Keep the poster when playback is blocked. */ });
  }
}

export function mountMedia(root) {
  observer?.disconnect();
  controller?.abort();
  records.forEach(({ video, reveal }) => { video.pause(); reveal?.remove(); });
  audioSamples.forEach(audio => audio.pause());
  controller = new AbortController();
  audioSamples = [...root.querySelectorAll('audio')];
  for (const audio of audioSamples) {
    audio.addEventListener('play', () => {
      audioSamples.forEach(other => { if (other !== audio) other.pause(); });
    }, { signal: controller.signal });
  }
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
    // Every video, including a hero, needs a way to pause or start playback.
    // A transparent button reveals the native controls without letting the
    // same tap toggle playback. Native controls remain the no-JS fallback.
    const reveal = document.createElement('button');
    reveal.type = 'button';
    reveal.className = 'media-controls-reveal';
    reveal.setAttribute('aria-label', `Show video controls: ${record.video.getAttribute('aria-label')}`);
    record.video.after(reveal);
    record.reveal = reveal;
    resetControls(record);
    reveal.addEventListener('click', () => {
      record.video.controls = true;
      reveal.hidden = true;
      record.video.focus({ preventScroll: true });
    }, { signal: controller.signal });
    // Once someone touches the native controls, their playback choice wins.
    for (const event of ['pointerdown', 'keydown']) {
      record.video.addEventListener(event, () => { record.manual = true; }, { signal: controller.signal });
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
touch.addEventListener('change', () => records.forEach(resetControls));
document.addEventListener('visibilitychange', () => {
  records.forEach(update);
  if (document.hidden) audioSamples.forEach(audio => audio.pause());
});
