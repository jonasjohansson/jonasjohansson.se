import "./strips.js";
import "./router.js";
import { router } from "./router.js";
import { applyProjectColor, initializeStrips } from "./strips.js";
import { loadingManager } from "./utils/loadingManager.js";
import "./melody.js";
import { initializeGrain } from "./grain.js";
import { initializeShader } from "./shader.js";
import { getCurrentRoute, getPathPrefix } from "./utils/routeUtils.js";

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
    // Show about overlay with fade in
    const aboutOverlay = document.getElementById("about");
    if (aboutOverlay) {
      aboutOverlay.setAttribute("data-initial-about", "true");
      body.setAttribute("data-initial-about", "true");
      body.classList.add("about-visible");
      
      // Get header subtitle for setting text
      const headerSubtitle = document.getElementById("header-subtitle");
      const defaultSubtitleText = (headerSubtitle?.dataset?.defaultSubtitle || headerSubtitle?.textContent || "PROGRESS NOT PERFECTION").trim();
      
      // Fade in about overlay
      requestAnimationFrame(() => {
        aboutOverlay.style.display = "block";
        aboutOverlay.style.visibility = "visible";
        aboutOverlay.style.zIndex = "250";
        aboutOverlay.style.pointerEvents = "auto";
        aboutOverlay.classList.add("visible");
        body.style.overflow = "hidden";
        
        // Fade in subtitle
        if (headerSubtitle) {
          headerSubtitle.style.opacity = "0";
          headerSubtitle.style.transition = "opacity 0.3s ease";
          const scrambler = window.subtitleScrambler;
          if (scrambler) {
            scrambler.scramble(defaultSubtitleText.toUpperCase());
          } else {
            headerSubtitle.textContent = defaultSubtitleText.toUpperCase();
          }
          requestAnimationFrame(() => {
            headerSubtitle.style.opacity = "1";
          });
        }
        
        // Fade in image
        const aboutImage = aboutOverlay.querySelector('.about-image img');
        if (aboutImage) {
          requestAnimationFrame(() => {
            aboutImage.style.opacity = "1";
          });
        }
      });
    }
    
  } else if (route === "project") {
    // Show project content with fade in
    const projects = document.getElementById("projects");
    if (projects) {
      body.classList.add("project-visible");
      
      // Fade in project
      requestAnimationFrame(() => {
        projects.style.opacity = "1";
        projects.style.visibility = "visible";
      });
      
      // Apply project color
      if (window.__INITIAL_PROJECT__) {
        setTimeout(() => applyProjectColor(window.__INITIAL_PROJECT__), 100);
      }
    }
  }
  
  // Initialize header buttons
  initHeaderButtons();
}

async function initializeApp() {
  // Non-blocking initializations
  if (document.getElementById("strips")) {
    import("./xylophone.js").catch(() => {});
  }

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
    const scrambler = window.subtitleScrambler;
    const updateText = () => {
      if (scrambler) {
        scrambler.scramble(targetText);
      } else {
        headerSubtitle.textContent = targetText;
      }
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

  function showAboutOverlay(immediate = false) {
    const currentPath = window.location.pathname;
    const isDirectNavigation = currentPath === aboutPath || currentPath === aboutPath.replace(/\/$/, '');
    
    if (currentPath !== aboutPath) {
      aboutOverlay.dataset.previousPath = currentPath;
    }

    // Show overlay immediately with fade-in animation
    body.classList.add('about-visible');
    
    // Set display first
    aboutOverlay.style.display = "block";
    aboutOverlay.style.visibility = "visible";
    aboutOverlay.style.zIndex = "250";
    aboutOverlay.classList.remove("fade-out");
    
      // Trigger fade-in animation immediately
      requestAnimationFrame(() => {
        aboutOverlay.classList.add("visible");
        aboutOverlay.style.pointerEvents = "auto";
        body.style.overflow = "hidden";
        setSubtitle(defaultSubtitleText, true); // Fade in subtitle
        headerCenter.classList.add("overlay-active");
      });

    // Handle image separately - fade it in once loaded
    const aboutImage = aboutOverlay.querySelector('.about-image img');
    if (aboutImage) {
      // If image is already loaded, fade it in immediately
      if (aboutImage.complete && aboutImage.naturalWidth > 0) {
        requestAnimationFrame(() => {
          aboutImage.style.opacity = "1";
        });
      } else {
        // Otherwise, wait for it to load and then fade in
        aboutImage.style.opacity = "0";
        const fadeInImage = () => {
          requestAnimationFrame(() => {
            aboutImage.style.opacity = "1";
          });
        };
        if (aboutImage.complete) {
          fadeInImage();
        } else {
          aboutImage.onload = fadeInImage;
          aboutImage.onerror = fadeInImage; // Continue even if image fails
          // Fallback timeout
          setTimeout(fadeInImage, 1000);
        }
      }
    }

    // On direct navigation, show image immediately without transition
    if (immediate || isDirectNavigation) {
      aboutOverlay.setAttribute("data-immediate", "true");
      if (aboutImage) {
        aboutImage.style.opacity = "1";
        aboutImage.style.transition = "none";
      }
    }

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
    // Remove data attributes immediately to prevent CSS from forcing visibility
    aboutOverlay.removeAttribute("data-immediate");
    aboutOverlay.removeAttribute("data-initial-about");
    body.removeAttribute("data-initial-about");
    
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

    // Only navigate if not explicitly skipped (to avoid double navigation)
    if (!skipNavigation) {
      const storedPreviousPath = aboutOverlay.dataset.previousPath;
      delete aboutOverlay.dataset.previousPath;

      let targetPath = storedPreviousPath || homePath;
      // Always navigate to home path when hiding about overlay (never navigate to about path)
      if (!targetPath || targetPath === aboutPath || targetPath.includes('/about')) {
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
