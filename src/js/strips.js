import { router } from "./router.js";
import { shuffle, clamp } from "./utils/helpers.js";
import { SETTINGS } from "./config/settings.js";
const {
  animation: { easeFactor, idleThresholdFrames, stripInitialDelayStep, stripInitialDuration, stripAppendDelayStep },
  images: { loadMargin },
} = SETTINGS;
import { ColorExtractor } from "./utils/colorExtractor.js";
import { createScrambler } from "./utils/scrambleText.js";
import { getProjectPath } from "./utils/pathBuilder.js";

// Get projects from window global (injected by 11ty)
import { getPathPrefix } from "./utils/routeUtils.js";

const projects = window.__PROJECTS_DATA__ || [];
const pathPrefix = getPathPrefix();

const filterCategories = (() => {
  const seen = new Set();
  const categories = [];

  projects.forEach((project) => {
    const tags = Array.isArray(project?.tags) ? project.tags : [];
    tags.forEach((tag) => {
      if (!tag) return;
      const normalized = String(tag).trim();
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      categories.push(normalized);
    });
  });

  categories.sort((a, b) => {
    if (a.length === b.length) {
      return a.localeCompare(b);
    }
    return a.length - b.length;
  });

  return categories;
})();

const filterCategorySet = new Set(filterCategories.map((tag) => tag.toLowerCase()));

// Simple color extraction and application
const colorExtractor = new ColorExtractor();

// Preload cache for faster navigation
const preloadCache = new Map();
window.preloadCache = preloadCache;

// Preload project content on hover
function preloadProject(slug) {
  if (preloadCache.has(slug)) return; // Already preloaded

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

// Helper to normalize image URL to absolute
const normalizeImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return `/${url}`;
};

// Helper to apply colors to CSS
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

// Apply accent color given a direct image URL (useful on SSR project pages)
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
// These will be populated when DOM is ready
let stripsContainer;
let allStrips = [];
let stripImages = [];
let navigationTimeoutId = null;

// ---------- Global State ----------
let headerSubtitle;
let defaultSubtitle = "PROGRESS NOT PERFECTION";
let currentPageTitle = defaultSubtitle;
let subtitleScrambler = null;
let aboutOverlayEl = null;
let subtitleResetTimeoutId = null;
let currentHoveredStrip = null;

function getAboutOverlay() {
  if (aboutOverlayEl && document.body.contains(aboutOverlayEl)) {
    return aboutOverlayEl;
  }
  aboutOverlayEl = document.getElementById("about");
  return aboutOverlayEl;
}

function getStripProjectTitle(strip) {
  if (!strip) return null;
  const dataTitle = strip.dataset?.projectTitle;
  if (dataTitle && dataTitle.trim()) {
    return dataTitle.trim();
  }
  const slug = strip.getAttribute("data-project");
  if (!slug) return null;
  const project = projects.find((p) => p.slug === slug);
  return project?.title || null;
}

function scrambleSubtitleForStrip(strip) {
  if (!strip || !subtitleScrambler || !headerSubtitle) return;
  const projectTitle = getStripProjectTitle(strip);
  if (!projectTitle) return;
  subtitleScrambler.scramble(projectTitle.toUpperCase());
}

function scheduleSubtitleReset(delay = 100) {
  if (subtitleResetTimeoutId) {
    clearTimeout(subtitleResetTimeoutId);
  }
  subtitleResetTimeoutId = setTimeout(() => {
    if (subtitleScrambler && headerSubtitle) {
      subtitleScrambler.scramble(currentPageTitle.toUpperCase());
    }
    subtitleResetTimeoutId = null;
  }, delay);
}

