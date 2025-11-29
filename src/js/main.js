import "./strips.js";
import "./router.js";
import { router } from "./router.js";
import { applyProjectColor, initializeStrips, updateCurrentPageTitle } from "./strips.js";
import { loadingManager } from "./utils/loadingManager.js";
import "./melody.js";
import { initializeGrain } from "./grain.js";
import { initializeShader } from "./shader.js";
import { getCurrentRoute, getPathPrefix } from "./utils/routeUtils.js";
import "./xylophone.js"; // Import statically to bundle into main.js

// Show content based on route after loading
async function showContentForRoute(route) {
  const body = document.body;
  body.setAttribute("data-route", route);

  // Initialize grain and shader for all routes
  initializeGrain();
  await initializeShader();

  // Show header for all routes
  const header = document.getElementById("header");
  if (header) {
    header.style.display = "flex";
    header.style.visibility = "visible";
    header.style.opacity = "1";
  }

  if (route === "home") {
    // Initialize strips - they will animate in
    initializeStrips();

    const filterContainer = document.getElementById("filter-dropdown-container");
    if (filterContainer) filterContainer.style.display = "";
  } else if (route === "about") {
    // Show about overlay instantly
    const aboutOverlay = document.getElementById("about");
    if (aboutOverlay) {
      body.classList.add("about-visible");

      // Get header subtitle for setting text
      const headerSubtitle = document.getElementById("header-subtitle");
      const defaultSubtitleText = (
        headerSubtitle?.dataset?.defaultSubtitle ||
        headerSubtitle?.textContent ||
        "PROGRESS NOT PERFECTION"
      ).trim();

      // Show overlay instantly
      aboutOverlay.style.display = "block";
      aboutOverlay.style.visibility = "visible";
      aboutOverlay.style.zIndex = "250";
      aboutOverlay.classList.add("visible");
      aboutOverlay.style.pointerEvents = "auto";
      body.style.overflow = "hidden";

      // Update subtitle
      if (headerSubtitle) {
        headerSubtitle.textContent = defaultSubtitleText.toUpperCase();
      }

      // Set data-initial-about immediately
      aboutOverlay.setAttribute("data-initial-about", "true");
      body.setAttribute("data-initial-about", "true");
    }
  } else if (route === "project") {
    // Hide about overlay immediately on project pages
    const aboutOverlay = document.getElementById("about");
    if (aboutOverlay) {
      aboutOverlay.style.display = "none";
      aboutOverlay.style.visibility = "hidden";
      aboutOverlay.style.pointerEvents = "none";
      aboutOverlay.classList.remove("visible");
      body.classList.remove("about-visible");
      body.removeAttribute("data-initial-about");
      aboutOverlay.removeAttribute("data-initial-about");
    }

    // Show project content with fade in
    const projects = document.getElementById("projects");
    if (projects) {
      body.classList.add("project-visible");

      // Initialize strips to ensure event listeners are attached
      // This is needed even on project pages so strips are clickable
      initializeStrips();

      // Fade in project
      requestAnimationFrame(() => {
        projects.style.opacity = "1";
        projects.style.visibility = "visible";
      });

      // Apply project color and update header subtitle
      if (window.__INITIAL_PROJECT__) {
        const projectTitle = window.__INITIAL_PROJECT__?.title;
        if (projectTitle) {
          // Initialize header buttons first to ensure scrambler is available
          initHeaderButtons();
          // Update subtitle after a short delay to ensure scrambler is initialized
          setTimeout(() => {
            updateCurrentPageTitle(projectTitle);
            applyProjectColor(window.__INITIAL_PROJECT__);
          }, 100);
        } else {
          setTimeout(() => applyProjectColor(window.__INITIAL_PROJECT__), 100);
        }
      } else {
        // Fallback: extract project title from URL if __INITIAL_PROJECT__ is not available
        const pathMatch = window.location.pathname.match(/\/work\/([^\/]+)/);
        if (pathMatch) {
          const slug = pathMatch[1];
          const projectsData = window.__PROJECTS_DATA__ || [];
          const project = projectsData.find((p) => p.slug === slug);
          if (project?.title) {
            initHeaderButtons();
            setTimeout(() => {
              updateCurrentPageTitle(project.title);
            }, 100);
          }
        }
      }
    }
  }

  // Initialize header buttons (if not already initialized in project route)
  if (route !== "project") {
    initHeaderButtons();
  }
}

