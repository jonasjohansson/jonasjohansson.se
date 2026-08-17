import { SETTINGS } from "./config/settings.js";
import { sortByHue } from "./gameMode/hueSort.js";
const {
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
const siteName = window.__SITE_TITLE__ || "Jonas Johansson";

// What the header reads when no strip is hovered. On a project page it depends
// on where the header currently sits: at the top of the page it titles what
// you're reading; docked at the foot of the wall it's the way home, so it
// carries the site name instead of repeating the project.
function getRestingTitle() {
  if (getCurrentRoute() !== "project") return siteName;

  const header = document.getElementById("header");
  if (header?.classList.contains("header-bottom")) return siteName;

  return (
    getCurrentProjectTitle()?.trim() ||
    document.documentElement?.dataset?.currentProjectTitle?.trim() ||
    siteName
  );
}

// Re-render the resting title after the header docks or undocks on scroll.
export function refreshRestingTitle() {
  const el = document.querySelector(".header-subtitle");
  if (el) scrambleText(el, getRestingTitle());
}

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
    strip.classList.remove("strip-visible");

    fragment.appendChild(strip);
  });
  container.appendChild(fragment);
}

// Reveal the strips. No entrance animation — they simply appear.
function animateStripsIn(shuffledStrips, container) {
  shuffledStrips.forEach((strip) => {
    strip.classList.add("strip-visible");
  });

  container.classList.add("strips-initialized");
  document.body.classList.add("strips-initialized");
  document.documentElement.classList.remove("transition-lock");
  playStripVideos(container);
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
    getCurrentPageTitle: () => getRestingTitle(),
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

    // Placeholders are unmade work and always trail the finished projects,
    // whichever ordering the rest of the wall gets.
    const madeStrips = allStrips.filter((s) => !s.classList.contains("strip-placeholder"));
    const placeholderStrips = allStrips.filter((s) => s.classList.contains("strip-placeholder"));

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
    shuffledStrips = [...orderedStrips, ...placeholderStrips];

    // Clear inline state left by a previous run. The strips are deliberately
    // NOT detached here: insertStripsIntoDOM moves them through a
    // DocumentFragment, which reorders them in a single synchronous step.
    // Removing them and reattaching in a later frame left the wall empty in
    // between, and requestAnimationFrame does not fire in a tab that loaded
    // hidden — a cmd-clicked link, a session restored at startup — so the
    // strips never came back. It also set strips-initialized only in the async
    // tail, long after the guard in router.js reads it.
    shuffledStrips.forEach((strip) => {
      strip.removeAttribute("data-index");
      strip.style.removeProperty("height");
      strip.style.removeProperty("opacity");
      strip.style.removeProperty("transform");
      strip.style.removeProperty("animation");
    });

    stripsContainer.style.display = "";

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
    // Recount now that the strips are in their final order — the count reads
    // computed styles.
    filterProjects();
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

  if (headerSubtitle) {
    headerSubtitle.textContent = getRestingTitle().toUpperCase();
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

    const newTitle = title === null ? siteName : (title || siteName);

    // State still tracks the project you're on — only what the header *reads*
    // falls back to the resting title.
    document.documentElement.dataset.currentProjectTitle = newTitle;
    setCurrentProjectTitle(newTitle);

    if (headerSubtitle) {
      scrambleText(headerSubtitle, getRestingTitle());
    }
  } catch (error) {
    // Silently handle errors
  }
}

export { resetFilters, updateCurrentPageTitle, initFilters };
