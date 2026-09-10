const intro = document.getElementById('intro');
const header = document.getElementById('home-header');
const toggle = document.getElementById('about-toggle');
const collection = document.getElementById('collection');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let frame;
let focusTarget;
let atWall = false;
let previousWallTop = 0;

const isHome = () => document.body.dataset.route === 'home';

export function homeScrollTop(view = 'projects') {
  return view === 'about' ? 0 : Math.max(0, collection.getBoundingClientRect().top + scrollY - header.offsetHeight);
}

function render() {
  frame = null;
  if (!isHome()) return;
  previousWallTop = homeScrollTop();
  atWall = scrollY >= previousWallTop - 1;
  document.body.dataset.homeView = atWall ? 'projects' : 'about';
  toggle.textContent = atWall ? 'About ↑' : 'Projects ↓';
  toggle.setAttribute('aria-label', atWall ? 'Scroll up to About' : 'Scroll down to projects');
  toggle.setAttribute('aria-controls', atWall ? 'intro' : 'collection');
  if (focusTarget && Math.abs(scrollY - homeScrollTop(focusTarget === intro ? 'about' : 'projects')) < 1) {
    focusTarget.focus({ preventScroll: true });
    focusTarget = null;
  }
}

function goTo(view) {
  focusTarget = view === 'about' ? intro : toggle;
  scrollTo({ top: homeScrollTop(view), behavior: motion.matches ? 'instant' : 'smooth' });
  render();
}

export function updateHome(slug) {
  header.hidden = !!slug;
  focusTarget = null;
  if (slug) {
    atWall = false;
    delete document.body.dataset.homeView;
  } else {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(render);
  }
}

export function initializeHome() {
  toggle.hidden = false;
  toggle.addEventListener('click', () => goTo(atWall ? 'about' : 'projects'));
  document.getElementById('home-link').addEventListener('click', event => {
    if (!isHome() || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    goTo('projects');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isHome() && !atWall) goTo('projects');
  });
  const schedule = () => {
    if (!frame && isHome()) frame = requestAnimationFrame(render);
  };
  addEventListener('scroll', schedule, { passive: true });
  new ResizeObserver(() => {
    if (!isHome()) return;
    const top = homeScrollTop();
    if (atWall && !focusTarget && Math.abs(top - previousWallTop) > 1) scrollTo({ top, behavior: 'instant' });
    render();
  }).observe(intro);
  updateHome(document.documentElement.dataset.project);
  if (isHome()) {
    scrollTo({ top: homeScrollTop(['#about', '#intro'].includes(location.hash) ? 'about' : 'projects'), behavior: 'instant' });
    render();
  }
}
