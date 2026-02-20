// Strip event listeners - mouse/touch handlers, tap detection, preload-on-hover
import { getProjectPath } from "./utils/pathBuilder.js";
import { setCurrentProjectTitle } from "./utils/state.js";
import { handlePoint } from "./stripAnimation.js";
import { detectSwipeDirection } from "./utils/gestureDetector.js";

const projects = window.__PROJECTS_DATA__ || [];

// References set by strips.js
let stripsContainer = null;
let getAllStrips = null;
let getHeaderSubtitle = null;
let getCurrentPageTitleFn = null;
let setCurrentPageTitleFn = null;
let getAboutOverlayFn = null;
let getNavigationTimeoutId = null;
let setNavigationTimeoutId = null;
let preloadProjectFn = null;
let navigateFn = null;

export function initInteractionRefs(refs) {
  stripsContainer = refs.stripsContainer;
  getAllStrips = refs.getAllStrips;
  getHeaderSubtitle = refs.getHeaderSubtitle;
  getCurrentPageTitleFn = refs.getCurrentPageTitle;
  setCurrentPageTitleFn = refs.setCurrentPageTitle;
  getAboutOverlayFn = refs.getAboutOverlay;
  getNavigationTimeoutId = refs.getNavigationTimeoutId;
  setNavigationTimeoutId = refs.setNavigationTimeoutId;
  preloadProjectFn = refs.preloadProject;
  navigateFn = refs.navigate;
}

function getStripProjectTitle(strip) {
  if (!strip) return null;

  const dataTitle = strip.dataset?.projectTitle;
  if (dataTitle && dataTitle.trim()) return dataTitle.trim();

  const attrTitle = strip.getAttribute("data-project-title");
  if (attrTitle && attrTitle.trim()) return attrTitle.trim();

  const slug = strip.getAttribute("data-project");
  if (!slug) return null;
  const project = projects.find((p) => p.slug === slug);
  return project?.title || null;
}

export function attachStripEventListeners() {
  if (!stripsContainer) {
    console.warn("[Strips] No strips container found");
    return;
  }

  const currentStrips = Array.from(stripsContainer.querySelectorAll(".strip"));
  if (!currentStrips || currentStrips.length === 0) {
    console.warn("[Strips] No strips found in container");
    return;
  }

  // Update allStrips reference
  if (getAllStrips) {
    const allStrips = getAllStrips();
    allStrips.length = 0;
    currentStrips.forEach((s) => allStrips.push(s));
  }

  currentStrips.forEach((strip) => {
    const projectSlug = strip.getAttribute("data-project");
    if (!projectSlug) return;

    const project = projects.find((p) => p.slug === projectSlug);
    if (!project) return;

    strip.dataset.projectTitle = project.title || "";

    if (strip.dataset.listenersAttached === "true" && strip.parentNode === stripsContainer) {
      return;
    }
    strip.dataset.listenersAttached = "true";

    // Hover: show project title + preload
    strip.addEventListener("mouseenter", () => {
      const headerSubtitle = getHeaderSubtitle?.();
      if (!headerSubtitle) return;
      if (!stripsContainer?.classList.contains("strips-initialized")) return;
      const aboutOverlay = getAboutOverlayFn?.();
      if (aboutOverlay?.classList.contains("visible")) return;

      const projectTitle = strip.getAttribute("data-project-title");
      const pSlug = strip.getAttribute("data-project");

      if (projectTitle && projectTitle.trim()) {
        headerSubtitle.textContent = projectTitle.toUpperCase();
      } else if (pSlug) {
        const p = projects.find((pr) => pr.slug === pSlug);
        if (p?.title) headerSubtitle.textContent = p.title.toUpperCase();
      }

      if (pSlug && preloadProjectFn) preloadProjectFn(pSlug);
    });

    strip.addEventListener("mouseleave", (e) => {
      if (e.relatedTarget?.closest?.(".strip")) return;
      const headerSubtitle = getHeaderSubtitle?.();
      if (!headerSubtitle) return;
      if (!stripsContainer?.classList.contains("strips-initialized")) return;
      const aboutOverlay = getAboutOverlayFn?.();
      if (aboutOverlay?.classList.contains("visible")) return;
      if (getNavigationTimeoutId?.()) return;

      const currentPageTitle = getCurrentPageTitleFn?.() || "PROGRESS NOT PERFECTION";
      headerSubtitle.textContent = currentPageTitle.toUpperCase();
    });

    strip.addEventListener("click", () => {
      if (document.body?.dataset?.filtering === "true") return;

      const clickedProjectSlug = strip.getAttribute("data-project");
      if (!clickedProjectSlug) return;

      const clickedProject = projects.find((p) => p.slug === clickedProjectSlug);
      if (!clickedProject) return;

      const computedId = clickedProject.slug || clickedProject.title.toLowerCase().replace(/\s+/g, "-");
      const projectPath = getProjectPath(computedId);

      setCurrentPageTitleFn?.(clickedProject.title);
      setCurrentProjectTitle(clickedProject.title);
      document.documentElement.dataset.currentProjectTitle = clickedProject.title;

      const headerSubtitle = getHeaderSubtitle?.();
      if (headerSubtitle) {
        headerSubtitle.textContent = clickedProject.title.toUpperCase();
      }

      const allStrips = getAllStrips?.() || [];
      strip.classList.add("selected");
      allStrips.forEach((s) => s !== strip && s.classList.add("not-selected"));

      const navTimeoutId = getNavigationTimeoutId?.();
      if (navTimeoutId) clearTimeout(navTimeoutId);

      setNavigationTimeoutId?.(
        setTimeout(() => {
          navigateFn?.(projectPath);
          setNavigationTimeoutId?.(null);
        }, 600)
      );
    });
  });
}

