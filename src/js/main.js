import "./strips.js";
import "./router.js";
import { applyProjectColor, initializeStrips } from "./strips.js";
import { loadingManager } from "./utils/loadingManager.js";
import "./melody.js";

async function initializeApp() {
  // Load fonts asynchronously (non-blocking)
  document.fonts?.load("14px OffBit").catch(() => {});

  // Initialize strips immediately
  initializeStrips();

  // Preload images in background
  loadingManager.preloadStripImages().catch(() => {});

  // Lazy-load xylophone if strips exist
  if (document.getElementById("strips")) {
    import("./xylophone.js").catch(() => {});
  }

  // Show UI elements
  const header = document.getElementById("header");
  const filterContainer = document.getElementById("filter-dropdown-container");
  const aboutSection = document.getElementById("about-section");

  if (header) header.style.display = "";
  if (filterContainer) filterContainer.style.display = "";
  if (aboutSection) {
    aboutSection.style.opacity = "1";
    aboutSection.style.transition = "opacity 0.3s ease";
  }

  // Apply project color if on project page
  if (window.__INITIAL_PROJECT__) {
    setTimeout(() => applyProjectColor(window.__INITIAL_PROJECT__), 100);
  }

  initHeaderButtons();
  setTimeout(autoScrollToContent, 200);
}

function autoScrollToContent() {
  const contentWrapper = document.getElementById("content-wrapper");
  if (contentWrapper) {
    window.scrollTo({
      top: window.innerHeight * 0.8, // 80vh about section height
      behavior: "auto",
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

function initHeaderButtons() {
  const headerToggle = document.getElementById("header-toggle");
  const aboutSection = document.getElementById("about-section");
  if (!headerToggle || !aboutSection) return;

  const contentPosition = window.innerHeight * 0.8;
  const threshold = 100;

  headerToggle.addEventListener("click", () => {
    const scrollY = window.scrollY;
    const targetTop = scrollY < threshold ? contentPosition : 0;

    window.scrollTo({ top: targetTop, behavior: "smooth" });
    aboutSection.classList.toggle("visible", targetTop === 0);
  });

  // Update about visibility on scroll
  window.addEventListener("scroll", () => {
    if (window.__IS_FILTERING__?.() || window.__PROGRAMMATIC_SCROLL__) return;
    aboutSection.classList.toggle("visible", window.scrollY < 50);
  });
}

// removed legacy setDefaultScrollPosition (now handled by autoScrollToContent)
