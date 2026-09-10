import { mountMedia } from './media.js';
import { homeScrollTop } from './home.js';

const prefix = window.__PATH_PREFIX__ || '';
const homePath = `${prefix}/`;
const projects = new Map((window.__PROJECTS_DATA__ || []).map(project => [`${prefix}/${project.slug}/`, project]));
const metadataSelector = 'title, meta[name="description"], link[rel="canonical"], meta[property^="og:"], meta[name^="twitter:"], script[type="application/ld+json"], link[data-hero-preload]';
const normalized = path => path === `${prefix}/index.html` || path === prefix ? homePath : path.endsWith('/') ? path : `${path}/`;

function snapshot(doc) {
  const projectsElement = doc.querySelector('#projects');
  const collection = doc.querySelector('#strips');
  if (!projectsElement || !collection || !doc.querySelector('#intro') || !doc.querySelector('link[rel="canonical"]')) throw new Error('This page could not be loaded.');
  return { content: projectsElement.innerHTML, collection: collection.innerHTML, metadata: [...doc.querySelectorAll(metadataSelector)].map(el => el.outerHTML).join('') };
}

class Router {
  constructor() {
    this.currentPath = normalized(location.pathname);
    this.cache = new Map([[this.currentPath, snapshot(document)]]);
    this.generation = 0;
    this.controller = null;
    this.pending = false;
    this.homeReturn = null;
    this.onCommit = () => {};
  }

