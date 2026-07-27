import { SETTINGS } from "./config/settings.js";
import { sortByHue } from "./gameMode/hueSort.js";
const {
  animation: { stripInitialDelayStep, stripInitialDuration },
  images: { loadMargin },
} = SETTINGS;
import { getProjectPath } from "./utils/pathBuilder.js";
import { getCurrentRoute } from "./utils/routeUtils.js";
import { getCurrentProjectTitle, setCurrentProjectTitle } from "./utils/state.js";
import { scrambleText } from "./utils/textScramble.js";
import { initAnimation, throttledHandlePoint } from "./stripAnimation.js";
import { attachStripEventListeners, attachTouchListeners, initInteractionRefs } from "./stripInteraction.js";
import { resetFilters, filterProjects, initFilters, initFilteringRefs } from "./stripFiltering.js";

const projects = window.__PROJECTS_DATA__ || [];

// Respect reduced-motion: don't autoplay the looping strip videos.
const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
function playStripVideos(root) {
  if (prefersReducedMotion) return;
  root.querySelectorAll(".strip-video").forEach((v) => v.play().catch(() => {}));
}

// Preload cache for faster navigation
export const preloadCache = new Map();

function preloadProject(slug) {
  if (preloadCache.has(slug)) return;

  const fetchPath = getProjectPath(slug);
  fetch(fetchPath)
    .then((response) => response.text())
    .then((html) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const projectContent = doc.querySelector("#projects");
      if (projectContent) {
        preloadCache.set(slug, projectContent.innerHTML);
      }
    })
    .catch((error) => console.warn("Preload failed for", slug, error));
}

// ---------- DOM Elements ----------
let stripsContainer;
let allStrips = [];
let stripImages = [];
let navigationTimeoutId = null;

// ---------- Global State ----------
let headerSubtitle;
let defaultSubtitle = "PROGRESS NOT PERFECTION";

// Navigate function injected by main.js to avoid circular dependency
let _navigateFn = null;
export function setNavigateFn(fn) { _navigateFn = fn; }

// ---------- Cleanup for event listeners ----------
let cleanupController = null;

// Image observer for lazy loading
const imageObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const bgImage = img.getAttribute("data-bg-image");
        if (bgImage && !img.style.backgroundImage) {
          img.style.backgroundImage = `url('${bgImage}')`;
          img.classList.add("loaded");
        }
      }
    });
  },
  {
    root: stripsContainer,
    rootMargin: loadMargin,
    threshold: 0,
  }
);

// iOS Safari viewport height fix (no-op, CSS handles sizing now)
function setStripsHeight() {
}

// Shared helper to insert strips into DOM after shuffle
function insertStripsIntoDOM(shuffledStrips, container) {
  const fragment = document.createDocumentFragment();
  shuffledStrips.forEach((strip, index) => {
    strip.setAttribute("data-index", index);
    strip.style.setProperty("--strip-index", String(index));
    strip.classList.remove("strip-visible");

    fragment.appendChild(strip);
  });
  container.appendChild(fragment);
}

// Animate strips in one after another (delays live in CSS, keyed off --strip-index)
function animateStripsIn(shuffledStrips, container) {
  shuffledStrips.forEach((strip) => {
    strip.classList.add("strip-visible");
  });

  container.classList.add("strips-initialized");
  document.body.classList.add("strips-initialized");
  document.documentElement.classList.remove("transition-lock");
  playStripVideos(container);

  if (prefersReducedMotion || !shuffledStrips.length) return;

  container.classList.add("strips-entering");

  // Drop the class once the last strip has landed, so hover transforms aren't
  // fighting a finished animation. The timeout is a safety net for the case
  // where animationend never fires (strip removed, tab backgrounded).
  const endEntering = () => container.classList.remove("strips-entering");
  const lastStrip = shuffledStrips[shuffledStrips.length - 1];
  lastStrip.addEventListener("animationend", endEntering, { once: true });
  const totalMs = stripInitialDuration + stripInitialDelayStep * shuffledStrips.length;
  setTimeout(endEntering, totalMs + 500);
}

