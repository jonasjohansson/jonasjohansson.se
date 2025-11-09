import "./strips.js";
import "./router.js";
import { router } from "./router.js";
import { applyProjectColor, initializeStrips } from "./strips.js";
import { loadingManager } from "./utils/loadingManager.js";
import "./melody.js";
import { initializeGrain } from "./grain.js";
import { initializeShader } from "./shader.js";

// Preload about image to prevent pop-in
function preloadAboutImage() {
  return new Promise((resolve) => {
    const pathPrefix = window.__PATH_PREFIX__ || "";
    const aboutImagePath = `${pathPrefix}/projects/about/01.jpg`;
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // Continue even if image fails
    img.src = aboutImagePath;
  });
}

async function initializeApp() {
  // Non-blocking initializations
  document.fonts?.load("14px OffBit").catch(() => {});
  loadingManager.preloadStripImages().catch(() => {});
  // Preload about image early
  preloadAboutImage().catch(() => {});
  if (document.getElementById("strips")) {
    import("./xylophone.js").catch(() => {});
  }

  // Initialize strips
  initializeStrips();

  // Initialize grain
  initializeGrain();
  
  // Initialize shader (async to load from file)
  await initializeShader();

  // Show UI elements
  const elements = {
    header: document.getElementById("header"),
    filterContainer: document.getElementById("filter-dropdown-container"),
  };

  if (elements.header) {
    elements.header.style.display = "flex";
    elements.header.style.visibility = "visible";
    elements.header.style.opacity = "1";
  }
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

  const aboutOverlay = document.getElementById("about");
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

  async function showAboutOverlay(immediate = false) {
    const currentPath = window.location.pathname;
    const isDirectNavigation = currentPath === aboutPath || currentPath === aboutPath.replace(/\/$/, '');
    
    if (currentPath !== aboutPath) {
      aboutOverlay.dataset.previousPath = currentPath;
    }

    // On direct navigation, show immediately without waiting for image
    if (immediate || isDirectNavigation) {
      body.classList.add('about-visible');
      aboutOverlay.style.display = "block";
      aboutOverlay.style.visibility = "visible";
      aboutOverlay.style.zIndex = "250";
      aboutOverlay.style.opacity = "1";
      aboutOverlay.style.pointerEvents = "auto";
      aboutOverlay.classList.add("visible");
      aboutOverlay.classList.remove("fade-out");
      aboutOverlay.setAttribute("data-immediate", "true");
      
      // Show image immediately on direct navigation
      const aboutImage = aboutOverlay.querySelector('.about-image img');
      if (aboutImage) {
        aboutImage.style.opacity = "1";
        aboutImage.style.transition = "none";
      }
      
      body.style.overflow = "hidden";
      setSubtitle(defaultSubtitleText);
      headerCenter.classList.add("overlay-active");
      return;
    }

    // For transitions from other pages, wait for image and fade in
    const aboutImage = aboutOverlay.querySelector('.about-image img');
    if (aboutImage && !aboutImage.complete) {
      await new Promise((resolve) => {
        if (aboutImage.complete) {
          resolve();
        } else {
          aboutImage.onload = resolve;
          aboutImage.onerror = resolve; // Continue even if image fails
          // Fallback timeout
          setTimeout(resolve, 1000);
        }
      });
    }

    // Force about to be visible with direct inline styles
    body.classList.add('about-visible');
    
    // Set display first
    aboutOverlay.style.display = "block";
    aboutOverlay.style.visibility = "visible";
    aboutOverlay.style.zIndex = "250"; // Below shader (400) and header (300)
    aboutOverlay.classList.remove("fade-out");
    
    // Wait a frame, then add visible class to trigger opacity transition
    requestAnimationFrame(() => {
      aboutOverlay.classList.add("visible");
      aboutOverlay.style.pointerEvents = "auto";
      body.style.overflow = "hidden";
      setSubtitle(defaultSubtitleText);
      headerCenter.classList.add("overlay-active");
      
      // Ensure image fades in smoothly
      if (aboutImage) {
        requestAnimationFrame(() => {
          aboutImage.style.opacity = "1";
        });
      }
    });

    if (router && currentPath !== aboutPath) {
      window.history.pushState({ route: aboutPath }, "", aboutPath);
      if (router.currentRoute !== undefined) {
        router.currentRoute = aboutPath;
      }
    }
  }

  // Expose function for router to call
  window.__SHOW_ABOUT_OVERLAY__ = showAboutOverlay;
  
  // Also expose a direct function to check if about is visible
  window.__IS_ABOUT_VISIBLE__ = () => {
    return aboutOverlay.classList.contains("visible");
  };

  function hideAboutOverlay() {
    // Fade out first
    aboutOverlay.style.opacity = "0";
    aboutOverlay.classList.add("fade-out");
    aboutOverlay.classList.remove("visible");
    body.classList.remove('about-visible');
    
    // Wait for transition to complete before hiding
    setTimeout(() => {
      aboutOverlay.style.display = "none";
      aboutOverlay.style.opacity = "";
      aboutOverlay.style.visibility = "";
      aboutOverlay.style.zIndex = "";
      aboutOverlay.style.pointerEvents = "";
      aboutOverlay.classList.remove("fade-out");
    }, 300); // Match CSS transition duration
    
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
    // Don't prevent default on the header itself, just stop propagation
    event.stopPropagation();
    toggleAboutOverlay();
    if (headerToggle) headerToggle.blur();
    if (headerCenter) headerCenter.blur();
  };

  // Add click handler to both the toggle and the center container
  // Use capture phase to ensure we catch the event
  headerToggle.addEventListener("click", handleInteraction, true);
  headerCenter.addEventListener("click", handleInteraction, true);
  
  // Reset subtitle when mouse leaves the header
  headerCenter.addEventListener("mouseleave", () => {
    const isProjectView = body.classList.contains("project-visible");
    const nextSubtitle = isProjectView ? getCurrentProjectTitle() : defaultSubtitleText;
    setSubtitle(nextSubtitle);
  });
  
  // Also reset when mouse leaves the header toggle
  headerToggle.addEventListener("mouseleave", () => {
    const isProjectView = body.classList.contains("project-visible");
    const nextSubtitle = isProjectView ? getCurrentProjectTitle() : defaultSubtitleText;
    setSubtitle(nextSubtitle);
  });
}
