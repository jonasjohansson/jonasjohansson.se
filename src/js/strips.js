import { initAnimation } from './stripAnimation.js';

let entries = [];
let controller;
let resizeFrame;
const wallQuery = '(hover: hover) and (min-width: 901px)';
const cardSizes = '(hover: none) calc(100vw - 48px), (max-width: 900px) calc(100vw - 48px)';
const collapseDelay = 260;

function setWallImage(entry, enabled) {
  entry.querySelectorAll('.strip-wall-source').forEach(source => {
    source.media = enabled ? wallQuery : 'not all';
  });
}

function setWideImage(entry) {
  const image = entry.querySelector('img');
  if (!image) return;
  const ratio = Number(image.getAttribute('width')) / Number(image.getAttribute('height'));
  const width = Math.max(innerWidth * 0.45, document.getElementById('strips').clientHeight * ratio);
  setWallImage(entry, false);
  entry.querySelectorAll('source:not(.strip-wall-source)').forEach(source => {
    source.sizes = `${Math.ceil(width)}px`;
  });
}

async function waitForImage(image) {
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (image.complete && image.naturalWidth) return image.decode?.().catch(() => {});
  return new Promise(resolve => {
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', resolve, { once: true });
  });
}

function updateImages() {
  const strips = document.getElementById('strips');
  const wall = matchMedia(wallQuery).matches;
  const height = strips.clientHeight;
  const visible = entries.filter(entry => !entry.hidden);
  const width = strips.clientWidth / Math.max(1, visible.length);
  const narrow = wall && width <= height * 0.16;
  for (const entry of visible) {
    const image = entry.querySelector('img');
    if (!image) continue;
    const ratio = Number(image.getAttribute('width')) / Number(image.getAttribute('height'));
    entry.querySelectorAll('source').forEach(source => {
      if (source.classList.contains('strip-wall-source')) source.media = narrow ? wallQuery : 'not all';
      else source.sizes = `${cardSizes}, ${wall && !narrow ? Math.ceil(Math.max(width, height * ratio)) : 80}px`;
    });
  }
}

export function updateStrips(slug) {
  controller?.abort();
  controller = new AbortController();
  entries = [...document.querySelectorAll('#strips .strip')];
  let count = 0;
  for (const entry of entries) {
    entry.hidden = entry.dataset.project === slug;
    if (!entry.hidden) count++;
    if (entry.hidden || !entry.querySelector('img')) continue;
    let intent = 0;
    let collapseTimer;
    const expand = async () => {
      if (!matchMedia(wallQuery).matches) return;
      clearTimeout(collapseTimer);
      const currentIntent = ++intent;
      const image = entry.querySelector('img');
      setWideImage(entry);
      await waitForImage(image);
      if (intent === currentIntent) entry.classList.add('is-expanded');
    };
    const collapse = () => {
      intent++;
      entry.classList.remove('is-expanded');
      clearTimeout(collapseTimer);
      collapseTimer = setTimeout(() => {
        if (!entry.matches(':hover, :focus-within') && matchMedia(wallQuery).matches) {
          setWallImage(entry, true);
        }
      }, collapseDelay);
    };
    entry.addEventListener('pointerenter', expand, { signal: controller.signal });
    entry.addEventListener('pointerleave', collapse, { signal: controller.signal });
    entry.addEventListener('focus', expand, { signal: controller.signal });
    entry.addEventListener('blur', collapse, { signal: controller.signal });
    controller.signal.addEventListener('abort', () => clearTimeout(collapseTimer), { once: true });
  }
  document.getElementById('project-count').textContent = `${count} projects`;
  updateImages();
  initAnimation(document.getElementById('strips'), controller.signal);
}

export function initializeStrips() {
  document.documentElement.classList.add('enhanced');
  updateStrips(document.documentElement.dataset.project);
  addEventListener('resize', () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => { resizeFrame = null; updateImages(); });
  });
}
