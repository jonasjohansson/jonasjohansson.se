import { router } from "./router-simple.js";
import { shuffle, clamp } from "./utils/helpers.js";
import { CONFIG, FILTER_CATEGORIES } from "./config/constants.js";
import { ColorExtractor } from "./utils/colorExtractor.js";

// Get projects from window global (injected by 11ty)
const projects = window.__PROJECTS_DATA__ || [];
const pathPrefix = window.__PATH_PREFIX__ || "";

// Simple color extraction and application
const colorExtractor = new ColorExtractor();

async function applyProjectColor(project) {
  if (!project || !project.images || !project.images[0]) return;

  try {
    const heroImageUrl = typeof project.images[0] === "string" ? project.images[0] : project.images[0].src;
    const dominantColor = await colorExtractor.extractDominantColor(heroImageUrl);

    // Apply color as CSS custom property
    document.documentElement.style.setProperty("--project-accent-color", dominantColor);
    document.documentElement.style.setProperty("--project-accent-color-light", colorExtractor.adjustBrightness(dominantColor, 1.3));
    document.documentElement.style.setProperty("--project-accent-color-dark", colorExtractor.adjustBrightness(dominantColor, 0.7));
  } catch (error) {
    console.warn("Failed to extract color:", error);
  }
}

// ---------- DOM Elements ----------
// These will be populated when DOM is ready
let stripsContainer;
let allStrips = [];
let stripImages = [];

// ---------- State ----------
let orientation = "vertical"; // "vertical" or "horizontal"
let curX = 0.5,
  curY = 0.5; // eased cursor (0..1)
let targetX = 0.5,
  targetY = 0.5; // instantaneous cursor (0..1)

// Snap-to-strip functionality
let snapObserver = null;
let isInProjectView = false;
let snapThreshold = 0.8; // 80% coverage threshold

// ---------- Helpers ----------
// Width calculation removed - now handled by CSS

function setOrientation(next) {
  if (next === orientation) return;
  orientation = next;
  stripsContainer.classList.toggle("vertical", orientation === "vertical");
  stripsContainer.classList.toggle("horizontal", orientation === "horizontal");
  // Reset motion targets to avoid sudden jumps
  curX = targetX = 0.5;
  curY = targetY = 0.5;
}

// ---------- Snap-to-Strip Functionality ----------
function initSnapToStrip() {
  if (!stripsContainer || !isInProjectView) return;

  // Clean up existing observer
  if (snapObserver) {
    snapObserver.disconnect();
  }

  // Create intersection observer to detect strip visibility
  snapObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const strip = entry.target;
          const intersectionRatio = entry.intersectionRatio;

          // If strip covers more than 80% of viewport, snap to it
          if (intersectionRatio >= snapThreshold) {
            snapToStrip(strip);
          }
        }
      });
    },
    {
      threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
      rootMargin: "0px",
    }
  );

  // Observe all strips
  allStrips.forEach((strip) => {
    snapObserver.observe(strip);
  });
}

function snapToStrip(targetStrip) {
  if (!targetStrip || !stripsContainer) return;

  // Calculate the position to center the strip
  const containerRect = stripsContainer.getBoundingClientRect();
  const stripRect = targetStrip.getBoundingClientRect();

  // Calculate how much we need to scroll to center this strip
  const stripCenter = stripRect.left + stripRect.width / 2;
  const containerCenter = containerRect.width / 2;
  const scrollOffset = stripCenter - containerCenter;

  // Smooth scroll to center the strip
  stripsContainer.scrollTo({
    left: stripsContainer.scrollLeft + scrollOffset,
    behavior: "smooth",
  });

  // Add visual feedback
  targetStrip.classList.add("snapped");
  setTimeout(() => {
    targetStrip.classList.remove("snapped");
  }, 1000);
}

function updateProjectViewState() {
  const currentPath = window.location.pathname;
  isInProjectView = currentPath.includes("/work/");

  if (isInProjectView) {
    initSnapToStrip();
  } else {
    // Clean up observer when not in project view
    if (snapObserver) {
      snapObserver.disconnect();
      snapObserver = null;
    }
  }
}

