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
const blankSelection = () => ({ tags: new Set(categories), year: '' });
const filterSelections = new Map([['', { tags: activeTags, year: activeYear }]]);
let currentSlug = '';
const pendingImages = new WeakMap();

function matchesFilters(project, selectedTags = activeTags, selectedYear = activeYear) {
  // A project belongs to one category or none; the year narrows that
  // selection. All work is every category at once, which shows untagged
  // projects too.
  return (!selectedYear || project.tags.includes(selectedYear)) &&
    (selectedTags.size === categories.length || project.tags.some(tag => selectedTags.has(tag)));
}

function hasMatches(selectedTags = activeTags, selectedYear = activeYear) {
  return [...projects.values()].some(project => project.slug !== currentSlug && matchesFilters(project, selectedTags, selectedYear));
}

// Year and category are alternatives: choosing one resets the other, so each
// is validated against the other's reset state.
function canSelectOnlyTag(tag) {
  return hasMatches(new Set([tag]), '');
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
  return isYear(value) ? hasMatches(new Set(categories), value) : canSelectOnlyTag(value);
}

function updateFilterStates() {
  const filter = document.getElementById('project-filter');
  filter.value = currentFilter();
  for (const option of filter.options) option.disabled = !canSelect(option.value);
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
  const wallWidth = strips.clientWidth;
  const visible = entries.filter(entry => !entry.hidden);
  const style = visible.length ? getComputedStyle(visible[0]) : null;
  const minWidth = style ? parseFloat(style.minWidth) : 0;
  const width = Math.max(minWidth, wallWidth / Math.max(1, visible.length));
  // Size the image for the widest this strip can open, then reveal it through
  // the changing strip width. Hover must never resize the photograph itself.
  const hover = matchMedia('(hover: hover)').matches;
  const grow = style ? parseFloat(style.getPropertyValue('--strip-grow')) : 1;
  // More strips than fit at their minimum width scroll sideways; an open
  // strip then takes a fixed share of the wall instead of the leftover space.
  const overflow = visible.length * minWidth > wallWidth;
  const openWidth = overflow
    ? Math.max(minWidth, Math.min(wallWidth * 0.45, height * 1.5))
    : Math.max(minWidth, Math.min(wallWidth * grow / (visible.length + grow - 1), wallWidth - (visible.length - 1) * minWidth));
  strips.style.setProperty('--strip-open-width', `${openWidth}px`);
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
    if (hover && entry.matches(':hover, :focus-visible')) setWideImage(entry);
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
// The landing never scrolls up and down, so a mouse wheel over its wall moves
// along the strips instead. Trackpads already scroll sideways everywhere.
function bindWheel(wall, signal) {
  wall.addEventListener('wheel', event => {
    if (document.body.dataset.route !== 'home' || event.ctrlKey) return;
    if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    if (wall.scrollWidth <= wall.clientWidth) return;
    event.preventDefault();
    wall.scrollLeft += event.deltaY;
  }, { passive: false, signal });
}

function bindTouchScrub(wall, signal) {
  let active = null, timer = null, scrubbing = false, startX = 0, startY = 0;
  const setActive = strip => {
    if (strip === active) return;
    active?.classList.remove('is-active');
    active = strip;
    active?.classList.add('is-active');
    if (active) setWideImage(active);
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
  // A finger dragged along the wall scrubs from the moment it moves sideways:
  // the strip under it opens as it passes, so the wall can be read by running
  // a thumb across it rather than tapping a 10px sliver. A drag up or down is
  // the page scrolling and stays that way.
  wall.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch' || scrubbing) return;
    const dx = event.clientX - startX, dy = event.clientY - startY;
    if (Math.hypot(dx, dy) <= SLOP) return;
    clearTimeout(timer);
    timer = null;
    if (Math.abs(dx) <= Math.abs(dy)) return;
    scrubbing = true;
    wall.dataset.scrubbing = '';
    setActive(stripAt(event.clientX, event.clientY));
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
  // Phones cannot hover, so a sliver is small to judge by. The first tap
  // opens that strip; tapping the open strip enters
  // the project. A drag along the wall opens them in turn without entering
  // anything, because the browser only fires click where the finger landed.
  wall.addEventListener('click', event => {
    // Keyboard and assistive-technology activation already identify the link;
    // only a physical tap needs the extra preview step.
    if (matchMedia('(hover: hover)').matches || event.detail === 0) return;
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
  ({ tags: activeTags, year: activeYear } = filterSelections.get(currentSlug));
  updateFilterStates();
  controller?.abort();
  controller = new AbortController();
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
    entry.addEventListener('pointerenter', upgradeImage, { signal: controller.signal });
    entry.addEventListener('focus', upgradeImage, { signal: controller.signal });
  }
  document.getElementById('project-count').textContent = `${count} ${count === 1 ? 'project' : 'projects'}`;
  updateImages();
  const wall = document.getElementById('strips');
  initAnimation(wall, controller.signal);
  bindTouchScrub(wall, controller.signal);
  bindWheel(wall, controller.signal);
  bindStripAudio(wall, controller.signal);
}

export function initializeStrips() {
  initializeStripAudio();
  document.documentElement.classList.add('enhanced');
  const filters = document.getElementById('project-filters');
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
  group('Category', categories, tag => tag[0].toUpperCase() + tag.slice(1));
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
    activeTags.clear();
    if (value && !isYear(value)) activeTags.add(value);
    else categories.forEach(tag => activeTags.add(tag));
    applyFilters();
  });
  updateStrips(document.documentElement.dataset.project);
  // The wall changes size with the window and with the About text above it
  // folding, so its own size is what the images follow.
  new ResizeObserver(() => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => { resizeFrame = null; updateImages(); });
  }).observe(document.getElementById('strips'));
}
