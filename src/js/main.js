import "./strips.js";
import "./router-simple.js";
// Remove resume import since we're using static content
import { applyProjectColor, initializeStrips } from "./strips.js";
import { loadingManager } from "./utils/loadingManager.js";
import { getStripsScrollPosition } from "./utils/scrollPosition.js";
// Import melody to expose melodyPlayer globally for console access
import "./melody.js";

// Consolidated initialization function
async function initializeApp() {
  // Don't block on fonts - let FOUT happen if needed for faster LCP
  // Fonts will load asynchronously
  if (document.fonts && document.fonts.load) {
    document.fonts.load("14px OffBit").catch(() => {});
  }

  // Initialize strips immediately for interactivity (images will load progressively)
  initializeStrips();

  // Start loading process in background - don't block on it
  loadingManager.preloadStripImages().catch(() => {});

  // Lazy-load optional features to keep initial bundle small
  try {
    const stripsEl = document.getElementById("strips");
    if (stripsEl) {
      import("./xylophone.js").then(() => {
        // melodyPlayer will be exposed on window by xylophone.js
      });
    }
    // Asteroids feature removed
  } catch {}

  // Show header and filter after loading
  const header = document.getElementById("header");
  const filterContainer = document.getElementById("filter-dropdown-container");
  if (header) header.style.display = "";
  if (filterContainer) filterContainer.style.display = "";

  // Show about section after loading is complete
  const aboutSection = document.getElementById("about-section");
  if (aboutSection) {
    aboutSection.style.opacity = "1";
    aboutSection.style.transition = "opacity 0.3s ease";
  }

  // Handle initial project if present
  if (window.__INITIAL_PROJECT__) {
    // Add a small delay to ensure DOM is fully ready
    setTimeout(() => {
      applyProjectColor(window.__INITIAL_PROJECT__);
    }, 100);

    // Also try again after a longer delay as a fallback
    setTimeout(() => {
      const currentColor = getComputedStyle(document.documentElement).getPropertyValue("--project-accent-color");
      if (!currentColor || currentColor.trim() === "") {
        applyProjectColor(window.__INITIAL_PROJECT__);
        // Final fallback: sample first image on page
        try {
          const firstImg = document.querySelector("#projects img, .project-grid img, .media-item img");
          if (firstImg && firstImg.src) {
            import("./strips.js").then((m) => m.applyProjectColorFromImageUrl && m.applyProjectColorFromImageUrl(firstImg.src));
          }
        } catch {}
      }
    }, 1000);
  }

  initHeaderButtons();

  // Auto-scroll to strips/projects after a short delay to ensure layout is ready
  setTimeout(() => {
    autoScrollToContent();
  }, 200);
}

// Auto-scroll to appropriate section based on page type
function autoScrollToContent() {
  // Always scroll directly to content-wrapper
  const contentWrapper = document.getElementById("content-wrapper");
  if (contentWrapper) {
    const aboutHeight = window.innerHeight * 0.8; // 80vh about section height
    // Scroll to position content-wrapper at the top of viewport (right after about section)
    window.scrollTo({
      top: aboutHeight,
      behavior: "auto", // Instant scroll
    });
  }
}

// Single initialization handler
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  // If DOM is already loaded, start loading immediately
  initializeApp();
}

// Melody controls removed from boot; xylophone loads lazily if strips exist

function initHeaderButtons() {
  const headerToggle = document.getElementById("header-toggle");
  const aboutSection = document.getElementById("about-section");

  if (!headerToggle || !aboutSection) return;

  // Get content-wrapper scroll position
  const getContentWrapperPosition = () => {
    const aboutHeight = window.innerHeight * 0.8; // 80vh about section height
    return aboutHeight;
  };

  headerToggle.addEventListener("click", () => {
    const currentScrollY = window.scrollY;
    const contentWrapperPosition = getContentWrapperPosition();
    const threshold = 100; // Threshold to determine if we're "at top" or "at content"

    if (currentScrollY < threshold) {
      // Currently near top, scroll to content-wrapper
      window.scrollTo({
        top: contentWrapperPosition,
        behavior: "smooth",
      });
      aboutSection.classList.remove("visible");
    } else {
      // Currently scrolled down, scroll to top
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      aboutSection.classList.add("visible");
    }
  });

  // Track scroll position to update about section visibility
  window.addEventListener("scroll", () => {
    // Don't update about section visibility during filter operations
    if (window.__IS_FILTERING__ && window.__IS_FILTERING__()) {
      return;
    }
    
    const currentScrollY = window.scrollY;

    // Show about when near top, hide when scrolled down
    if (currentScrollY < 50) {
      aboutSection.classList.add("visible");
    } else {
      aboutSection.classList.remove("visible");
    }
  });
}

// removed legacy setDefaultScrollPosition (now handled by autoScrollToContent)
