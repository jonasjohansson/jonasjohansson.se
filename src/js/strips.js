import { initAnimation } from './stripAnimation.js';

let entries = [];
let controller;
let resizeFrame;
const wallQuery = '(hover: hover) and (min-width: 901px)';
const isWall = () => document.body.dataset.route === 'home' || matchMedia(wallQuery).matches;

function setWideImage(entry) {
  const image = entry.querySelector('img');
  if (!image) return;
  const ratio = Number(image.getAttribute('width')) / Number(image.getAttribute('height'));
  const width = Math.max(innerWidth * 0.45, document.getElementById('strips').clientHeight * ratio);
  entry.querySelectorAll('source:not(.strip-wall-source)').forEach(source => {
    source.sizes = `${Math.ceil(width)}px`;
  });
  entry.querySelectorAll('.strip-wall-source').forEach(source => {
    source.media = 'not all';
  });
}

function updateImages() {
  const strips = document.getElementById('strips');
  const wall = isWall();
  const bandWidth = document.body.dataset.route === 'home' ? '100vw' : 'calc(100vw - 48px)';
  const bandSizes = `(hover: none) ${bandWidth}, (max-width: 900px) ${bandWidth}`;
  const height = strips.clientHeight;
  const visible = entries.filter(entry => !entry.hidden);
  const width = strips.clientWidth / Math.max(1, visible.length);
  const narrow = wall && width <= height * 0.16;
  for (const entry of visible) {
    const image = entry.querySelector('img');
    if (!image) continue;
    const ratio = Number(image.getAttribute('width')) / Number(image.getAttribute('height'));
    entry.querySelectorAll('source').forEach(source => {
      if (source.classList.contains('strip-wall-source')) source.media = narrow ? 'all' : 'not all';
      else source.sizes = `${bandSizes}, ${wall && !narrow ? Math.ceil(Math.max(width, height * ratio)) : 80}px`;
    });
    if (wall && matchMedia('(hover: hover)').matches && entry.matches(':hover, :focus-visible')) setWideImage(entry);
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
    const upgradeImage = () => {
      if (!isWall() || !matchMedia('(hover: hover)').matches) return;
      setWideImage(entry);
    };
    entry.addEventListener('pointerenter', upgradeImage, { signal: controller.signal });
    entry.addEventListener('focus', upgradeImage, { signal: controller.signal });
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