function handleStripPointerChange(strip) {
  if (strip === currentHoveredStrip) {
    return;
  }
  currentHoveredStrip = strip;

  if (subtitleResetTimeoutId) {
    clearTimeout(subtitleResetTimeoutId);
    subtitleResetTimeoutId = null;
  }

  if (currentHoveredStrip) {
    scrambleSubtitleForStrip(currentHoveredStrip);
    const slug = currentHoveredStrip.getAttribute("data-project");
    if (slug) {
      preloadProject(slug);
    }
  } else if (!navigationTimeoutId) {
    scheduleSubtitleReset();
  }
}

function initStripHoverTracking() {
  if (!stripsContainer) return;
  if (stripsContainer.dataset.hoverTracking === "true") return;

  const pointerMoveHandler = (e) => {
    if (!stripsContainer.classList.contains("strips-initialized")) {
      return;
    }
    const aboutOverlay = getAboutOverlay();
    if (aboutOverlay && aboutOverlay.classList.contains("visible")) {
      return;
    }

    const targetStrip = e.target?.closest?.(".strip");
    handleStripPointerChange(targetStrip || null);
  };

  const pointerLeaveHandler = () => {
    if (navigationTimeoutId) {
      return;
    }
    handleStripPointerChange(null);
  };

  stripsContainer.addEventListener("pointermove", pointerMoveHandler);
  stripsContainer.addEventListener("pointerleave", pointerLeaveHandler);
  stripsContainer.dataset.hoverTracking = "true";
}

// ---------- State ----------
let curX = 0.5,
  curY = 0.5; // eased cursor (0..1)
let targetX = 0.5,
  targetY = 0.5; // instantaneous cursor (0..1)

// ---------- Input ----------
function handlePoint(clientX, clientY) {
  const rect = stripsContainer.getBoundingClientRect();
  const nx = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  const ny = clamp((clientY - rect.top) / Math.max(1, rect.height), 0, 1);
  targetX = nx;
  targetY = ny;
}

// Throttle mouse movement for better performance
let rafId = null;
function throttledHandlePoint(e) {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    handlePoint(e.clientX, e.clientY);
    // Resume animation when mouse moves
    isAnimating = true;
    idleFrames = 0;
    rafId = null;
  });
}

// Event listeners will be attached after initialization

// ---------- Animation ----------
// Track visible strips for optimization
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

// Strip images will be observed after initialization

// Track last position to avoid unnecessary updates
let lastPosX = -1;
let lastPosY = -1;
let isAnimating = true;
let idleFrames = 0;