// ---------- Initialize Strips ----------
export function initializeStrips({ animate = true } = {}) {
  // Clean up previous listeners to prevent accumulation
  if (cleanupController) cleanupController.abort();
  cleanupController = new AbortController();
  const { signal } = cleanupController;

  // Disconnect observer to prevent stale observations
  imageObserver.disconnect();

  stripsContainer = document.getElementById("strips");
  allStrips = Array.from(stripsContainer?.querySelectorAll(".strip") || []);
  stripImages = Array.from(stripsContainer?.querySelectorAll(".strip-image") || []);

  // Initialize sub-modules
  initAnimation(stripsContainer);
  initInteractionRefs({
    stripsContainer,
    getAllStrips: () => allStrips,
    getHeaderSubtitle: () => headerSubtitle,
    getCurrentPageTitle: () => getCurrentProjectTitle() || defaultSubtitle,
    setCurrentPageTitle: (title) => { setCurrentProjectTitle(title); },
    getNavigationTimeoutId: () => navigationTimeoutId,
    setNavigationTimeoutId: (id) => { navigationTimeoutId = id; },
    preloadProject,
    navigate: (path) => _navigateFn?.(path),
  });
  initFilteringRefs(
    stripsContainer,
    () => allStrips,
    () => navigationTimeoutId,
    () => {
      if (navigationTimeoutId) {
        clearTimeout(navigationTimeoutId);
        navigationTimeoutId = null;
      }
    }
  );

  const hasInitialized = stripsContainer.classList.contains("strips-initialized");

  let shuffledStrips;
  if (!hasInitialized) {
    stripsContainer.classList.remove("strips-initialized");
    stripsContainer.style.display = "none";

    // The filter is pinned first and the unmade work trails at the end,
    // whichever ordering the finished projects between them get.
    const filterStrips = allStrips.filter((s) => s.classList.contains("strip-filter"));
    const placeholderStrips = allStrips.filter((s) => s.classList.contains("strip-placeholder"));
    const madeStrips = allStrips.filter(
      (s) => !s.classList.contains("strip-placeholder") && !s.classList.contains("strip-filter")
    );

    // Landing page: random order on every reload. Elsewhere: keep the hue sort.
    let orderedStrips;
    if (getCurrentRoute() === "project") {
      orderedStrips = sortByHue(madeStrips, projects);
    } else {
      orderedStrips = [...madeStrips];
      for (let i = orderedStrips.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [orderedStrips[i], orderedStrips[j]] = [orderedStrips[j], orderedStrips[i]];
      }
    }
    shuffledStrips = [...filterStrips, ...orderedStrips, ...placeholderStrips];

    shuffledStrips.forEach((strip) => {
      strip.remove();
      strip.removeAttribute("data-index");
      strip.style.removeProperty("--strip-index");
      strip.style.removeProperty("height");
      strip.style.removeProperty("opacity");
      strip.style.removeProperty("transform");
      strip.style.removeProperty("animation");
    });


    stripsContainer.style.display = "";

    requestAnimationFrame(() => {
      insertStripsIntoDOM(shuffledStrips, stripsContainer);

      allStrips = shuffledStrips;
      stripImages = Array.from(stripsContainer.querySelectorAll(".strip-image"));

      // Lazy-load images via IntersectionObserver instead of preloading all
      stripImages.forEach((img) => imageObserver.observe(img));

      attachStripEventListeners();
      if (animate) {
        animateStripsIn(shuffledStrips, stripsContainer);
      } else {
        shuffledStrips.forEach((strip) => strip.classList.add("strip-visible"));
        stripsContainer.classList.add("strips-initialized");
        document.body.classList.add("strips-initialized");
      }
      playStripVideos(stripsContainer);
      // Recount now that the strips are back in the document — the count reads
      // computed styles, which say nothing while the nodes are detached.
      filterProjects();
    });
  } else {
    stripImages = Array.from(stripsContainer.querySelectorAll(".strip-image"));

    setStripsHeight();

    const isProjectPage = getCurrentRoute() === "project";
    const loadImage = (img) => {
      const bgImage = img.getAttribute("data-bg-image");
      if (bgImage && !img.style.backgroundImage) {
        img.style.backgroundImage = `url('${bgImage}')`;
        img.classList.add("loaded");
      }
    };

    if (isProjectPage) {
      stripImages.forEach(loadImage);
    } else {
      stripImages.slice(0, 4).forEach(loadImage);
      stripImages.slice(4).forEach((img) => imageObserver.observe(img));
    }
    playStripVideos(stripsContainer);
  }

  headerSubtitle = document.querySelector(".header-subtitle");

  const baseName = window.__SITE_TITLE__ || "Jonas Johansson";
  document.title = baseName;

  function resolveCurrentTitle() {
    const fromState = getCurrentProjectTitle()?.trim();
    if (fromState) return fromState;

    const fromDataset = document.documentElement?.dataset?.currentProjectTitle?.trim();
    if (fromDataset) return fromDataset;

    // Fallback: infer from URL
    const slug = window.location.pathname.match(/\/work\/([^\/]+)/)?.[1];
    const project = slug ? projects.find((p) => p.slug === slug) : null;
    return project?.title || defaultSubtitle;
  }

  const initialTitle = resolveCurrentTitle();
  if (initialTitle && initialTitle !== defaultSubtitle) {
    setCurrentProjectTitle(initialTitle);
    if (headerSubtitle) {
      headerSubtitle.textContent = initialTitle.toUpperCase();
    }
  }

  // Attach parallax and touch event listeners (using signal for cleanup)
  stripsContainer.addEventListener("pointermove", throttledHandlePoint, { signal });
  attachTouchListeners();

  // Update strip count (via filtering module)
  filterProjects();

  setStripsHeight();

  // Resize / scroll / orientation handlers (using signal for cleanup)
  let resizeTimeout;
  let scrollTimeout;

  window.addEventListener("resize", () => {
    if (stripsContainer) {
      setStripsHeight();
      stripsContainer.classList.add("resizing");
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        stripsContainer.classList.remove("resizing");
      }, 100);
    }
  }, { signal });

  window.addEventListener("scroll", () => {
    if (stripsContainer) {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setStripsHeight();
      }, 50);
    }
  }, { passive: true, signal });

  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      setStripsHeight();
    }, 100);
  }, { signal });
}

// Function to update the header subtitle
function updateCurrentPageTitle(title) {
  try {
    const baseName = window.__SITE_TITLE__ || "Jonas Johansson";
    document.title = baseName;

    const newTitle = title === null ? defaultSubtitle : (title || defaultSubtitle);

    document.documentElement.dataset.currentProjectTitle = newTitle;
    setCurrentProjectTitle(newTitle);

    if (title === null) {
      if (headerSubtitle) {
        scrambleText(headerSubtitle, defaultSubtitle);
      }
      return;
    }

    if (getCurrentRoute() === "project") {
      if (headerSubtitle) {
        scrambleText(headerSubtitle, newTitle);
      }
    }
  } catch (error) {
    // Silently handle errors
  }
}

export { resetFilters, updateCurrentPageTitle, initFilters };
