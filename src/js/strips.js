import { initAnimation } from './stripAnimation.js';
import { homeScrollTop } from './home.js';

let entries = [];
let controller;
let resizeFrame;
let activeFilter = '';
const projects = new Map(window.__PROJECTS_DATA__.map(project => [project.slug, project]));

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
  const height = strips.clientHeight;
  const visible = entries.filter(entry => !entry.hidden);
  const minWidth = visible.length ? parseFloat(getComputedStyle(visible[0]).minWidth) : 0;
  const width = Math.max(minWidth, strips.clientWidth / Math.max(1, visible.length));
  const narrow = width <= height * 0.16;
  for (const entry of visible) {
    const image = entry.querySelector('img');
    if (!image) continue;
    const ratio = Number(image.getAttribute('width')) / Number(image.getAttribute('height'));
    entry.querySelectorAll('source').forEach(source => {
      if (source.classList.contains('strip-wall-source')) source.media = narrow ? 'all' : 'not all';
      else source.sizes = `${narrow ? 80 : Math.ceil(Math.max(width, height * ratio))}px`;
    });
    if (matchMedia('(hover: hover)').matches && entry.matches(':hover, :focus-visible')) setWideImage(entry);
  }
}

export function updateStrips(slug) {
  controller?.abort();
  controller = new AbortController();
  entries = [...document.querySelectorAll('#strips .strip')];
  let count = 0;
  for (const entry of entries) {
    entry.hidden = entry.dataset.project === slug || (!slug && activeFilter !== '' && !projects.get(entry.dataset.project)?.tags.includes(activeFilter));
    if (!entry.hidden) count++;
    if (entry.hidden || !entry.querySelector('img')) continue;
    const upgradeImage = () => {
      if (!matchMedia('(hover: hover)').matches) return;
      setWideImage(entry);
    };
    entry.addEventListener('pointerenter', upgradeImage, { signal: controller.signal });
    entry.addEventListener('focus', upgradeImage, { signal: controller.signal });
  }
  document.getElementById('project-count').textContent = `${count} ${count === 1 ? 'project' : 'projects'}`;
  updateImages();
  initAnimation(document.getElementById('strips'), controller.signal);
}

export function initializeStrips() {
  document.documentElement.classList.add('enhanced');
  const filters = document.getElementById('project-filters');
  const counts = new Map();
  projects.forEach(project => project.tags.forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1)));
  const tags = [...counts.keys()].filter(tag => tag !== 'installation').sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b));
  for (const tag of ['', ...tags]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.filter = tag;
    button.textContent = tag === '' ? 'All' : tag === 'av' ? 'Audiovisual' : tag[0].toUpperCase() + tag.slice(1);
    button.setAttribute('aria-pressed', String(tag === activeFilter));
    filters.append(button);
  }
  filters.hidden = false;
  filters.addEventListener('click', event => {
    const button = event.target.closest('button[data-filter]');
    if (!button) return;
    activeFilter = button.dataset.filter;
    filters.querySelectorAll('button').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    updateStrips();
    document.getElementById('strips').scrollLeft = 0;
    scrollTo({ top: homeScrollTop(), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
  updateStrips(document.documentElement.dataset.project);
  addEventListener('resize', () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => { resizeFrame = null; updateImages(); });
  });
}
