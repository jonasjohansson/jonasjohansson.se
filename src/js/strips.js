import { initAnimation } from './stripAnimation.js';
import { homeScrollTop } from './home.js';

let entries = [];
let controller;
let resizeFrame;
const projects = new Map(window.__PROJECTS_DATA__.map(project => [project.slug, project]));
const counts = new Map();
projects.forEach(project => project.tags.forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1)));
const isYear = tag => /^\d{4}$/.test(tag);
const categories = [...counts.keys()].filter(tag => tag !== 'installation' && !isYear(tag)).sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b));
const years = [...counts.keys()].filter(isYear).sort((a, b) => Number(b) - Number(a));
let activeTags = new Set(categories);
let activeYear = '';
const filterSelections = new Map([['', { tags: activeTags, year: activeYear }]]);
let currentSlug = '';
const pendingImages = new WeakMap();
let hoveredEntry;

function updatePreview() {
  const focused = document.activeElement?.closest('#strips .strip:not([hidden])');
  const entry = hoveredEntry || focused;
  const projectTags = projects.get(entry?.dataset.project)?.tags || [];
  document.getElementById('project-preview-name').textContent = entry?.getAttribute('aria-label') || '';
  document.querySelectorAll('#project-filters button').forEach(button => {
    const tag = button.dataset.filter;
    button.classList.toggle('is-preview-tag', activeTags.has(tag) && projectTags.includes(tag));
  });
}

function matchesFilters(project, selectedTags = activeTags, selectedYear = activeYear) {
  // Subject tags combine with each other; the year narrows that selection.
  // With all subjects on, include projects tagged only Installation as well.
  return (!selectedYear || project.tags.includes(selectedYear)) &&
    (selectedTags.size === categories.length || project.tags.some(tag => selectedTags.has(tag)));
}

function hasMatches(selectedTags = activeTags, selectedYear = activeYear) {
  return [...projects.values()].some(project => project.slug !== currentSlug && matchesFilters(project, selectedTags, selectedYear));
}

function canRemoveTag(tag) {
  return activeTags.size > 1 && hasMatches(new Set([...activeTags].filter(candidate => candidate !== tag)));
}

function canSelectOnlyTag(tag) {
  return hasMatches(new Set([tag]));
}

function updateFilterStates() {
  document.querySelectorAll('#project-filters button').forEach(button => {
    const active = activeTags.has(button.dataset.filter);
    button.setAttribute('aria-pressed', String(active));
    const disabled = activeTags.size === categories.length
      ? !canSelectOnlyTag(button.dataset.filter)
      : active && !canRemoveTag(button.dataset.filter);
    button.setAttribute('aria-disabled', String(disabled));
  });
  const yearSelect = document.getElementById('project-year');
  yearSelect.value = activeYear;
  for (const option of yearSelect.options) option.disabled = !hasMatches(activeTags, option.value);
}

function setImageSize(entry, width) {
  const picture = entry.querySelector('picture');
  if (!picture || parseFloat(picture.querySelector('source').sizes) >= width || pendingImages.get(entry)?.width >= width) return;
  // Leave the decoded preview in place until its replacement is ready. The
  // strip itself can expand immediately, even on a slow connection.
  const replacement = picture.cloneNode(true);
  const image = replacement.querySelector('img');
  image.loading = 'eager';
  replacement.querySelectorAll('source').forEach(source => { source.sizes = `${width}px`; });
  const pending = { width };
  pendingImages.set(entry, pending);
  image.decode().then(() => {
    if (entry.isConnected && pendingImages.get(entry) === pending) picture.replaceWith(replacement);
  }).catch(() => {}).finally(() => {
    if (pendingImages.get(entry) === pending) pendingImages.delete(entry);
  });
}

function setWideImage(entry) {
  const image = entry.querySelector('img');
  if (!image) return;
  const width = parseFloat(entry.style.getPropertyValue('--strip-image-width'));
  if (!width) return;
  setImageSize(entry, Math.ceil(width));
}