async function initializeApp() {
  // xylophone.js is now statically imported, so it's already loaded


  // Determine route and set data attribute
  const route = getCurrentRoute();
  document.body.setAttribute("data-route", route);

  // Start preloading assets
  await loadingManager.preloadAllAssets();

  // Once loading is complete, show content for the route
  showContentForRoute(route);
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

function initHeaderButtons() {
  const headerToggle = document.getElementById("header-toggle");
  const headerSubtitle = document.getElementById("header-subtitle");
  const aboutOverlay = document.getElementById("about");

  if (!headerToggle || !headerSubtitle || !aboutOverlay) return;

  const headerCenter = headerToggle.closest(".header-center");
  if (!headerCenter) return;

  const defaultSubtitleText = (headerSubtitle.dataset.defaultSubtitle || headerSubtitle.textContent || "PROGRESS NOT PERFECTION").trim();

  const getCurrentProjectTitle = () => {
    const stored = window.__CURRENT_PROJECT_TITLE__?.trim();
    if (stored) return stored;
    return defaultSubtitleText;
  };

  const setSubtitle = (text, fadeIn = false) => {
    const targetText = (text || defaultSubtitleText).trim().toUpperCase();
    const updateText = () => {
      headerSubtitle.textContent = targetText;
    };

    if (fadeIn) {
      // Fade out first, then fade in with new text
      headerSubtitle.style.opacity = "0";
      headerSubtitle.style.transition = "opacity 0.3s ease";

      requestAnimationFrame(() => {
        updateText();
        requestAnimationFrame(() => {
          headerSubtitle.style.opacity = "1";
        });
      });
    } else {
      // Immediate change (no fade)
      updateText();
    }
  };

  const pathPrefix = getPathPrefix();
  const aboutPath = pathPrefix ? `${pathPrefix}/about/` : "/about/";
  const homePath = pathPrefix ? `${pathPrefix}/` : "/";
  const body = document.body;

  // Cache for available about images
  let availableAboutImages = null;

  // Get available about images from Eleventy data or detect them
  async function detectAvailableAboutImages() {
    if (availableAboutImages !== null) {
      return availableAboutImages;
    }

    // First, try to use images from Eleventy global data
    if (window.__ABOUT_IMAGES__ && Array.isArray(window.__ABOUT_IMAGES__) && window.__ABOUT_IMAGES__.length > 0) {
      const images = window.__ABOUT_IMAGES__.map((img) => {
        // Ensure path has leading slash
        return img.startsWith("/") ? img : `/${img}`;
      });
      availableAboutImages = images;
      return images;
    }

    // Fallback: detect images by trying to load them
    const imagesToCheck = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Check up to 10 images
    const available = [];

    const checkPromises = imagesToCheck.map((num) => {
      const paddedNum = num.toString().padStart(2, "0");
      const imagePath = `${pathPrefix}/projects/about/${paddedNum}.jpg`;

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          available.push(imagePath);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = imagePath;
      });
    });

    await Promise.all(checkPromises);

    // If no images found, fallback to 01.jpg
    if (available.length === 0) {
      available.push(`${pathPrefix}/projects/about/01.jpg`);
    }

    availableAboutImages = available;
    return available;
  }

  function getRandomAboutImage(availableImages) {
    if (!availableImages || availableImages.length === 0) {
      return `${pathPrefix}/projects/about/01.jpg`;
    }
    const randomIndex = Math.floor(Math.random() * availableImages.length);
    return availableImages[randomIndex];
  }

  async function updateAboutImage() {
    const aboutImage = aboutOverlay.querySelector(".about-image img");
    if (aboutImage) {
      // Detect available images first
      const availableImages = await detectAvailableAboutImages();
      const newSrc = getRandomAboutImage(availableImages);

      // Set src immediately - browser will load it, but overlay is already visible
      aboutImage.src = newSrc;
      
      // Preload in background for next time
      const img = new Image();
      img.src = newSrc;
    }
    return Promise.resolve();
  }

  async function showAboutOverlay(immediate = false) {
    const currentPath = window.location.pathname;
    const isDirectNavigation = currentPath === aboutPath || currentPath === aboutPath.replace(/\/$/, "");

    if (currentPath !== aboutPath) {
      aboutOverlay.dataset.previousPath = currentPath;
    }

    // Show overlay instantly - keep original image src from HTML
    body.classList.add("about-visible");
    aboutOverlay.style.display = "block";
    aboutOverlay.style.visibility = "visible";
    aboutOverlay.style.zIndex = "250";
    aboutOverlay.classList.add("visible");
    aboutOverlay.style.pointerEvents = "auto";
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
  window.__HIDE_ABOUT_OVERLAY__ = hideAboutOverlay;

  // Also expose a direct function to check if about is visible
  window.__IS_ABOUT_VISIBLE__ = () => {
    return aboutOverlay.classList.contains("visible");
  };

  function hideAboutOverlay(skipNavigation = false) {
    // Remove data attributes immediately
    aboutOverlay.removeAttribute("data-initial-about");
    body.removeAttribute("data-initial-about");

    // Hide overlay instantly
    aboutOverlay.style.display = "none";
    aboutOverlay.style.visibility = "hidden";
    aboutOverlay.style.pointerEvents = "none";
    aboutOverlay.classList.remove("visible");
    body.classList.remove("about-visible");
    body.style.overflow = "";

    const isProjectView = body.classList.contains("project-visible");
    const nextSubtitle = isProjectView ? getCurrentProjectTitle() : defaultSubtitleText;
    setSubtitle(nextSubtitle);
    headerCenter.classList.remove("overlay-active");

    // Only navigate if not explicitly skipped (to avoid double navigation)
    if (!skipNavigation) {
      const storedPreviousPath = aboutOverlay.dataset.previousPath;
      delete aboutOverlay.dataset.previousPath;

      let targetPath = storedPreviousPath || homePath;
      // Always navigate to home path when hiding about overlay (never navigate to about path)
      if (!targetPath || targetPath === aboutPath || targetPath.includes("/about")) {
        targetPath = homePath;
      }

      // Navigate to target path
      if (router) {
        // Always use router.navigate - it will handle hiding the about overlay
        router.navigate(targetPath, true);
      } else if (window.location.pathname !== targetPath) {
        window.history.pushState({ route: targetPath }, "", targetPath);
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

    // Simple toggle: check current state and toggle
    const isAboutVisible = aboutOverlay.classList.contains("visible");
    if (isAboutVisible) {
      // Hide overlay and navigate to home
      hideAboutOverlay();
    } else {
      // Show overlay
      showAboutOverlay();
    }

    if (headerToggle) headerToggle.blur();
    if (headerCenter) headerCenter.blur();
  };

  // Add click handler to both the toggle and the center container
  // Use capture phase to ensure we catch the event
  headerToggle.addEventListener("click", handleInteraction, true);
  headerCenter.addEventListener("click", handleInteraction, true);

  // Reset subtitle when mouse leaves the header
  headerCenter.addEventListener("mouseleave", () => {
    // Don't change subtitle if about overlay is visible
    if (aboutOverlay.classList.contains("visible")) {
      return;
    }
    const isProjectView = body.classList.contains("project-visible");
    const nextSubtitle = isProjectView ? getCurrentProjectTitle() : defaultSubtitleText;
    setSubtitle(nextSubtitle);
  });

  // Also reset when mouse leaves the header toggle
  headerToggle.addEventListener("mouseleave", () => {
    // Don't change subtitle if about overlay is visible
    if (aboutOverlay.classList.contains("visible")) {
      return;
    }
    const isProjectView = body.classList.contains("project-visible");
    const nextSubtitle = isProjectView ? getCurrentProjectTitle() : defaultSubtitleText;
    setSubtitle(nextSubtitle);
  });
}