function tick() {
  const prevX = curX;
  const prevY = curY;

  curX += (targetX - curX) * easeFactor;
  curY += (targetY - curY) * easeFactor;

  // Check if movement is significant enough to update
  const deltaX = Math.abs(curX - prevX);
  const deltaY = Math.abs(curY - prevY);
  const hasMovement = deltaX > 0.0001 || deltaY > 0.0001;

  if (!hasMovement) {
    idleFrames++;
    // Stop animating after idle threshold to save CPU
    if (idleFrames > idleThresholdFrames && isAnimating) {
      isAnimating = false;
    }
  } else {
    idleFrames = 0;
    if (!isAnimating) {
      isAnimating = true;
    }
  }

  // Update cursor position as CSS custom properties
  if (hasMovement && isAnimating) {
    const posX = (curX * 100).toFixed(1);
    const posY = (curY * 100).toFixed(1);

    // Only update if position actually changed
    if (posX !== lastPosX || posY !== lastPosY) {
      if (posX !== lastPosX) {
        stripsContainer.style.setProperty("--cursor-x", `${posX}%`);
        lastPosX = posX;
      }
      if (posY !== lastPosY) {
        stripsContainer.style.setProperty("--cursor-y", `${posY}%`);
        lastPosY = posY;
      }
    }
  }

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

// ---------- Filtering Logic ----------
function getSelectedFilters() {
  const tags = Array.from(document.querySelectorAll('.filter-dropdown-content input[type="checkbox"]:checked'))
    .map((cb) => cb.value)
    .filter((value) => filterCategorySet.has(String(value).toLowerCase()));
  return { tags };
}

function resetFilters() {
  document.querySelectorAll('.filter-dropdown-content input[type="checkbox"]:checked').forEach((cb) => {
    cb.checked = false;
  });
  filterProjects(); // Reuse filterProjects to reset state
}

function filterProjects() {
  const { tags } = getSelectedFilters();
  const hasFilters = tags.length > 0;

  // Toggle filter state
  document.body?.classList.toggle("filter-active", hasFilters);
  stripsContainer?.classList.toggle("filtered", hasFilters);

  // Process strips
  allStrips?.forEach((strip) => {
    if (!strip) return;

    if (!hasFilters) {
      strip.classList.remove("filter-match");
      return;
    }

    const stripTags = strip.getAttribute("data-tags");
    if (!stripTags) {
      strip.classList.remove("filter-match");
      return;
    }

    const stripTagsLower = stripTags.split(",").map((t) => t.trim().toLowerCase());
    const selectedTagsLower = tags.map((t) => t.toLowerCase());
    const hasMatch = selectedTagsLower.some((tag) => stripTagsLower.includes(tag));

    strip.classList.toggle("filter-match", hasMatch);
  });

  updateStripCount();
  lastPosX = lastPosY = -1;
  isAnimating = true;
}

// Update the number of visible strips for dynamic grid sizing
function updateStripCount() {
  const visibleStrips = Array.from(allStrips).filter((strip) => {
    const computedStyle = window.getComputedStyle(strip);
    return computedStyle.display !== "none" && !strip.classList.contains("hidden");
  });

  const visibleCount = visibleStrips.length;
  const totalProjects = projects.length;

  // Set data attribute for CSS to use
  stripsContainer.setAttribute("data-visible-count", visibleCount);

  // Update CSS custom properties for dynamic calculations
  document.documentElement.style.setProperty("--visible-strip-count", visibleCount);
}

// iOS Safari viewport height fix
function setStripsHeight() {
  if (!stripsContainer) return;

  // Use actual viewport height for iOS Safari
  // Use the larger of window.innerHeight or document.documentElement.clientHeight
  // to handle address bar changes
  const vh = Math.max(window.innerHeight, document.documentElement.clientHeight || window.innerHeight);
  stripsContainer.style.height = `${vh}px`;

  // Also set individual strip heights
  allStrips.forEach((strip) => {
    strip.style.height = `${vh}px`;
  });
}

// Helper function to attach event listeners to strips
function attachStripEventListeners() {
  if (!stripsContainer) {
    console.warn("[Strips] No strips container found");
    return;
  }

  // Re-query strips from DOM to ensure we have the latest references
  const currentStrips = Array.from(stripsContainer.querySelectorAll(".strip"));
  if (!currentStrips || currentStrips.length === 0) {
    console.warn("[Strips] No strips found in container");
    return;
  }

  // Update allStrips reference to match DOM
  allStrips = currentStrips;

  allStrips.forEach((strip, index) => {
    const projectSlug = strip.getAttribute("data-project");
    if (!projectSlug) {
      return;
    }

    const project = projects.find((p) => p.slug === projectSlug);
    if (!project) {
      return;
    }

    // Ensure project title is stored on dataset for reliable lookup after shuffling
    strip.dataset.projectTitle = project.title || "";

    // Check if listeners are already attached using a data attribute
    // But allow re-attaching if strip was removed and re-added to DOM
    if (strip.dataset.listenersAttached === "true" && strip.parentNode === stripsContainer) {
      return; // Already attached and still in DOM
    }
    strip.dataset.listenersAttached = "true";

    strip.addEventListener("click", (e) => {
      if (document.body?.dataset?.filtering === "true") {
        return;
      }

      // Look up project fresh from strip's data attribute (strips may be shuffled)
      const clickedProjectSlug = strip.getAttribute("data-project");
      if (!clickedProjectSlug) {
        return;
      }

      const clickedProject = projects.find((p) => p.slug === clickedProjectSlug);
      if (!clickedProject) {
        return;
      }

      const computedId = clickedProject.slug || clickedProject.title.toLowerCase().replace(/\s+/g, "-");
      const projectPath = getProjectPath(computedId);

      // Update currentPageTitle immediately to prevent mouseleave from resetting to old value
      // This ensures the displayed text (from hover) matches the new project
      const clickedTitle = getStripProjectTitle(strip) || clickedProject.title || defaultSubtitle;
      currentPageTitle = clickedTitle;
      window.__CURRENT_PROJECT_TITLE__ = clickedTitle;
      document.documentElement.dataset.currentProjectTitle = clickedTitle;

      // Update scrambler text to match the clicked project
      if (subtitleScrambler) {
        subtitleScrambler.scramble(clickedTitle.toUpperCase());
      }

      strip.classList.add("selected");
      allStrips.forEach((s) => s !== strip && s.classList.add("not-selected"));
      if (navigationTimeoutId) {
        clearTimeout(navigationTimeoutId);
      }
      navigationTimeoutId = setTimeout(() => {
        router.navigate(projectPath);
        navigationTimeoutId = null;
      }, 600);
    });
  });
}

// ---------- Initialize Strips ----------
export function initializeStrips() {
  // Populate DOM references
  stripsContainer = document.getElementById("strips");
  allStrips = Array.from(stripsContainer?.querySelectorAll(".strip") || []);
  stripImages = Array.from(stripsContainer?.querySelectorAll(".strip-image") || []);

  // Track if strips have been initialized (to prevent animations on filter)
  const hasInitialized = stripsContainer.classList.contains("strips-initialized");

  // Shuffle strips on page load for variety (only on initial load)
  let shuffledStrips;
  if (!hasInitialized) {
    // Ensure the class is NOT present initially so animations can run
    stripsContainer.classList.remove("strips-initialized");

    // IMPORTANT: Hide strips container immediately to prevent any visible rendering
    // But use display: none instead to completely hide it
    stripsContainer.style.display = "none";

    shuffledStrips = shuffle([...allStrips]);

    // Remove all strips from DOM first to ensure clean re-insertion
    // Also clear ALL inline styles that might interfere
    shuffledStrips.forEach((strip) => {
      if (strip.parentNode) {
        strip.parentNode.removeChild(strip);
      }
      // Clear any data attributes and inline styles - CSS will handle all styling
      strip.removeAttribute("data-index");
      strip.style.removeProperty("--strip-index");
      strip.style.removeProperty("height");
      strip.style.removeProperty("opacity");
      strip.style.removeProperty("transform");
      strip.style.removeProperty("animation");
    });

    // Set height on container first (before adding strips)
    const vh = Math.max(window.innerHeight, document.documentElement.clientHeight || window.innerHeight);
    stripsContainer.style.height = `${vh}px`;

    // Preload ALL strip images before animating
    const preloadAllImages = async () => {
      // Store image URLs and strip images for later
      const imageData = shuffledStrips.map((strip) => {
        const stripImage = strip.querySelector(".strip-image");
        const bgImage = stripImage?.getAttribute("data-bg-image");
        return { strip, stripImage, bgImage };
      });

      // Preload all images - don't set background-image yet
      const imagePromises = imageData.map(({ bgImage }) => {
        if (!bgImage) return Promise.resolve();

        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null); // Continue even if image fails
          img.src = bgImage;
        });
      });

      // Wait for ALL images to load before doing anything
      await Promise.all(imagePromises);

      // Now that all images are loaded, make container visible and add strips
      stripsContainer.style.display = "";

      // Calculate animation timing
      const totalStrips = shuffledStrips.length;
      const lastStripDelay = (totalStrips - 1) * stripInitialDelayStep; // CSS animation delay per strip
      const animationDuration = stripInitialDuration; // CSS animation duration
      const totalAnimationTime = lastStripDelay + animationDuration;

      // Prepare strips in a fragment before appending
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

      requestAnimationFrame(() => {
        stripsContainer.appendChild(fragment);
        stripsContainer.getBoundingClientRect(); // ensure layout before transitions

        allStrips = shuffledStrips;
        stripImages = Array.from(stripsContainer?.querySelectorAll(".strip-image") || []);
        attachStripEventListeners();

        shuffledStrips.forEach((strip, index) => {
          setTimeout(() => {
            strip.classList.add("strip-visible");
          }, index * stripInitialDelayStep);
        });

        setTimeout(() => {
          stripsContainer.classList.add("strips-initialized");
          document.body.classList.add("strips-initialized");
        }, totalAnimationTime + 50);
      });
    };

    // Start preloading images - this will block until all are loaded
    preloadAllImages().catch((err) => {
      console.warn("Error preloading images:", err);
      // Even if preload fails, show strips
      stripsContainer.style.display = "";

      // Still add strips even if preload failed
      const fragment = document.createDocumentFragment();
      shuffledStrips.forEach((strip, index) => {
        strip.setAttribute("data-index", index);
        strip.style.setProperty("--strip-index", String(index));
        strip.style.height = `${vh}px`;
        strip.classList.remove("strip-visible");
        fragment.appendChild(strip);
      });
      stripsContainer.appendChild(fragment);

      // Try to set background images even if preload failed
      const allStripImages = Array.from(stripsContainer.querySelectorAll(".strip-image"));
      allStripImages.forEach((stripImage) => {
        const bgImage = stripImage.getAttribute("data-bg-image");
        if (bgImage) {
          stripImage.style.backgroundImage = `url('${bgImage}')`;
          stripImage.classList.add("loaded");
        }
      });

      allStrips = shuffledStrips;
      stripImages = allStripImages;

      // Attach event listeners now that strips are in the DOM
      attachStripEventListeners();

      shuffledStrips.forEach((strip, index) => {
        setTimeout(() => {
          strip.classList.add("strip-visible");
        }, index * stripInitialDelayStep);
      });

      // Mark as initialized after a delay
      const totalStrips = shuffledStrips.length;
      const lastStripDelay = (totalStrips - 1) * stripInitialDelayStep;
      const animationDuration = stripInitialDuration;
      setTimeout(() => {
        stripsContainer.classList.add("strips-initialized");
        // Add body class to trigger grain and shader fade-in
        document.body.classList.add("strips-initialized");
      }, lastStripDelay + animationDuration + 50);
    });
  } else {
    // On subsequent operations (like filtering), keep strips in current order
    shuffledStrips = allStrips;

    // Update references after shuffle
    allStrips = shuffledStrips;
    stripImages = Array.from(stripsContainer?.querySelectorAll(".strip-image") || []);

    // Update height after strips are set up
    setStripsHeight();

    // Progressive image loading - load all on project pages, eager-load first 4 on home
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

  // CSS animations handle strip entrance automatically
  // No JavaScript animation needed

  headerSubtitle = document.querySelector(".header-subtitle");

  if (headerSubtitle) {
    subtitleScrambler = createScrambler(headerSubtitle, {
      duration: 600,
      frameDelay: 30,
    });
    // Make it globally available for router
    window.subtitleScrambler = subtitleScrambler;
  }

  // Get base name from site.json
  const baseName = window.__SITE_TITLE__ || "Jonas Johansson";

  // Set title to just the name
  document.title = baseName;

  function getCurrentProjectTitle() {
    const fromDataset = document.documentElement?.dataset?.currentProjectTitle?.trim();
    if (fromDataset) return fromDataset;

    const fromWindow = window.__CURRENT_PROJECT_TITLE__?.trim();
    if (fromWindow) return fromWindow;

    // Fallback: infer from URL
    const slug = window.location.pathname.match(/\/work\/([^\/]+)/)?.[1];
    const project = slug ? projects.find((p) => p.slug === slug) : null;
    return project?.title || defaultSubtitle;
  }

  // Initialize currentPageTitle from current state if not already set
  // This ensures hover/mouseleave work correctly on project pages
  const initialTitle = getCurrentProjectTitle();
  if (initialTitle && initialTitle !== defaultSubtitle) {
    currentPageTitle = initialTitle;
    // Update scrambler text if available
    if (subtitleScrambler && initialTitle !== defaultSubtitle) {
      subtitleScrambler.scramble(initialTitle.toUpperCase());
    }
  }

  // Attach event listeners - always try to attach, function will check if already attached
  // Use requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    attachStripEventListeners();
    initStripHoverTracking();
  });

  // Attach mouse/touch event listeners for parallax effect
  stripsContainer.addEventListener("pointermove", throttledHandlePoint);

  // Touch handling for mobile - track which strip is being touched
  let currentlyTouchedStrip = null;
  let touchStartStrip = null;
  let hasMoved = false;

  // Track touch start for tap detection and scroll direction
  let touchStartX = 0;
  let touchStartY = 0;
  let isHorizontalScroll = false;

  stripsContainer.addEventListener(
    "touchstart",
    (e) => {
      if (document.body?.dataset?.filtering === "true") {
        touchStartStrip = null;
        return;
      }
      if (e.touches && e.touches.length > 0) {
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        const element = document.elementFromPoint(t.clientX, t.clientY);
        touchStartStrip = element?.closest(".strip");
        hasMoved = false;
        isHorizontalScroll = false;
      }
    },
    { passive: true }
  );

  stripsContainer.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches && e.touches.length > 0) {
        const t = e.touches[0];

        // Determine scroll direction on first move
        if (!hasMoved) {
          const deltaX = Math.abs(t.clientX - touchStartX);
          const deltaY = Math.abs(t.clientY - touchStartY);

          // Only handle horizontal scrolling (across strips)
          if (deltaX > deltaY && deltaX > 10) {
            isHorizontalScroll = true;
            hasMoved = true;
          } else if (deltaY > deltaX && deltaY > 10) {
            // Vertical scroll - let browser handle it
            hasMoved = true;
            return;
          }
        }

        // Only handle horizontal strip sliding, not vertical scrolling
        if (!isHorizontalScroll) {
          return;
        }

        handlePoint(t.clientX, t.clientY);

        // Find which strip is under the touch point
        const element = document.elementFromPoint(t.clientX, t.clientY);
        const strip = element?.closest(".strip");

        if (strip !== currentlyTouchedStrip) {
          // Remove hover class from previous strip
          if (currentlyTouchedStrip) {
            currentlyTouchedStrip.classList.remove("touch-hover");
          }

          // Add hover class to new strip
          if (strip) {
            strip.classList.add("touch-hover");

            // Update subtitle for touch - scramble the project title
            // Don't update if about overlay is visible
            const aboutOverlay = getAboutOverlay();
            if (!aboutOverlay || !aboutOverlay.classList.contains("visible")) {
              if (subtitleScrambler && headerSubtitle) {
                const projectTitle = getStripProjectTitle(strip);
                if (projectTitle) {
                  subtitleScrambler.scramble(projectTitle.toUpperCase());
                }
              }
            }
          } else {
            // No strip under touch - reset to default
            // Don't update if about overlay is visible
            const aboutOverlay = getAboutOverlay();
            if (!aboutOverlay || !aboutOverlay.classList.contains("visible")) {
              if (subtitleScrambler && headerSubtitle) {
                subtitleScrambler.scramble(currentPageTitle.toUpperCase());
              }
            }
          }

          currentlyTouchedStrip = strip;
        }
      }
    },
    { passive: true }
  );

  // Handle touch end - detect tap vs slide
  stripsContainer.addEventListener("touchend", (e) => {
    // If user didn't move and tapped on a strip, open it
    if (!hasMoved && touchStartStrip && document.body?.dataset?.filtering !== "true") {
      const projectSlug = touchStartStrip.getAttribute("data-project");
      if (projectSlug) {
        const project = projects.find((p) => p.slug === projectSlug);
        const projectId = project?.slug || projectSlug;
        const projectPath = getProjectPath(projectId);

        // Don't scroll here - let router handle scrolling after content loads
        router.navigate(projectPath);
      }
    }

    // Clear touch hover
    if (currentlyTouchedStrip) {
      currentlyTouchedStrip.classList.remove("touch-hover");
      currentlyTouchedStrip = null;
    }

    // Reset subtitle to default when touch ends
    if (subtitleScrambler && headerSubtitle) {
      subtitleScrambler.scramble(currentPageTitle.toUpperCase());
    }

    touchStartStrip = null;
    hasMoved = false;
  });

  // Remove mouseleave handler - let positions stay where they are
  // stripsContainer.addEventListener("mouseleave", () => {
  //   targetX = 0.5;
  //   targetY = 0.5;
  // });

  // Update strip count for dynamic grid sizing
  updateStripCount();

  // Ensure height is set correctly after initialization
  setStripsHeight();

  // Disable transitions during window resize to prevent weird animations
  // Also update height on resize and orientation change (for iOS Safari)
  let resizeTimeout;
  let scrollTimeout;

  window.addEventListener("resize", () => {
    if (stripsContainer) {
      // Update height for iOS Safari
      setStripsHeight();
      stripsContainer.classList.add("resizing");
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        stripsContainer.classList.remove("resizing");
      }, 100);
    }
  });

  // Update height on scroll (for iOS Safari address bar show/hide)
  window.addEventListener(
    "scroll",
    () => {
      if (stripsContainer) {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          setStripsHeight();
        }, 50);
      }
    },
    { passive: true }
  );

  // Update height on orientation change (for iOS Safari)
  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      setStripsHeight();
    }, 100);
  });
}