function updateImages() {
  const strips = document.getElementById('strips');
  const height = strips.clientHeight;
  const visible = entries.filter(entry => !entry.hidden);
  const minWidth = visible.length ? parseFloat(getComputedStyle(visible[0]).minWidth) : 0;
  const width = Math.max(minWidth, strips.clientWidth / Math.max(1, visible.length));
  // Size the image for the widest this strip can open, then reveal it through
  // the changing strip width. Hover must never resize the photograph itself.
  const grow = matchMedia('(hover: hover)').matches ? 12 : 1;
  const openWidth = Math.max(minWidth, Math.min(strips.clientWidth * grow / (visible.length + grow - 1), strips.clientWidth - (visible.length - 1) * minWidth));
  const narrow = width <= height * 0.16;
  for (const entry of visible) {
    const image = entry.querySelector('img');
    if (!image) continue;
    const ratio = Number(image.getAttribute('width')) / Number(image.getAttribute('height'));
    const imageWidth = Math.max(height * ratio, openWidth);
    entry.style.setProperty('--strip-image-width', `${imageWidth}px`);
    // Keep the same composition at every resolution so opening a strip cannot
    // stretch a narrow preview while the larger image is still downloading.
    setImageSize(entry, narrow ? 640 : Math.ceil(imageWidth));
    if (matchMedia('(hover: hover)').matches && entry.matches(':hover, :focus-visible')) setWideImage(entry);
  }
}

export function updateStrips(slug) {
  currentSlug = slug || '';
  if (!filterSelections.has(currentSlug)) filterSelections.set(currentSlug, { tags: new Set(categories), year: '' });
  ({ tags: activeTags, year: activeYear } = filterSelections.get(currentSlug));
  updateFilterStates();
  controller?.abort();
  controller = new AbortController();
  hoveredEntry = null;
  entries = [...document.querySelectorAll('#strips .strip')];
  let count = 0;
  for (const entry of entries) {
    const matches = matchesFilters(projects.get(entry.dataset.project));
    entry.hidden = entry.dataset.project === currentSlug || !matches;
    if (!entry.hidden) count++;
    if (entry.hidden || !entry.querySelector('img')) continue;
    const upgradeImage = () => {
      if (!matchMedia('(hover: hover)').matches) return;
      setWideImage(entry);
    };
    entry.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') { hoveredEntry = entry; updatePreview(); }
      upgradeImage();
    }, { signal: controller.signal });
    entry.addEventListener('pointerleave', () => {
      if (hoveredEntry === entry) hoveredEntry = null;
      updatePreview();
    }, { signal: controller.signal });
    entry.addEventListener('focus', () => { upgradeImage(); updatePreview(); }, { signal: controller.signal });
    entry.addEventListener('blur', updatePreview, { signal: controller.signal });
  }
  document.getElementById('project-count').textContent = `${count} ${count === 1 ? 'project' : 'projects'}`;
  updatePreview();
  updateImages();
  initAnimation(document.getElementById('strips'), controller.signal);
}

export function initializeStrips() {
  document.documentElement.classList.add('enhanced');
  const filters = document.getElementById('project-filters');
  for (const tag of categories) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.filter = tag;
    button.textContent = tag === 'av' ? 'Audiovisual' : tag[0].toUpperCase() + tag.slice(1);
    button.setAttribute('aria-pressed', String(activeTags.has(tag)));
    button.setAttribute('aria-controls', 'strips');
    filters.append(button);
  }
  const yearSelect = document.createElement('select');
  yearSelect.id = 'project-year';
  yearSelect.setAttribute('aria-label', 'Year');
  yearSelect.setAttribute('aria-controls', 'strips');
  yearSelect.add(new Option('All years', ''));
  for (const year of years) yearSelect.add(new Option(year, year));
  filters.append(yearSelect);
  filters.hidden = false;
  updateFilterStates();
  const applyFilters = () => {
    updateStrips(currentSlug);
    document.getElementById('strips').scrollLeft = 0;
    const top = currentSlug ? document.getElementById('collection').getBoundingClientRect().top + scrollY : homeScrollTop();
    scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  yearSelect.addEventListener('change', () => {
    if (!hasMatches(activeTags, yearSelect.value)) {
      yearSelect.value = activeYear;
      return;
    }
    filterSelections.get(currentSlug).year = yearSelect.value;
    applyFilters();
  });
  filters.addEventListener('click', event => {
    const button = event.target.closest('button[data-filter]');
    if (!button) return;
    const tag = button.dataset.filter;
    if (activeTags.size === categories.length) {
      if (!canSelectOnlyTag(tag)) return;
      activeTags.clear();
      activeTags.add(tag);
    } else {
      if (activeTags.has(tag) && !canRemoveTag(tag)) return;
      if (activeTags.has(tag)) activeTags.delete(tag);
      else activeTags.add(tag);
    }
    applyFilters();
  });
  updateStrips(document.documentElement.dataset.project);
  addEventListener('resize', () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => { resizeFrame = null; updateImages(); });
  });
}
