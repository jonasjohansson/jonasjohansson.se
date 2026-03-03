import { applyProjectColor, initializeStrips, updateCurrentPageTitle, setNavigateFn, initFilters } from "./strips.js";
import { resetFilters } from "./stripFiltering.js";
import { router } from "./router.js";
import { loadingManager } from "./utils/loadingManager.js";
import { getCurrentRoute } from "./utils/routeUtils.js";
import { aboutOverlay } from "./aboutOverlay.js";
import { initXylophone } from "./xylophone.js";
import { melodyPlayer } from "./melody.js";
import { layoutToggle } from "./gameMode/easyMode.js";

// Wire up router hooks (breaks circular dependency: router <-> strips/aboutOverlay)
router.registerHooks({
  resetFilters,
  applyProjectColor,
  updateCurrentPageTitle,
  initializeStrips,
  hideAbout: (skip) => aboutOverlay.hide(skip),
  showAbout: (immediate) => aboutOverlay.show(immediate),
  initAbout: () => aboutOverlay.init(router),
});

// Give strips a way to navigate without importing router
setNavigateFn((path) => router.navigate(path));

// Show content based on route after loading
async function showContentForRoute(route) {
  const body = document.body;
  body.setAttribute("data-route", route);

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

  } else if (route === "about") {
    // Initialize strips behind the about section — no animation since they're hidden
    initializeStrips({ animate: false });

    // Show about section
    const aboutEl = document.getElementById("about");
    if (aboutEl) {
      body.classList.add("about-visible");
      aboutEl.classList.add("visible");

      // Get header subtitle for setting text
      const headerSubtitle = document.getElementById("header-subtitle");
      const defaultSubtitleText = (
        headerSubtitle?.dataset?.defaultSubtitle ||
        headerSubtitle?.textContent ||
        "PROGRESS NOT PERFECTION"
      ).trim();

      // Update subtitle
      if (headerSubtitle) {
        headerSubtitle.textContent = defaultSubtitleText.toUpperCase();
      }

      // Set data-initial-about immediately
      aboutEl.setAttribute("data-initial-about", "true");
      body.setAttribute("data-initial-about", "true");

      // Scroll to top
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  } else if (route === "project") {
    // Hide about section on project pages
    const aboutEl = document.getElementById("about");
    if (aboutEl) {
      aboutEl.classList.remove("visible");
      body.classList.remove("about-visible");
      body.removeAttribute("data-initial-about");
      aboutEl.removeAttribute("data-initial-about");
    }

    // Show project content with fade in
    const projects = document.getElementById("projects");
    if (projects) {
      body.classList.add("project-visible");

      // Initialize strips silently — no animation or sound on direct project load
      initializeStrips({ animate: false });

      // Hide the current project's strip from navigation
      const currentSlug = window.location.pathname.match(/\/work\/([^\/]+)/)?.[1];
      if (currentSlug) {
        document.querySelectorAll(`.strip[data-project="${currentSlug}"]`).forEach((s) => s.classList.add("hidden"));
      }

      // Fade in project
      requestAnimationFrame(() => {
        projects.style.opacity = "1";
        projects.style.visibility = "visible";
      });

      // Apply project color and update header subtitle
      if (window.__INITIAL_PROJECT__) {
        const projectTitle = window.__INITIAL_PROJECT__?.title;
        if (projectTitle) {
          // Initialize about overlay first to ensure subtitle is available
          aboutOverlay.init(router);
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
            aboutOverlay.init(router);
            setTimeout(() => {
              updateCurrentPageTitle(project.title);
            }, 100);
          }
        }
      }
    }
  }

  // Initialize about overlay (if not already initialized in project route)
  if (route !== "project") {
    aboutOverlay.init(router);
  }
}

async function initializeApp() {
  // Determine route and set data attribute
  const route = getCurrentRoute();
  document.body.setAttribute("data-route", route);

  // Initialize router (listens for popstate)
  router.init();

  // Initialize filter dropdown UI
  initFilters();

  // Initialize xylophone audio
  initXylophone();
  melodyPlayer.enableMelodyMode("mario");

  // Start preloading assets
  await loadingManager.preloadAllAssets();

  // Once loading is complete, show content for the route
  showContentForRoute(route);

  // Initialize layout toggle (adds icon to header)
  layoutToggle.init();
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