// Initialize filters
function initFilters() {
  const body = document.body;

  const setFiltering = (value) => {
    if (!body) return;
    if (value) {
      body.dataset.filtering = "true";
    } else {
      delete body.dataset.filtering;
    }
  };

  const buttons = document.querySelectorAll(".filter-dropdown-button");

  if (buttons.length === 0) {
    setTimeout(() => {
      const retryButtons = document.querySelectorAll(".filter-dropdown-button");
      if (retryButtons.length > 0) {
        initFilters();
      }
    }, 100);
    return;
  }

  // Helper to preserve scroll position
  const preserveScroll = (callback) => {
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    setFiltering(true);
    window.__PROGRAMMATIC_SCROLL__ = true;
    if (navigationTimeoutId) {
      clearTimeout(navigationTimeoutId);
      navigationTimeoutId = null;
    }

    callback();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, left: scrollX, behavior: "auto" });
        setTimeout(() => {
          window.__PROGRAMMATIC_SCROLL__ = false;
          setFiltering(false);
        }, 50);
      });
    });
  };

  // Handle filter clicks (both labels and checkboxes)
  const handleFilterClick = (e, checkbox) => {
    e.preventDefault();
    e.stopPropagation();
    preserveScroll(() => {
      checkbox.checked = !checkbox.checked;
      filterProjects();
    });
  };

  // Attach listeners to filter options and checkboxes
  document.querySelectorAll('.filter-option, .filter-dropdown-content input[type="checkbox"]').forEach((el) => {
    if (el.classList.contains("filter-option")) {
      el.addEventListener(
        "click",
        (e) => {
          const checkbox = el.querySelector('input[type="checkbox"]');
          if (checkbox) handleFilterClick(e, checkbox);
        },
        true
      );
    } else {
      el.addEventListener("click", (e) => handleFilterClick(e, el), true);
      el.addEventListener("focus", (e) => e.preventDefault());
    }
  });

  // Expose flag for scroll handler
  window.__IS_FILTERING__ = () => body.dataset.filtering === "true";

  // Shared function to close all dropdowns
  const closeAllDropdowns = () => {
    document.querySelectorAll(".filter-dropdown").forEach((d) => {
      d.classList.remove("open");
      const btn = d.querySelector(".filter-dropdown-button");
      if (btn) btn.textContent = "Filter";
    });
  };

  // Handle dropdown button clicks - preserve scroll position
  buttons.forEach((button) => {
    button.addEventListener(
      "focus",
      (e) => {
        e.preventDefault();
        button.blur();
      },
      true
    );

    button.addEventListener(
      "mousedown",
      (e) => {
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;
        window.__PROGRAMMATIC_SCROLL__ = true;
        window.scrollTo({ top: scrollY, left: scrollX, behavior: "auto" });
        button._savedScrollY = scrollY;
        button._savedScrollX = scrollX;
      },
      true
    );

    button.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();

        const savedScrollY = button._savedScrollY ?? window.scrollY;
        const savedScrollX = button._savedScrollX ?? window.scrollX;

        window.scrollTo({ top: savedScrollY, left: savedScrollX, behavior: "auto" });
        window.__PROGRAMMATIC_SCROLL__ = true;
        button.blur();

        const dropdown = button.closest(".filter-dropdown");
        if (!dropdown) return;

        const isOpen = dropdown.classList.contains("open");
        closeAllDropdowns();

        if (!isOpen) {
          dropdown.classList.add("open");
          button.textContent = "×";
        }

        // Restore scroll position
        const restoreScroll = () => window.scrollTo({ top: savedScrollY, left: savedScrollX, behavior: "auto" });
        restoreScroll();
        requestAnimationFrame(() => {
          restoreScroll();
          requestAnimationFrame(() => {
            restoreScroll();
            setTimeout(() => {
              restoreScroll();
              window.__PROGRAMMATIC_SCROLL__ = false;
              delete button._savedScrollY;
              delete button._savedScrollX;
            }, 100);
          });
        });
      },
      true
    );
  });

  // Close dropdowns when clicking outside
  document.addEventListener(
    "click",
    (e) => {
      if (e.target.closest(".filter-dropdown-button")) return;
      if (!e.target.closest(".filter-dropdown")) {
        closeAllDropdowns();
      }
    },
    true
  );
}

