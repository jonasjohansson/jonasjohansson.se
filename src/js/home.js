const content = document.getElementById('content');
const intro = document.getElementById('intro');
const header = document.getElementById('home-header');
const toggle = document.getElementById('about-toggle');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let frame;
let focusIntro = false;

const isHome = () => document.body.dataset.route === 'home';
const distance = () => Math.max(1, content.offsetHeight - innerHeight);

function render() {
  frame = null;
  if (!isHome()) return;
  const progress = Math.max(0, Math.min(1, scrollY / distance()));
  const revealed = progress >= 0.99;
  content.style.setProperty('--home-reveal', progress);
  toggle.textContent = progress > 0.01 ? 'Projects' : 'About';
  toggle.setAttribute('aria-expanded', String(revealed));
  if (!revealed && intro.contains(document.activeElement)) toggle.focus({ preventScroll: true });
  intro.inert = !revealed;
  intro.setAttribute('aria-hidden', String(!revealed));
  if (revealed && focusIntro) {
    intro.focus({ preventScroll: true });
    focusIntro = false;
  }
}

function reveal(open) {
  focusIntro = open;
  if (!open && intro.contains(document.activeElement)) toggle.focus({ preventScroll: true });
  scrollTo({ top: open ? distance() : 0, behavior: motion.matches ? 'instant' : 'smooth' });
}

export function updateHome(slug) {
  header.hidden = !!slug;
  focusIntro = false;
  if (slug) {
    intro.inert = false;
    intro.removeAttribute('aria-hidden');
    content.style.removeProperty('--home-reveal');
  } else render();
}

export function initializeHome() {
  toggle.hidden = false;
  toggle.addEventListener('click', () => reveal(scrollY <= 1));
  document.getElementById('home-link').addEventListener('click', event => {
    if (!isHome() || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    reveal(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isHome() && scrollY > 0) reveal(false);
  });
  const schedule = () => {
    if (!frame && isHome()) frame = requestAnimationFrame(render);
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  updateHome(document.documentElement.dataset.project);
}
