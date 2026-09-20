import { initAnimation } from './stripAnimation.js';
import { homeScrollTop } from './home.js';
import { initializeStripAudio, bindStripAudio } from './xylophone.js';

let entries = [];
let controller;
let resizeFrame;
const projects = new Map(window.__PROJECTS_DATA__.map(project => [project.slug, project]));
const counts = new Map();
projects.forEach(project => project.tags.forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1)));
const isYear = tag => /^\d{4}$/.test(tag);
const categories = [...counts.keys()].filter(tag => !isYear(tag)).sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b));
const years = [...counts.keys()].filter(isYear).sort((a, b) => Number(b) - Number(a));
let activeTags = new Set(categories);
let activeYear = '';
let activeQuery = '';
const blankSelection = () => ({ tags: new Set(categories), year: '', query: '' });
const filterSelections = new Map([['', { tags: activeTags, year: activeYear, query: activeQuery }]]);
// Names are matched loosely: case and accents are not what anyone is typing at.
const normalize = text => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
let currentSlug = '';
const pendingImages = new WeakMap();
let hoveredEntry;

function updatePreview() {
  const focused = document.activeElement?.closest('#strips .strip:not([hidden])');
  const entry = hoveredEntry || focused;
  // The bottom-left caption names the project while a strip is hovered, focused or scrubbed.
  const caption = document.getElementById('strip-caption');
  caption.textContent = entry?.getAttribute('aria-label') || '';
  caption.hidden = !entry;
}

function matchesFilters(project, selectedTags = activeTags, selectedYear = activeYear, selectedQuery = activeQuery) {
  // Typing a name is its own filter: it searches the whole collection rather
  // than narrowing whatever the dropdown last chose.
  if (selectedQuery) return normalize(`${project.title} ${project.slug}`).includes(selectedQuery);
  // A project belongs to one category or none; the year narrows that
  // selection. All work is every category at once, which shows untagged
  // projects too.
  return (!selectedYear || project.tags.includes(selectedYear)) &&
    (selectedTags.size === categories.length || project.tags.some(tag => selectedTags.has(tag)));
}

function hasMatches(selectedTags = activeTags, selectedYear = activeYear, selectedQuery = activeQuery) {
  return [...projects.values()].some(project => project.slug !== currentSlug && matchesFilters(project, selectedTags, selectedYear, selectedQuery));
}

// Year and category are alternatives: choosing one resets the other, so each
// is validated against the other's reset state.
function canSelectOnlyTag(tag) {
  return hasMatches(new Set([tag]), '', '');
}

// One dropdown carries both lists, because they were always alternatives: a
// category, a year, or All work. The whole set of categories means All work.
function currentFilter() {
  if (activeYear) return activeYear;
  return activeTags.size === categories.length ? '' : [...activeTags][0];
}

// A choice is offered only if it leaves something on the wall. On a project
// page the open project is not on its own wall, so a category it alone holds
// would empty it.
function canSelect(value) {
  if (!value) return true;
  return isYear(value) ? hasMatches(new Set(categories), value, '') : canSelectOnlyTag(value);
}

function updateFilterStates() {
  const filter = document.getElementById('project-filter');
  filter.value = currentFilter();
  for (const option of filter.options) option.disabled = !canSelect(option.value);
  const search = document.getElementById('project-search');
  if (search && search.value !== activeQuery && document.activeElement !== search) search.value = activeQuery;
}

function setImageSize(entry, width) {
  const picture = entry.querySelector('picture');
  // The default clause is the last one; touch devices carry a smaller one first.
  const declared = Math.max(...picture.querySelector('source').sizes.split(',').map(clause => parseFloat(clause.trim().split(/\s+/).pop())));
  if (!picture || declared >= width || pendingImages.get(entry)?.width >= width) return;
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

// Leaving a project for the landing page starts over with every category
// and no year, as if the site had just been opened.
export function resetFilters(slug = '') {
  filterSelections.set(slug, blankSelection());
}

// On touch screens the wall scrolls sideways under a swipe. A finger held
// still for a moment starts a scrub instead: the strip under it opens and
// follows the finger, the way a cursor does on desktop. A tap still opens the
// project; a scrub that lifts elsewhere opens nothing, because the browser
// only fires click when the finger lifts where it landed.
const HOLD = 220; // ms of stillness before a touch becomes a scrub
const SLOP = 8; // px of movement that makes a touch a swipe instead
function bindTouchScrub(wall, signal) {
  let active = null, timer = null, scrubbing = false, startX = 0, startY = 0;
  const setActive = strip => {
    if (strip === active) return;
    active?.classList.remove('is-active');
    active = strip;
    active?.classList.add('is-active');
    hoveredEntry = strip;
    updatePreview();
  };
  const stripAt = (x, y) => {
    const strip = document.elementFromPoint(x, y)?.closest('.strip:not([hidden])');
    return strip && wall.contains(strip) ? strip : null;
  };
  const end = () => {
    clearTimeout(timer);
    timer = null;
    scrubbing = false;
    delete wall.dataset.scrubbing;
  };
  wall.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch') return;
    startX = event.clientX;
    startY = event.clientY;
    clearTimeout(timer);
    timer = setTimeout(() => {
      scrubbing = true;
      wall.dataset.scrubbing = '';
      setActive(stripAt(startX, startY));
      navigator.vibrate?.(8);
    }, HOLD);
  }, { signal, passive: true });
  wall.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch' || scrubbing) return;
    if (Math.hypot(event.clientX - startX, event.clientY - startY) > SLOP) { clearTimeout(timer); timer = null; }
  }, { signal, passive: true });
  // Once scrubbing, the finger is followed through touch events, which keep
  // arriving even after the browser has cancelled the pointer for a pan it
  // is then told not to make.
  wall.addEventListener('touchmove', event => {
    if (!scrubbing) return;
    event.preventDefault();
    const touch = event.touches[0];
    const strip = stripAt(touch.clientX, touch.clientY);
    if (strip) setActive(strip);
  }, { signal, passive: false });
  // Phones cannot hover, so a 44px strip gives no clue what it is. The first
  // tap opens that strip and names it in the caption; tapping the open strip
  // again enters the project. Holding still scrubs through the wall.
  wall.addEventListener('click', event => {
    if (matchMedia('(hover: hover)').matches) return;
    const strip = event.target.closest('.strip:not([hidden])');
    if (!strip || !wall.contains(strip) || strip === active) return;
    event.preventDefault();
    setActive(strip);
  }, { signal });
  wall.addEventListener('contextmenu', event => { if (timer !== null || scrubbing) event.preventDefault(); }, { signal });
  wall.addEventListener('touchend', end, { signal });
  wall.addEventListener('touchcancel', () => { end(); setActive(null); }, { signal });
  wall.addEventListener('pointercancel', () => { if (!scrubbing) end(); }, { signal });
  signal.addEventListener('abort', () => { end(); setActive(null); }, { once: true });
}