export function attachTouchListeners() {
  if (!stripsContainer) return;

  let currentlyTouchedStrip = null;
  let touchStartStrip = null;
  let hasMoved = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let isHorizontalScroll = false;

  stripsContainer.addEventListener(
    "touchstart",
    (e) => {
      if (document.body?.dataset?.filtering === "true") {
        touchStartStrip = null;
        return;
      }
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

        if (!hasMoved) {
          const direction = detectSwipeDirection(touchStartX, touchStartY, t.clientX, t.clientY);
          if (direction === "horizontal") {
            isHorizontalScroll = true;
            hasMoved = true;
          } else if (direction === "vertical") {
            hasMoved = true;
            return;
          }
        }

        if (!isHorizontalScroll) return;

        handlePoint(t.clientX, t.clientY);

        const element = document.elementFromPoint(t.clientX, t.clientY);
        const strip = element?.closest(".strip");

        if (strip !== currentlyTouchedStrip) {
          if (currentlyTouchedStrip) {
            currentlyTouchedStrip.classList.remove("touch-hover");
          }

          if (strip) {
            strip.classList.add("touch-hover");

            const aboutOverlay = getAboutOverlayFn?.();
            if (!aboutOverlay || !aboutOverlay.classList.contains("visible")) {
              const headerSubtitle = getHeaderSubtitle?.();
              if (headerSubtitle) {
                const projectTitle = strip.getAttribute("data-project-title") || getStripProjectTitle(strip);
                if (projectTitle) {
                  headerSubtitle.textContent = projectTitle.toUpperCase();
                }
              }
            }
          } else {
            const aboutOverlay = getAboutOverlayFn?.();
            if (!aboutOverlay || !aboutOverlay.classList.contains("visible")) {
              const headerSubtitle = getHeaderSubtitle?.();
              if (headerSubtitle) {
                const currentPageTitle = getCurrentPageTitleFn?.() || "PROGRESS NOT PERFECTION";
                headerSubtitle.textContent = currentPageTitle.toUpperCase();
              }
            }
          }

          currentlyTouchedStrip = strip;
        }
      }
    },
    { passive: true }
  );

  stripsContainer.addEventListener("touchend", () => {
    if (!hasMoved && touchStartStrip && document.body?.dataset?.filtering !== "true") {
      const projectSlug = touchStartStrip.getAttribute("data-project");
      if (projectSlug) {
        const project = projects.find((p) => p.slug === projectSlug);
        const projectId = project?.slug || projectSlug;
        const projectPath = getProjectPath(projectId);
        navigateFn?.(projectPath);
      }
    }

    if (currentlyTouchedStrip) {
      currentlyTouchedStrip.classList.remove("touch-hover");
      currentlyTouchedStrip = null;
    }

    const headerSubtitle = getHeaderSubtitle?.();
    if (headerSubtitle) {
      const currentPageTitle = getCurrentPageTitleFn?.() || "PROGRESS NOT PERFECTION";
      headerSubtitle.textContent = currentPageTitle.toUpperCase();
    }

    touchStartStrip = null;
    hasMoved = false;
  });
}
