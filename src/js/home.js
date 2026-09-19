const intro = document.getElementById('intro');
const header = document.getElementById('home-header');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let frame;

const isHome = () => document.body.dataset.route === 'home';

// The wall is the landing page and About reads underneath it, so the projects
// view starts at the top and the about view where the intro begins.
export function homeScrollTop(view = 'projects') {
  if (view === 'projects') return 0;
  return Math.max(0, Math.round(intro.getBoundingClientRect().top + scrollY));
}

function render() {
  frame = null;
  if (!isHome()) return;
  // About is shorter than the screen, so the page cannot scroll far enough to
  // put its top at the viewport's top: the view turns on how much of it shows.
  // Measured against the wall, the reading starts around 150px in.
  const top = intro.getBoundingClientRect().top;
  document.body.dataset.homeView = top <= innerHeight - 150 ? 'about' : 'projects';
}

export function updateHome(slug) {
  header.hidden = !!slug;
  if (slug) {
    delete document.body.dataset.homeView;
    return;
  }
  if (frame) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(render);
}

export function initializeHome() {
  const schedule = () => {
    if (!frame && isHome()) frame = requestAnimationFrame(render);
  };
  addEventListener('scroll', schedule, { passive: true });
  // About's position decides where its view begins, so a reflow moves the line.
  new ResizeObserver(schedule).observe(intro);
  document.addEventListener('keydown', event => {
    // Escape climbs back to the wall from the writing below it.
    if (event.key === 'Escape' && isHome() && scrollY > 1) {
      scrollTo({ top: 0, behavior: motion.matches ? 'instant' : 'smooth' });
    }
  });
  updateHome(document.documentElement.dataset.project);
  if (isHome()) {
    scrollTo({ top: homeScrollTop(location.hash === '#about' ? 'about' : 'projects'), behavior: 'instant' });
    render();
  }
}