// Optional: toggle on key "o"
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "o") {
    setOrientation(orientation === "vertical" ? "horizontal" : "vertical");
  }
});

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

  // Only update DOM if there's actual movement and animation is active
  if (hasMovement && isAnimating) {
    const posX = (curX * 100).toFixed(1);
    const posY = (curY * 100).toFixed(1);

    // Only update if position actually changed
    if (posX !== lastPosX || posY !== lastPosY) {
      if (orientation === "vertical" && posX !== lastPosX) {
        // Use cached image elements instead of querying - update ALL strips, not just visible
        for (let i = 0; i < stripImages.length; i++) {
          const img = stripImages[i];
          if (img && img.style.backgroundImage) {
            img.style.backgroundPosition = `${posX}% 50%`;
          }
        }
        lastPosX = posX;
      } else if (orientation === "horizontal" && posY !== lastPosY) {
        for (let i = 0; i < stripImages.length; i++) {
          const img = stripImages[i];
          if (img && img.style.backgroundImage) {
            img.style.backgroundPosition = `50% ${posY}%`;
          }
        }
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

  document.body.classList.remove("filter-active");
  stripsContainer.classList.remove("filtered");

  allStrips.forEach((strip) => {
    strip.classList.remove("filter-match");
  });

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
    document.body.classList.remove("filter-active");
    stripsContainer.classList.remove("filtered");

    // Remove all filter-match classes
    allStrips.forEach((strip) => {
      strip.classList.remove("filter-match");
    });
  } else {
    // Filters active - add filter-active class to body
    document.body.classList.add("filter-active");
    stripsContainer.classList.add("filtered");

    let matchCount = 0;
    // Add filter-match class to strips that match selected tags (case-insensitive)
    allStrips.forEach((strip) => {
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
    });
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

  // Set data attribute for CSS to use
  stripsContainer.setAttribute("data-visible-count", visibleCount);

  // Update CSS custom property for dynamic calculations
  document.documentElement.style.setProperty("--visible-strip-count", visibleCount);
}

// ---------- Initialize Strips ----------
function initializeStrips() {
  // Populate DOM references
  stripsContainer = document.getElementById("strips");
  allStrips = Array.from(stripsContainer?.querySelectorAll(".strip") || []);
  stripImages = Array.from(stripsContainer?.querySelectorAll(".strip-image") || []);

  // Shuffle strips on page load for variety
  const shuffledStrips = shuffle([...allStrips]);

  // Re-append strips in shuffled order
  shuffledStrips.forEach((strip) => {
    stripsContainer.appendChild(strip);
  });

  // Update references after shuffle
  allStrips = shuffledStrips;
  stripImages = Array.from(stripsContainer?.querySelectorAll(".strip-image") || []);

  // Load strip images immediately
  stripImages.forEach((img) => {
    const bgImage = img.getAttribute("data-bg-image");
    if (bgImage && !img.style.backgroundImage) {
      img.style.backgroundImage = `url('${bgImage}')`;
      img.classList.add("loaded");
    }
  });

  // Trigger initial animation only on first page load
  // Set animation delays AFTER shuffling for correct order
  allStrips.forEach((strip, index) => {
    strip.style.animationDelay = `${index * 0.03}s`;
    strip.classList.add("initial-load");

    // After animation completes, mark as loaded for instant visibility on filter changes
    setTimeout(() => {
      strip.classList.remove("initial-load");
      strip.classList.add("loaded");
    }, 150 + index * 30); // Match animation duration + stagger delay
  });

  // Add click and hover handlers to strips
  const headerSubtitle = document.querySelector(".header-subtitle");
  const defaultSubtitle = headerSubtitle?.textContent || "PROGRESS NOT PERFECTION";

  // Function to get current project title dynamically
  function getCurrentProjectTitle() {
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
      let hoverTimeout = null;
      let isHovering = false;

      // Click handler
      strip.addEventListener("click", () => {
        const projectId = project.slug || project.title.toLowerCase().replace(/\s+/g, "-");
        const projectPath = pathPrefix ? `${pathPrefix}/work/${projectId}` : `/work/${projectId}`;
        router.navigate(projectPath);
      });

      // Hover handlers - update subtitle only
      strip.addEventListener("mouseenter", () => {
        if (headerSubtitle) {
          headerSubtitle.textContent = project.title.toUpperCase();
        }
      });

      strip.addEventListener("mouseleave", () => {
        if (headerSubtitle) {
          headerSubtitle.textContent = getCurrentProjectTitle();
        }
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
            if (project && headerSubtitle) {
              headerSubtitle.textContent = project.title.toUpperCase();
            }
          } else if (headerSubtitle) {
            headerSubtitle.textContent = defaultSubtitle;
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
        router.navigate(projectPath);
      }
    }

    // Clear touch hover
    if (currentlyTouchedStrip) {
      currentlyTouchedStrip.classList.remove("touch-hover");
      currentlyTouchedStrip = null;
    }
    if (headerSubtitle) {
      headerSubtitle.textContent = getCurrentProjectTitle();
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
}

// Initialize filters
function initFilters() {
  // Add event listeners to all filter checkboxes
  const filterInputs = document.querySelectorAll('.filter-dropdown-content input[type="checkbox"]');

  filterInputs.forEach((input) => {
    input.addEventListener("change", () => {
      filterProjects();
    });
  });

  // Handle dropdown toggles
  const dropdownButtons = document.querySelectorAll(".filter-dropdown-button");

  dropdownButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const dropdown = button.closest(".filter-dropdown");
      const isOpen = dropdown.classList.contains("open");

      // Close all dropdowns and reset button text
      document.querySelectorAll(".filter-dropdown").forEach((d) => {
        d.classList.remove("open");
        const btn = d.querySelector(".filter-dropdown-button");
        if (btn) btn.textContent = "Filter";
      });

      // Toggle current dropdown and update button text
      if (!isOpen) {
        dropdown.classList.add("open");
        button.textContent = "×";
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".filter-dropdown")) {
      document.querySelectorAll(".filter-dropdown").forEach((d) => {
        d.classList.remove("open");
        const btn = d.querySelector(".filter-dropdown-button");
        if (btn) btn.textContent = "Filter";
      });
    }
  });
}

// Export functions for use by router
export { resetFilters, updateProjectViewState, applyProjectColor };

// Initialize when DOM is ready or immediately if already ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initializeStrips();
    initFilters();
  });
} else {
  initializeStrips();
  initFilters();
}