export function updateStrips(slug) {
  currentSlug = slug || '';
  if (!filterSelections.has(currentSlug)) filterSelections.set(currentSlug, blankSelection());
  ({ tags: activeTags, year: activeYear, query: activeQuery } = filterSelections.get(currentSlug));
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
  // The scrub belongs to a wall of slivers: a finger held still opens the strip
  // under it. A project page's phone layout is a grid of cards, which is tapped.
  if (!currentSlug || !matchMedia('(hover: none)').matches) bindTouchScrub(document.getElementById('strips'), controller.signal);
  bindStripAudio(document.getElementById('strips'), controller.signal);
}

export function initializeStrips() {
  initializeStripAudio();
  document.documentElement.classList.add('enhanced');
  const filters = document.getElementById('project-filters');
  // Typing a name is the other way to find a project. Pointer devices only:
  // a phone lists every card already, and a keyboard is a lot to ask for it.
  const search = document.createElement('input');
  search.id = 'project-search';
  search.type = 'search';
  search.placeholder = 'Search';
  search.autocomplete = 'off';
  search.spellcheck = false;
  search.setAttribute('aria-label', 'Find a project by name');
  search.setAttribute('aria-controls', 'strips');
  filters.append(search);
  const filter = document.createElement('select');
  filter.id = 'project-filter';
  filter.setAttribute('aria-label', 'Filter projects');
  filter.setAttribute('aria-controls', 'strips');
  filter.add(new Option('All work', ''));
  const group = (label, values, text) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = label;
    for (const value of values) optgroup.append(new Option(text(value), value));
    filter.append(optgroup);
  };
  group('Category', categories, tag => tag === 'av' ? 'Audiovisual' : tag[0].toUpperCase() + tag.slice(1));
  group('Year', years, year => year);
  filters.append(filter);
  filters.hidden = false;
  updateFilterStates();
  const applyFilters = () => {
    updateStrips(currentSlug);
    document.getElementById('strips').scrollLeft = 0;
    const top = currentSlug ? document.getElementById('collection').getBoundingClientRect().top + scrollY : homeScrollTop();
    scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  filter.addEventListener('change', () => {
    const value = filter.value;
    if (!canSelect(value)) {
      filter.value = currentFilter();
      return;
    }
    // Picking from one list clears the other, which is what a single dropdown
    // says on its face: a year shows every category, a category every year.
    const selection = filterSelections.get(currentSlug);
    selection.year = isYear(value) ? value : '';
    selection.query = '';
    search.value = '';
    search.classList.remove('is-empty');
    activeTags.clear();
    if (value && !isYear(value)) activeTags.add(value);
    else categories.forEach(tag => activeTags.add(tag));
    applyFilters();
  });
  search.addEventListener('input', () => {
    const query = normalize(search.value.trim());
    // A name that matches nothing leaves the wall as it is rather than
    // emptying it, the same rule the dropdown follows by closing off a
    // category that has nothing left to show.
    const empty = !!query && !hasMatches(activeTags, activeYear, query);
    search.classList.toggle('is-empty', empty);
    if (empty || query === activeQuery) return;
    const selection = filterSelections.get(currentSlug);
    selection.query = query;
    selection.year = '';
    activeTags.clear();
    categories.forEach(tag => activeTags.add(tag));
    // No page scroll here: the wall re-sorts under a keystroke, and moving
    // the page on every letter would fight the typing.
    updateStrips(currentSlug);
    document.getElementById('strips').scrollLeft = 0;
  });
  search.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !search.value) return;
    search.value = '';
    search.dispatchEvent(new Event('input'));
    event.stopPropagation();
  });
  updateStrips(document.documentElement.dataset.project);
  addEventListener('resize', () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => { resizeFrame = null; updateImages(); });
  });
}
