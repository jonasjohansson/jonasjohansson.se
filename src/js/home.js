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

export function initializeHome() {
  updateHome(document.documentElement.dataset.project);
  if (isHome()) scrollTo({ top: 0, behavior: 'instant' });
}