  init(onCommit) {
    this.onCommit = onCommit;
    history.scrollRestoration = 'manual';
    history.replaceState({ ...history.state, route: this.currentPath }, '', location.href);
    this.savePosition();
    let frame;
    addEventListener('scroll', () => {
      if (frame || this.pending) return;
      frame = requestAnimationFrame(() => { frame = null; if (!this.pending) this.savePosition(); });
    }, { passive: true });
    document.addEventListener('focusin', () => { if (!this.pending) this.savePosition(); });
    addEventListener('popstate', event => {
      this.navigate(location.href, { history: 'pop', restore: event.state });
    });
    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest('a[href]');
      if (!anchor || anchor.target || anchor.hasAttribute('download') || anchor.id === 'navigation-fallback') return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin || url.search) return;
      const path = normalized(url.pathname);
      if (path !== homePath && !projects.has(path)) return;
      if (path === this.currentPath && url.hash && !anchor.hasAttribute('data-home-link') && !this.pending) return;
      event.preventDefault();
      this.navigate(url.href, { returnToCollection: anchor.hasAttribute('data-home-link') });
    });
    addEventListener('spa-navigate', event => { this.navigate(event.detail.path); });
    document.getElementById('navigation-retry').addEventListener('click', () => this.navigate(this.failedPath));
    document.getElementById('navigation-dismiss').addEventListener('click', () => {
      this.setStatus('');
      document.getElementById('main').focus({ preventScroll: true });
    });
  }

  position() {
    return {
      scrollY, stripScrollLeft: document.getElementById('strips').scrollLeft, focusId: document.activeElement?.id || '',
    };
  }

  savePosition() {
    history.replaceState({ ...history.state, route: this.currentPath, ...this.position() }, '', location.href);
  }

  setStatus(message, error = false) {
    document.getElementById('navigation-status').hidden = !message;
    document.getElementById('navigation-message').textContent = message;
    document.getElementById('navigation-actions').hidden = !error;
    document.getElementById('main').setAttribute('aria-busy', String(this.pending));
  }

  async navigate(target, options = {}) {
    const url = new URL(target, location.href);
    const path = normalized(url.pathname);
    if (url.origin !== location.origin || (path !== homePath && !projects.has(path))) return;
    const generation = ++this.generation;
    this.controller?.abort();
    this.controller = new AbortController();
    const isPop = options.history === 'pop';
    const previousProject = projects.get(this.currentPath);
    const currentPosition = this.position();
    if (!isPop) {
      this.savePosition();
      if (this.currentPath === homePath && path !== homePath) this.homeReturn = currentPosition;
      if (location.pathname !== path || location.hash !== url.hash) history.pushState({ route: path }, '', path + url.hash);
    }
    const restore = options.restore || (options.returnToCollection ? this.homeReturn : null);
    this.pending = true;
    this.setStatus(`Opening ${projects.get(path)?.title || 'projects'}…`);
    try {
      let page = this.cache.get(path);
      if (!page) {
        const response = await fetch(path, { signal: this.controller.signal });
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        page = snapshot(doc);
        if (projects.has(path) && doc.querySelector('#projects .project')?.id !== projects.get(path).slug) throw new Error('The requested project was not returned.');
      }
      if (generation !== this.generation) return;
      this.cache.set(path, page);
      this.currentPath = path;
      const project = projects.get(path);
      const container = document.getElementById('projects');
      container.innerHTML = page.content;
      document.getElementById('strips').innerHTML = page.collection;
      const metadata = document.createElement('template');
      metadata.innerHTML = page.metadata;
      document.querySelectorAll(metadataSelector).forEach(el => el.remove());
      document.head.append(metadata.content);
      document.body.dataset.route = project ? 'project' : 'home';
      document.getElementById('intro').hidden = !!project;
      document.getElementById('header').hidden = !project;
      const titleLink = document.getElementById('header-toggle');
      titleLink.textContent = project?.title || '';
      titleLink.setAttribute('aria-label', project ? `${project.title} — Return to projects` : 'Return to projects');
      document.getElementById('collection-title').textContent = project ? 'More projects' : 'Projects';
      if (project) document.documentElement.dataset.project = project.slug;
      else delete document.documentElement.dataset.project;
      if (project?.color) document.documentElement.style.setProperty('--project-color', project.color);
      else document.documentElement.style.removeProperty('--project-color');
      this.onCommit(project?.slug);
      mountMedia(container);
      this.pending = false;
      this.setStatus('');
      let focus;
      if (restore?.focusId) focus = document.getElementById(restore.focusId);
      if (focus?.closest('[hidden]')) focus = null;
      if (!focus && project) focus = container.querySelector('.project-title');
      if (!focus && options.returnToCollection && previousProject) focus = document.getElementById(`strip-${previousProject.slug}`);
      focus ||= document.getElementById('home-title');
      focus.focus({ preventScroll: true });
      if (restore && typeof restore.scrollY === 'number') scrollTo({ top: restore.scrollY, behavior: 'instant' });
      else if (!project) scrollTo({ top: homeScrollTop(['#about', '#intro'].includes(url.hash) ? 'about' : 'projects'), behavior: 'instant' });
      else if (url.hash === '#collection') {
        (focus.classList.contains('strip') ? focus : document.getElementById('collection')).scrollIntoView({ block: 'start' });
      } else scrollTo({ top: 0, behavior: 'instant' });
      if (restore && typeof restore.stripScrollLeft === 'number') document.getElementById('strips').scrollLeft = restore.stripScrollLeft;
      else if (!project && focus.classList.contains('strip')) {
        const strips = document.getElementById('strips');
        strips.scrollLeft = focus.offsetLeft - (strips.clientWidth - focus.clientWidth) / 2;
      }
      this.savePosition();
      document.getElementById('route-announcer').textContent = `Opened ${project?.title || 'home'}`;
    } catch (error) {
      if (generation !== this.generation || error.name === 'AbortError') return;
      this.pending = false;
      this.failedPath = path;
      // Preserve the readable page and its URL while offering explicit recovery.
      history.replaceState({ route: this.currentPath, ...currentPosition }, '', this.currentPath);
      document.getElementById('navigation-fallback').href = path;
      this.setStatus(`Couldn’t open ${projects.get(path)?.title || 'the homepage'}. Please try again.`, true);
      document.getElementById('navigation-retry').focus({ preventScroll: true });
    }
  }
}

export const router = new Router();