// Function to update the header subtitle (document title always stays as name)
function updateCurrentPageTitle(title) {
  try {
    // Always keep document title as just the name
    const baseName = window.__SITE_TITLE__ || "Jonas Johansson";
    document.title = baseName;

    // If title is null, reset to homepage
    if (title === null) {
      currentPageTitle = defaultSubtitle;
      if (subtitleScrambler && headerSubtitle) {
        subtitleScrambler.scramble(defaultSubtitle.toUpperCase());
      }
      return;
    }

    currentPageTitle = title || defaultSubtitle;

    // Persist globally for other modules and future lookups
    document.documentElement.dataset.currentProjectTitle = currentPageTitle;
    window.__CURRENT_PROJECT_TITLE__ = currentPageTitle;

    // Update the header subtitle if we're on a project page
    if (window.location.pathname.includes("/work/")) {
      // Try to update the header directly if subtitleScrambler is available
      if (subtitleScrambler && headerSubtitle) {
        const targetText = currentPageTitle.toUpperCase();
        subtitleScrambler.scramble(targetText);
      } else {
        // Fallback: update the header text directly
        if (headerSubtitle) {
          headerSubtitle.textContent = currentPageTitle.toUpperCase();
        }
      }
    }
  } catch (error) {
    // Silently handle errors
  }
}

// Export functions for use by router
export { resetFilters, applyProjectColor, updateCurrentPageTitle };

// Initialize filters when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initFilters();
  });
} else {
  initFilters();
}
