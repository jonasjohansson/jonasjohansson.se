import { shuffle } from "./utils/helpers.js";
import { SETTINGS } from "./config/settings.js";
const {
  animation: { stripInitialDelayStep, stripInitialDuration },
  images: { loadMargin },
} = SETTINGS;
import { ColorExtractor } from "./utils/colorExtractor.js";
import { getProjectPath } from "./utils/pathBuilder.js";
import { getCurrentProjectTitle, setCurrentProjectTitle } from "./utils/state.js";
import { initAnimation, throttledHandlePoint } from "./stripAnimation.js";
import { attachStripEventListeners, attachTouchListeners, initInteractionRefs } from "./stripInteraction.js";
import { resetFilters, filterProjects, initFilters, initFilteringRefs } from "./stripFiltering.js";

const projects = window.__PROJECTS_DATA__ || [];

// Color extraction
const colorExtractor = new ColorExtractor();

// Preload cache for faster navigation
const preloadCache = new Map();
window.preloadCache = preloadCache;

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

// Color helpers
const normalizeImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return `/${url}`;
};

const applyColorsToCSS = (dominantColor) => {
  const lightColor = colorExtractor.adjustBrightness(dominantColor, 1.3);
  const darkColor = colorExtractor.adjustBrightness(dominantColor, 0.7);
  document.documentElement.style.setProperty("--project-accent-color", dominantColor);
  document.documentElement.style.setProperty("--project-accent-color-light", lightColor);
  document.documentElement.style.setProperty("--project-accent-color-dark", darkColor);
};

async function applyProjectColor(project) {
  if (!project?.images?.[0]) return;
  const imageUrl = typeof project.images[0] === "string" ? project.images[0] : project.images[0].src;
  await applyProjectColorFromImageUrl(imageUrl);
}

async function applyProjectColorFromImageUrl(imageUrl) {
  try {
    const absoluteUrl = normalizeImageUrl(imageUrl);
    if (!absoluteUrl) return;
    const dominantColor = await colorExtractor.extractDominantColor(absoluteUrl);
    applyColorsToCSS(dominantColor);
  } catch (err) {
    console.warn("Failed to extract color:", err);
  }
}

// ---------- DOM Elements ----------
let stripsContainer;
let allStrips = [];
let stripImages = [];
let navigationTimeoutId = null;

// ---------- Global State ----------
let headerSubtitle;
let defaultSubtitle = "PROGRESS NOT PERFECTION";
let aboutOverlayEl = null;

// Navigate function injected by main.js to avoid circular dependency
let _navigateFn = null;
export function setNavigateFn(fn) { _navigateFn = fn; }

// ---------- Cleanup for event listeners ----------
let cleanupController = null;

function getAboutOverlay() {
  if (aboutOverlayEl && document.body.contains(aboutOverlayEl)) {
    return aboutOverlayEl;
  }
  aboutOverlayEl = document.getElementById("about");
  return aboutOverlayEl;
}

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

// iOS Safari viewport height fix
function setStripsHeight() {
  if (!stripsContainer) return;
  const vh = Math.max(window.innerHeight, document.documentElement.clientHeight || window.innerHeight);
  stripsContainer.style.height = `${vh}px`;
  allStrips.forEach((strip) => {
    strip.style.height = `${vh}px`;
  });
}

// Shared helper to insert strips into DOM after shuffle
function insertStripsIntoDOM(shuffledStrips, container, vh) {
  const fragment = document.createDocumentFragment();
  shuffledStrips.forEach((strip, index) => {
    strip.setAttribute("data-index", index);
    strip.style.setProperty("--strip-index", String(index));
    strip.style.height = `${vh}px`;
    strip.classList.remove("strip-visible");

    const stripImage = strip.querySelector(".strip-image");
    if (stripImage) {
      const bgImage = stripImage.getAttribute("data-bg-image");
      if (bgImage) {
        stripImage.style.backgroundImage = `url('${bgImage}')`;
        stripImage.classList.add("loaded");
      }
    }

    fragment.appendChild(strip);
  });
  container.appendChild(fragment);
}

// Animate strips in with staggered delay
function animateStripsIn(shuffledStrips, container) {
  const totalStrips = shuffledStrips.length;
  const lastStripDelay = (totalStrips - 1) * stripInitialDelayStep;
  const totalAnimationTime = lastStripDelay + stripInitialDuration;

  shuffledStrips.forEach((strip, index) => {
    setTimeout(() => {
      strip.classList.add("strip-visible");
    }, index * stripInitialDelayStep);
  });

  setTimeout(() => {
    container.classList.add("strips-initialized");
    document.body.classList.add("strips-initialized");
  }, totalAnimationTime + 50);
}

// ---------- Initialize Strips ----------
export function initializeStrips() {
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
    getAboutOverlay,
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

    shuffledStrips = shuffle([...allStrips]);

    shuffledStrips.forEach((strip) => {
      strip.remove();
      strip.removeAttribute("data-index");
      strip.style.removeProperty("--strip-index");
      strip.style.removeProperty("height");
      strip.style.removeProperty("opacity");
      strip.style.removeProperty("transform");
      strip.style.removeProperty("animation");
    });

    const vh = Math.max(window.innerHeight, document.documentElement.clientHeight || window.innerHeight);
    stripsContainer.style.height = `${vh}px`;

    const preloadAllImages = async () => {
      const imageData = shuffledStrips.map((strip) => {
        const stripImage = strip.querySelector(".strip-image");
        const bgImage = stripImage?.getAttribute("data-bg-image");
        return { strip, stripImage, bgImage };
      });

      const imagePromises = imageData.map(({ bgImage }) => {
        if (!bgImage) return Promise.resolve();
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = bgImage;
        });
      });

      await Promise.all(imagePromises);

      stripsContainer.style.display = "";

      requestAnimationFrame(() => {
        insertStripsIntoDOM(shuffledStrips, stripsContainer, vh);

        allStrips = shuffledStrips;
        stripImages = Array.from(stripsContainer.querySelectorAll(".strip-image"));
        attachStripEventListeners();
        animateStripsIn(shuffledStrips, stripsContainer);
      });
    };

    preloadAllImages().catch((err) => {
      console.warn("Error preloading images:", err);
      stripsContainer.style.display = "";

      insertStripsIntoDOM(shuffledStrips, stripsContainer, vh);

      allStrips = shuffledStrips;
      stripImages = Array.from(stripsContainer.querySelectorAll(".strip-image"));
      attachStripEventListeners();
      animateStripsIn(shuffledStrips, stripsContainer);
    });
  } else {
    stripImages = Array.from(stripsContainer.querySelectorAll(".strip-image"));

    setStripsHeight();

    const isProjectPage = window.location.pathname.includes("/work/");
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
        headerSubtitle.textContent = defaultSubtitle.toUpperCase();
      }
      return;
    }

    if (window.location.pathname.includes("/work/")) {
      if (headerSubtitle) {
        headerSubtitle.textContent = newTitle.toUpperCase();
      }
    }
  } catch (error) {
    // Silently handle errors
  }
}

export { resetFilters, applyProjectColor, updateCurrentPageTitle, initFilters };
