import { applyProjectColor, initializeStrips, updateCurrentPageTitle, setNavigateFn, initFilters } from "./strips.js";
import { resetFilters } from "./stripFiltering.js";
import { router } from "./router.js";
import { loadingManager } from "./utils/loadingManager.js";
import { getCurrentRoute } from "./utils/routeUtils.js";
import { initXylophone } from "./xylophone.js";
import { melodyPlayer } from "./melody.js";
import { initIntro, hideIntro, showIntro } from "./intro.js";
// Wire up router hooks
router.registerHooks({
  resetFilters,
  applyProjectColor,
  updateCurrentPageTitle,
  initializeStrips,
  showIntro,
  hideIntro,
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
    header.classList.toggle("header-hidden", route === "home");
  }

  if (route === "home") {
    // Initialize strips - they will animate in
    initializeStrips();
    showIntro();

  } else if (route === "project") {
    hideIntro();
    // Show project content with fade in
    const projects = document.getElementById("projects");
    if (projects) {
      body.classList.add("project-visible");

      // Initialize strips silently — no animation or sound on direct project load
      initializeStrips({ animate: false });

      // Hide the current project's strip from navigation
      const currentSlug = window.location.pathname.replace(/\/$/, '').split('/').pop();
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
          setTimeout(() => {
            updateCurrentPageTitle(projectTitle);
            applyProjectColor(window.__INITIAL_PROJECT__);
          }, 100);
        } else {
          setTimeout(() => applyProjectColor(window.__INITIAL_PROJECT__), 100);
        }
      } else {
        const pathMatch = window.location.pathname.match(/\/work\/([^\/]+)/);
        if (pathMatch) {
          const slug = pathMatch[1];
          const projectsData = window.__PROJECTS_DATA__ || [];
          const project = projectsData.find((p) => p.slug === slug);
          if (project?.title) {
            setTimeout(() => {
              updateCurrentPageTitle(project.title);
            }, 100);
          }
        }
      }
    }
  }
}

async function initializeApp() {
  // Determine route and set data attribute
  const route = getCurrentRoute();
  document.body.setAttribute("data-route", route);

  // Initialize router (listens for popstate)
  router.init();

  // SPA navigation from intro links
  window.addEventListener("spa-navigate", (e) => {
    router.navigate(e.detail.path);
  });

  // Header click navigates home via SPA
  const headerLink = document.querySelector("#header-toggle");
  if (headerLink) {
    headerLink.addEventListener("click", (e) => {
      e.preventDefault();
      router.goHome();
    });
  }

  // Initialize filter dropdown UI
  initFilters();

  // Initialize intro section
  initIntro();

  // Show intro immediately on the home route (don't wait for image preload)
  if (route === "home") {
    showIntro();
  }

  // Initialize xylophone audio
  initXylophone();
  melodyPlayer.enableMelodyMode("mario");

  // Start preloading assets
  await loadingManager.preloadAllAssets();

  // Once loading is complete, show content for the route
  showContentForRoute(route);

  // Header position toggle on scroll
  initHeaderAutoHide();

}

function initHeaderAutoHide() {
  const header = document.getElementById("header");
  if (!header) return;

  const originalParent = header.parentElement;
  const originalNextSibling = header.nextElementSibling;

  function placeForRoute() {
    const route = document.body.getAttribute("data-route");
    const strips = document.getElementById("strips");
    if (!strips) return;

    if (route === "home") {
      // Pin header to top of strips, no scroll-based movement.
      if (header.parentElement !== strips || strips.firstChild !== header) {
        strips.prepend(header);
      }
      header.classList.remove("header-bottom");
    } else {
      // Project/labs: restore header to original position at top of body.
      if (header.parentElement !== originalParent) {
        originalParent.insertBefore(header, originalNextSibling);
      }
      header.classList.remove("header-bottom");
    }
  }

  placeForRoute();
  const observer = new MutationObserver(placeForRoute);
  observer.observe(document.body, { attributes: true, attributeFilter: ["data-route"] });

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    if (document.body.getAttribute("data-route") === "home") return;
    ticking = true;
    requestAnimationFrame(() => {
      const isBottom = header.classList.contains("header-bottom");
      const strips = document.getElementById("strips");
      const nearTop = window.scrollY < window.innerHeight;

      if (!isBottom && !nearTop) {
        header.classList.add("header-bottom");
        if (strips) strips.appendChild(header);
      } else if (isBottom && nearTop) {
        header.classList.remove("header-bottom");
        originalParent.insertBefore(header, originalNextSibling);
      }

      ticking = false;
    });
  });
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
