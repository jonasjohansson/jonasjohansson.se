import { router } from "./router-simple.js";
import { shuffle, clamp } from "./utils/helpers.js";
import { CONFIG, FILTER_CATEGORIES } from "./config/constants.js";
import { ColorExtractor } from "./utils/colorExtractor.js";
import { createScrambler } from "./utils/scrambleText.js";
import { getStripsScrollPosition } from "./utils/scrollPosition.js";

// Get projects from window global (injected by 11ty)
const projects = window.__PROJECTS_DATA__ || [];
const pathPrefix = window.__PATH_PREFIX__ || "";

// Simple color extraction and application
const colorExtractor = new ColorExtractor();

// Preload cache for faster navigation
const preloadCache = new Map();
window.preloadCache = preloadCache;

// Preload project content on hover
function preloadProject(slug) {
  if (preloadCache.has(slug)) return; // Already preloaded

  const fetchPath = pathPrefix ? `${pathPrefix}/work/${slug}/` : `/work/${slug}/`;
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

async function applyProjectColor(project) {
  if (!project || !project.images || !project.images[0]) return;

  try {
    const heroImageUrl = typeof project.images[0] === "string" ? project.images[0] : project.images[0].src;
    console.log("Hero image URL:", heroImageUrl);

    // Ensure the URL is absolute
    let absoluteImageUrl = heroImageUrl;
    if (!heroImageUrl.startsWith("http") && !heroImageUrl.startsWith("/")) {
      absoluteImageUrl = `/${heroImageUrl}`;
    }

    // If we're on a project page, we need to resolve relative to the root
    if (window.location.pathname.includes("/work/") && absoluteImageUrl.startsWith("/img/")) {
      // URL is already absolute, keep as is
    } else if (absoluteImageUrl.startsWith("/img/")) {
      // URL is already absolute, keep as is
    }

    console.log("Absolute image URL:", absoluteImageUrl);
    const dominantColor = await colorExtractor.extractDominantColor(absoluteImageUrl);
    console.log("Extracted dominant color:", dominantColor);

    // Apply color as CSS custom property
    const lightColor = colorExtractor.adjustBrightness(dominantColor, 1.3);
    const darkColor = colorExtractor.adjustBrightness(dominantColor, 0.7);

    document.documentElement.style.setProperty("--project-accent-color", dominantColor);
    document.documentElement.style.setProperty("--project-accent-color-light", lightColor);
    document.documentElement.style.setProperty("--project-accent-color-dark", darkColor);

    console.log("Applied accent color:", dominantColor);
    console.log("Applied light color:", lightColor);
    console.log("Applied dark color:", darkColor);

    // Check if the CSS variable is actually set
    const computedStyle = getComputedStyle(document.documentElement);
    console.log("CSS variable value:", computedStyle.getPropertyValue("--project-accent-color-dark"));
  } catch (error) {
    console.warn("Failed to extract color:", error);
  }
}

// Apply accent color given a direct image URL (useful on SSR project pages)
async function applyProjectColorFromImageUrl(imageUrl) {
  try {
    if (!imageUrl) return;

    let absoluteImageUrl = imageUrl;
    if (!absoluteImageUrl.startsWith("http") && !absoluteImageUrl.startsWith("/")) {
      absoluteImageUrl = `/${absoluteImageUrl}`;
    }

    const dominantColor = await colorExtractor.extractDominantColor(absoluteImageUrl);
    const lightColor = colorExtractor.adjustBrightness(dominantColor, 1.3);
    const darkColor = colorExtractor.adjustBrightness(dominantColor, 0.7);

    document.documentElement.style.setProperty("--project-accent-color", dominantColor);
    document.documentElement.style.setProperty("--project-accent-color-light", lightColor);
    document.documentElement.style.setProperty("--project-accent-color-dark", darkColor);
  } catch (err) {
    console.warn("applyProjectColorFromImageUrl failed", err);
  }
}

// ---------- DOM Elements ----------
// These will be populated when DOM is ready
let stripsContainer;
let allStrips = [];
let stripImages = [];

// ---------- Global State ----------
let headerSubtitle;
let defaultSubtitle = "PROGRESS NOT PERFECTION";
let currentPageTitle = defaultSubtitle;
let subtitleScrambler = null;

// ---------- State ----------
let curX = 0.5,
  curY = 0.5; // eased cursor (0..1)
let targetX = 0.5,
  targetY = 0.5; // instantaneous cursor (0..1)

// ---------- Helpers ----------
function updateProjectViewState() {
  // Legacy function kept for router compatibility
}

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
    rootMargin: CONFIG.IMAGE_LOAD_MARGIN,
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

  curX += (targetX - curX) * CONFIG.ANIMATION_EASE_FACTOR;
  curY += (targetY - curY) * CONFIG.ANIMATION_EASE_FACTOR;

  // Check if movement is significant enough to update
  const deltaX = Math.abs(curX - prevX);
  const deltaY = Math.abs(curY - prevY);
  const hasMovement = deltaX > 0.0001 || deltaY > 0.0001;

  if (!hasMovement) {
    idleFrames++;
    // Stop animating after idle threshold to save CPU
    if (idleFrames > CONFIG.IDLE_THRESHOLD_FRAMES && isAnimating) {
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
  const selectedTags = [];

  document.querySelectorAll('.filter-dropdown-content input[type="checkbox"]:checked').forEach((checkbox) => {
    const value = checkbox.value;
    if (FILTER_CATEGORIES.includes(value)) {
      selectedTags.push(value);
    }
  });

  return { tags: selectedTags };
}

function resetFilters() {
  document.querySelectorAll('.filter-dropdown-content input[type="checkbox"]:checked').forEach((checkbox) => {
    checkbox.checked = false;
  });

  if (document.body) {
    document.body.classList.remove("filter-active");
  }

  if (stripsContainer) {
    stripsContainer.classList.remove("filtered");
  }

  if (allStrips && allStrips.length > 0) {
    allStrips.forEach((strip) => {
      if (strip) {
        strip.classList.remove("filter-match");
      }
    });
  }

  updateStripCount();
  lastPosX = -1;
  lastPosY = -1;
  isAnimating = true;
}

function filterProjects() {
  const { tags } = getSelectedFilters();

  // Use CSS-based filtering with JavaScript to add classes
  if (tags.length === 0) {
    // No filters active - show all strips
    if (document.body) {
      document.body.classList.remove("filter-active");
    }
    if (stripsContainer) {
      stripsContainer.classList.remove("filtered");
    }

    // Remove all filter-match classes
    if (allStrips && allStrips.length > 0) {
      allStrips.forEach((strip) => {
        if (strip) {
          strip.classList.remove("filter-match");
        }
      });
    }
  } else {
    // Filters active - add filter-active class to body
    if (document.body) {
      document.body.classList.add("filter-active");
    }
    if (stripsContainer) {
      stripsContainer.classList.add("filtered");
    }

    let matchCount = 0;
    // Add filter-match class to strips that match selected tags (case-insensitive)
    if (allStrips && allStrips.length > 0) {
      allStrips.forEach((strip) => {
        if (strip) {
          const stripTags = strip.getAttribute("data-tags");

          if (stripTags) {
            // Split tags and normalize to lowercase for comparison
            const stripTagsArray = stripTags.split(",").map((t) => t.trim().toLowerCase());
            const selectedTagsLower = tags.map((t) => t.toLowerCase());

            // Check if any selected tag matches any strip tag
            const hasMatchingTag = selectedTagsLower.some((tag) => stripTagsArray.some((stripTag) => stripTag === tag));

            if (hasMatchingTag) {
              strip.classList.add("filter-match");
              matchCount++;
            } else {
              strip.classList.remove("filter-match");
            }
          } else {
            // No tags on strip, hide it when filtering
            strip.classList.remove("filter-match");
          }
        }
      });
    }
  }

  // Update strip count for dynamic grid sizing
  updateStripCount();

  // Reset animation state
  lastPosX = -1;
  lastPosY = -1;
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

// ---------- Initialize Strips ----------
export function initializeStrips() {
  // Populate DOM references
  stripsContainer = document.getElementById("strips");
  allStrips = Array.from(stripsContainer?.querySelectorAll(".strip") || []);
  stripImages = Array.from(stripsContainer?.querySelectorAll(".strip-image") || []);

  // Shuffle strips on page load for variety
  const shuffledStrips = shuffle([...allStrips]);

  // Re-append strips in shuffled order and add index for staggered animation
  shuffledStrips.forEach((strip, index) => {
    stripsContainer.appendChild(strip);
    // Add index as data attribute for CSS animation delay calculation
    strip.setAttribute("data-index", index);
    // Set CSS custom property for animation delay calculation
    strip.style.setProperty("--strip-index", index);
  });

  // Update references after shuffle
  allStrips = shuffledStrips;
  stripImages = Array.from(stripsContainer?.querySelectorAll(".strip-image") || []);

  // Load strip images immediately but keep them invisible initially
  stripImages.forEach((img) => {
    const bgImage = img.getAttribute("data-bg-image");
    if (bgImage && !img.style.backgroundImage) {
      img.style.backgroundImage = `url('${bgImage}')`;
    }
  });

  // CSS animations handle strip entrance automatically
  // No JavaScript animation needed
  // Strips will be animated when intro.js triggers them

  headerSubtitle = document.querySelector(".header-subtitle");

  if (headerSubtitle) {
    subtitleScrambler = createScrambler(headerSubtitle, {
      duration: 400,
      frameDelay: 30,
    });
    // Make it globally available for router
    window.subtitleScrambler = subtitleScrambler;
  }

  // Header hover behavior: show friendly prompt unless About is open
  const headerEl = document.getElementById("header");
  const introSectionEl = document.getElementById("intro-section");
  if (headerEl && headerSubtitle) {
    headerEl.addEventListener("mouseenter", () => {
      const aboutOpen = !!introSectionEl && introSectionEl.classList.contains("visible");
      if (!aboutOpen && subtitleScrambler) {
        subtitleScrambler.scramble("STAY A WHILE AND LISTEN");
      }
    });

    headerEl.addEventListener("mouseleave", () => {
      const aboutOpen = !!introSectionEl && introSectionEl.classList.contains("visible");
      if (!aboutOpen && subtitleScrambler) {
        const title = getCurrentProjectTitle();
        subtitleScrambler.scramble(title.toUpperCase());
      }
    });
  }

  function getCurrentProjectTitle() {
    // Prefer explicit global/dataset value if present
    const fromDataset = document.documentElement?.dataset?.currentProjectTitle;
    if (fromDataset && fromDataset.trim()) return fromDataset;

    const fromWindow = window.__CURRENT_PROJECT_TITLE__;
    if (typeof fromWindow === "string" && fromWindow.trim()) return fromWindow;

    // Fallback: infer from URL
    const currentPath = window.location.pathname;
    const isInProject = currentPath.includes("/work/");
    const currentProjectSlug = isInProject ? currentPath.replace("/work/", "").replace("/", "") : null;
    const currentProject = currentProjectSlug ? projects.find((p) => p.slug === currentProjectSlug) : null;
    return currentProject ? currentProject.title : defaultSubtitle;
  }

  allStrips.forEach((strip) => {
    const projectSlug = strip.getAttribute("data-project");
    const project = projects.find((p) => p.slug === projectSlug);

    if (project) {
      // Mouse hover events for scramble text
      strip.addEventListener("mouseenter", () => {
        if (subtitleScrambler && headerSubtitle) {
          subtitleScrambler.scramble(project.title.toUpperCase());
        }

        // Preload project content on hover for faster navigation
        preloadProject(projectSlug);
      });

      strip.addEventListener("mouseleave", () => {
        if (subtitleScrambler && headerSubtitle) {
          // Always return to the stored current page title
          subtitleScrambler.scramble(currentPageTitle.toUpperCase());
        }
      });

      strip.addEventListener("click", () => {
        // Robust slugify: normalize diacritics and map locale specifics like å/ä/ö
        const slugify = (text) => {
          if (!text) return "";
          return (
            text
              .toString()
              .trim()
              .toLowerCase()
              // Normalize diacritics
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              // Swedish specifics
              .replace(/å/g, "a")
              .replace(/ä/g, "a")
              .replace(/ö/g, "o")
              // Remove any remaining invalid chars
              .replace(/[^a-z0-9\s-]/g, "")
              // Collapse whitespace and dashes
              .replace(/\s+/g, "-")
              .replace(/-+/g, "-")
          );
        };

        const computedId = project.slug || slugify(project.title);
        const projectPath = pathPrefix ? `${pathPrefix}/work/${computedId}` : `/work/${computedId}`;

        // Don't scroll here - let router handle scrolling after content loads
        // Immediately reflect selected project title in header while navigating
        try {
          updateCurrentPageTitle(project.title);
        } catch (e) {}

        strip.classList.add("selected");
        allStrips.forEach((otherStrip) => {
          if (otherStrip !== strip) {
            otherStrip.classList.add("not-selected");
          }
        });
        setTimeout(() => {
          router.navigate(projectPath);
        }, 600);
      });
    }
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

            // Update subtitle for touch
            const projectSlug = strip.getAttribute("data-project");
            const project = projects.find((p) => p.slug === projectSlug);
            // Don't update header title on touch - keep as default
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
    if (!hasMoved && touchStartStrip) {
      const projectSlug = touchStartStrip.getAttribute("data-project");
      const project = projects.find((p) => p.slug === projectSlug);

      if (project) {
        const projectId = project.slug || project.title.toLowerCase().replace(/\s+/g, "-");
        const projectPath = pathPrefix ? `${pathPrefix}/work/${projectId}` : `/work/${projectId}`;

        // Don't scroll here - let router handle scrolling after content loads
        router.navigate(projectPath);
      }
    }

    // Clear touch hover
    if (currentlyTouchedStrip) {
      currentlyTouchedStrip.classList.remove("touch-hover");
      currentlyTouchedStrip = null;
    }
    // Don't update header title - keep as default

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
}

// Initialize filters
function initFilters() {
  // Add event listeners to all filter checkboxes
  const filterInputs = document.querySelectorAll('.filter-dropdown-content input[type="checkbox"]');

  if (filterInputs.length === 0) {
    console.warn("No filter inputs found");
    return;
  }

  filterInputs.forEach((input) => {
    if (input) {
      input.addEventListener("change", () => {
        filterProjects();
      });
    }
  });

  // Handle dropdown toggles
  const dropdownButtons = document.querySelectorAll(".filter-dropdown-button");

  dropdownButtons.forEach((button) => {
    if (button) {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        const dropdown = button.closest(".filter-dropdown");
        if (dropdown) {
          const isOpen = dropdown.classList.contains("open");

          // Close all dropdowns and reset button text
          document.querySelectorAll(".filter-dropdown").forEach((d) => {
            if (d) {
              d.classList.remove("open");
              const btn = d.querySelector(".filter-dropdown-button");
              if (btn) btn.textContent = "Filter";
            }
          });

          // Toggle current dropdown and update button text
          if (!isOpen) {
            dropdown.classList.add("open");
            button.textContent = "×";
          }
        }
      });
    }
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".filter-dropdown")) {
      document.querySelectorAll(".filter-dropdown").forEach((d) => {
        if (d) {
          d.classList.remove("open");
          const btn = d.querySelector(".filter-dropdown-button");
          if (btn) btn.textContent = "Filter";
        }
      });
    }
  });
}

// Function to update the current page title (called when entering a project page)
function updateCurrentPageTitle(title) {
  try {
    currentPageTitle = title || defaultSubtitle;
    console.log("Updated current page title to:", currentPageTitle);

    // Persist globally for other modules and future lookups
    document.documentElement.dataset.currentProjectTitle = currentPageTitle;
    window.__CURRENT_PROJECT_TITLE__ = currentPageTitle;

    // Update the header immediately if we're on a project page
    if (window.location.pathname.includes("/work/")) {
      // Try to update the header directly if subtitleScrambler is available
      if (subtitleScrambler && headerSubtitle) {
        subtitleScrambler.scramble(currentPageTitle.toUpperCase());
      } else {
        // Fallback: update the header text directly
        if (headerSubtitle) {
          headerSubtitle.textContent = currentPageTitle.toUpperCase();
        }
      }
    }
  } catch (error) {
    console.warn("Error updating current page title:", error);
  }
}

// Export functions for use by router
export { resetFilters, updateProjectViewState, applyProjectColor, updateCurrentPageTitle };

// Initialize filters when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initFilters();
  });
} else {
  initFilters();
}
