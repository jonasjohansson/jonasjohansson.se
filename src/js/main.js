import "./strips.js";
import "./router.js";
import { applyProjectColor, initializeStrips } from "./strips.js";
import { loadingManager } from "./utils/loadingManager.js";
import "./melody.js";

async function initializeApp() {
  // Non-blocking initializations
  document.fonts?.load("14px OffBit").catch(() => {});
  loadingManager.preloadStripImages().catch(() => {});
  if (document.getElementById("strips")) {
    import("./xylophone.js").catch(() => {});
  }

  // Initialize strips
  initializeStrips();

  // Show UI elements
  const elements = {
    header: document.getElementById("header"),
    filterContainer: document.getElementById("filter-dropdown-container"),
    aboutSection: document.getElementById("about-section"),
  };

  if (elements.header) elements.header.style.display = "";
  if (elements.filterContainer) elements.filterContainer.style.display = "";
  if (elements.aboutSection) {
    elements.aboutSection.style.opacity = "1";
    elements.aboutSection.style.transition = "opacity 0.3s ease";
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
  const contentWrapper = document.getElementById("content-wrapper");
  if (!headerToggle || !aboutSection || !contentWrapper) return;

  const threshold = 100;

  const getContentWrapperPosition = () => {
    const rect = contentWrapper.getBoundingClientRect();
    return rect.top + window.scrollY;
  };

  headerToggle.addEventListener("click", () => {
    const scrollY = window.scrollY;
    const contentPosition = getContentWrapperPosition();
    const targetTop = scrollY < threshold ? contentPosition : 0;

    window.scrollTo({ top: targetTop, behavior: "smooth" });
    aboutSection.classList.toggle("visible", targetTop === 0);

    // Remove focus to prevent hover state from persisting on mobile
    if (headerToggle) {
      headerToggle.blur();
    }
    const headerCenter = headerToggle.closest(".header-center");
    if (headerCenter) {
      headerCenter.blur();
    }
  });

  // Update about visibility on scroll
  window.addEventListener("scroll", () => {
    if (window.__IS_FILTERING__?.() || window.__PROGRAMMATIC_SCROLL__) return;
    aboutSection.classList.toggle("visible", window.scrollY < 50);
  });
}

// removed legacy setDefaultScrollPosition (now handled by autoScrollToContent)
