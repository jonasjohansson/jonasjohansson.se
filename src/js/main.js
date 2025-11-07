import "./strips.js";
import "./router.js";
import { router } from "./router.js";
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
  };

  if (elements.header) elements.header.style.display = "";
  if (elements.filterContainer) elements.filterContainer.style.display = "";

  // Apply project color if on project page
  if (window.__INITIAL_PROJECT__) {
    setTimeout(() => applyProjectColor(window.__INITIAL_PROJECT__), 100);
  }

  initHeaderButtons();
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

function initHeaderButtons() {
  const headerToggle = document.getElementById("header-toggle");
  if (!headerToggle) return;

  const headerSubtitle = document.getElementById("header-subtitle");
  const headerCenter = headerToggle.closest(".header-center");

  if (!headerSubtitle || !headerCenter) return;

  const aboutOverlay = document.getElementById("about-overlay");
  if (!aboutOverlay) return;

  const defaultSubtitleText = (headerSubtitle?.dataset?.defaultSubtitle || headerSubtitle?.textContent || "PROGRESS NOT PERFECTION").trim();

  const getCurrentProjectTitle = () => {
    const stored = window.__CURRENT_PROJECT_TITLE__?.trim();
    if (stored) return stored;
    return defaultSubtitleText;
  };

  const setSubtitle = (text) => {
    if (!headerSubtitle) return;
    const targetText = (text || defaultSubtitleText).trim().toUpperCase();
    const scrambler = window.subtitleScrambler;
    if (scrambler) {
      scrambler.scramble(targetText);
    } else {
      headerSubtitle.textContent = targetText;
    }
  };

  const pathPrefix = window.__PATH_PREFIX__ || "";
  const aboutPath = pathPrefix ? `${pathPrefix}/about/` : "/about/";
  const homePath = pathPrefix ? `${pathPrefix}/` : "/";
  const body = document.body;

  function showAboutOverlay() {
    const currentPath = window.location.pathname;
    if (currentPath !== aboutPath) {
      aboutOverlay.dataset.previousPath = currentPath;
    }

    aboutOverlay.classList.add("visible");
    body.style.overflow = "hidden";
    setSubtitle(defaultSubtitleText);
    headerCenter.classList.add("overlay-active");

    if (router && currentPath !== aboutPath) {
      window.history.pushState({ route: aboutPath }, "", aboutPath);
      if (router.currentRoute !== undefined) {
        router.currentRoute = aboutPath;
      }
    }
  }

  // Expose function for router to call
  window.__SHOW_ABOUT_OVERLAY__ = showAboutOverlay;

  function hideAboutOverlay() {
    aboutOverlay.classList.remove("visible");
    body.style.overflow = "";
    const isProjectView = body.classList.contains("project-visible");
    const nextSubtitle = isProjectView ? getCurrentProjectTitle() : defaultSubtitleText;
    setSubtitle(nextSubtitle);
    headerCenter.classList.remove("overlay-active");

    const storedPreviousPath = aboutOverlay.dataset.previousPath;
    delete aboutOverlay.dataset.previousPath;

    let targetPath = storedPreviousPath || homePath;
    if (!targetPath || targetPath === aboutPath) {
      targetPath = homePath;
    }

    if (router && window.location.pathname !== targetPath) {
      window.history.pushState({ route: targetPath }, "", targetPath);
      if (router.currentRoute !== undefined) {
        router.currentRoute = targetPath;
      }
    }
  }

  function toggleAboutOverlay() {
    const isVisible = aboutOverlay.classList.contains("visible");
    if (isVisible) {
      hideAboutOverlay();
    } else {
      showAboutOverlay();
    }
  }

  if (aboutOverlay) {
    aboutOverlay.addEventListener("click", (event) => {
      if (event.target === aboutOverlay) {
        hideAboutOverlay();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && aboutOverlay.classList.contains("visible")) {
        hideAboutOverlay();
      }
    });
  }

  const handleInteraction = (event) => {
    event.preventDefault();
    toggleAboutOverlay();
    headerToggle.blur();
    headerCenter.blur();
  };

  headerToggle.addEventListener("click", handleInteraction);
}
