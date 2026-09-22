const header = document.getElementById('home-header');

const isHome = () => document.body.dataset.route === 'home';

// The landing is one screen: About and the links across the top, the wall
// filling what they leave, the categories at its foot. There is no second view
// to scroll to, so the wall view is simply what the landing always shows.
export function homeScrollTop() {
  return 0;
}

export function updateHome(slug) {
  header.hidden = !!slug;
  if (slug) delete document.body.dataset.homeView;
  else document.body.dataset.homeView = 'projects';
}

// On pointer desktops About starts folded to its first sentence. The folded
// text is inert so its links are neither tabbed to nor read out, and the fold
// lifts on its own where the stylesheet shows the whole text anyway.
function initIntroFold() {
  const intro = document.getElementById('intro');
  const toggle = intro?.querySelector('.intro-toggle');
  const more = document.getElementById('intro-more');
  if (!toggle || !more) return;
  const folds = matchMedia('(min-width: 769px) and (hover: hover)');
  const apply = () => {
    const open = intro.hasAttribute('data-open');
    more.inert = folds.matches && !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Less' : 'More';
  };
  toggle.addEventListener('click', () => {
    intro.toggleAttribute('data-open');
    apply();
  });
  folds.addEventListener('change', apply);
  apply();
}

export function initializeHome() {
  updateHome(document.documentElement.dataset.project);
  initIntroFold();
  if (isHome()) scrollTo({ top: 0, behavior: 'instant' });
}
