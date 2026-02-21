// Strip event listeners - mouse/touch handlers, tap detection, preload-on-hover
import { getProjectPath } from "./utils/pathBuilder.js";
import { setCurrentProjectTitle } from "./utils/state.js";
import { handlePoint } from "./stripAnimation.js";
import { detectSwipeDirection } from "./utils/gestureDetector.js";
import { scrambleText } from "./utils/textScramble.js";
import { getCurrentProjectSlug } from "./utils/routeUtils.js";
import { playStripExitSound, playStripExpandSound } from "./xylophone.js";

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

let hoverDebounceTimer = null;
const HOVER_DEBOUNCE_MS = 120;

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

    // Hover: show project title + preload + update header color
    strip.addEventListener("mouseenter", () => {
      if (!stripsContainer?.classList.contains("strips-initialized")) return;
      const aboutOverlay = getAboutOverlayFn?.();
      if (aboutOverlay?.classList.contains("visible")) return;

      const pSlug = strip.getAttribute("data-project");

      // Update color and preload immediately (no delay needed)
      if (pSlug) {
        document.documentElement.setAttribute("data-project", pSlug);
        if (preloadProjectFn) preloadProjectFn(pSlug);
      }

      // Debounce the text scramble so rapid mouse movement doesn't chain animations
      if (hoverDebounceTimer) clearTimeout(hoverDebounceTimer);
      hoverDebounceTimer = setTimeout(() => {
        const headerSubtitle = getHeaderSubtitle?.();
        if (!headerSubtitle) return;

        const projectTitle = strip.getAttribute("data-project-title");
        if (projectTitle && projectTitle.trim()) {
          scrambleText(headerSubtitle, projectTitle);
        } else if (pSlug) {
          const p = projects.find((pr) => pr.slug === pSlug);
          if (p?.title) scrambleText(headerSubtitle, p.title);
        }
      }, HOVER_DEBOUNCE_MS);
    });

    strip.addEventListener("mouseleave", (e) => {
      if (e.relatedTarget?.closest?.(".strip")) return;
      if (hoverDebounceTimer) { clearTimeout(hoverDebounceTimer); hoverDebounceTimer = null; }
      const headerSubtitle = getHeaderSubtitle?.();
      if (!headerSubtitle) return;
      if (!stripsContainer?.classList.contains("strips-initialized")) return;
      const aboutOverlay = getAboutOverlayFn?.();
      if (aboutOverlay?.classList.contains("visible")) return;
      if (getNavigationTimeoutId?.()) return;

      // Restore current project color or clear on homepage
      const currentSlug = getCurrentProjectSlug();
      if (currentSlug) {
        document.documentElement.setAttribute("data-project", currentSlug);
      } else {
        document.documentElement.removeAttribute("data-project");
      }
      const currentPageTitle = getCurrentPageTitleFn?.() || "PROGRESS NOT PERFECTION";
      scrambleText(headerSubtitle, currentPageTitle);
    });

    const handleStripActivate = () => {
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

      // Randomize header shape angles on each project click
      const titleEl = document.querySelector('.header-title');
      const subtitleEl = document.querySelector('.header-subtitle');
      if (titleEl) titleEl.style.transform = `rotate(${(-2 - Math.random() * 8).toFixed(1)}deg)`;
      if (subtitleEl) subtitleEl.style.transform = `rotate(${(2 + Math.random() * 8).toFixed(1)}deg)`;

      const headerSubtitle = getHeaderSubtitle?.();
      if (headerSubtitle) {
        scrambleText(headerSubtitle, clickedProject.title);
      }

      const allStrips = getAllStrips?.() || [];
      strip.classList.add("selected");
      const otherStrips = allStrips.filter((s) => s !== strip);

      // Staggered slide-out: each strip exits 30ms after the previous
      const exitStagger = 30;
      otherStrips.forEach((s, i) => {
        setTimeout(() => {
          s.classList.add("not-selected");
          playStripExitSound(i, otherStrips.length);
        }, i * exitStagger);
      });

      // Expand sound synced with CSS transition-delay (0.5s after .selected added)
      setTimeout(() => playStripExpandSound(), 500);

      const navTimeoutId = getNavigationTimeoutId?.();
      if (navTimeoutId) clearTimeout(navTimeoutId);

      // Navigate when grow transition finishes (500ms delay + 1000ms grow)
      setNavigationTimeoutId?.(
        setTimeout(() => {
          navigateFn?.(projectPath);
          setNavigationTimeoutId?.(null);
        }, 1500)
      );
    };

    strip.addEventListener("click", handleStripActivate);

    // Keyboard support: Enter/Space activates strip
    strip.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleStripActivate();
      }
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

            const pSlug = strip.getAttribute("data-project");
            if (pSlug) document.documentElement.setAttribute("data-project", pSlug);

            const aboutOverlay = getAboutOverlayFn?.();
            if (!aboutOverlay || !aboutOverlay.classList.contains("visible")) {
              const headerSubtitle = getHeaderSubtitle?.();
              if (headerSubtitle) {
                const projectTitle = strip.getAttribute("data-project-title") || getStripProjectTitle(strip);
                if (projectTitle) {
                  scrambleText(headerSubtitle, projectTitle);
                }
              }
            }
          } else {
            const touchCurrentSlug = getCurrentProjectSlug();
            if (touchCurrentSlug) {
              document.documentElement.setAttribute("data-project", touchCurrentSlug);
            } else {
              document.documentElement.removeAttribute("data-project");
            }

            const aboutOverlay = getAboutOverlayFn?.();
            if (!aboutOverlay || !aboutOverlay.classList.contains("visible")) {
              const headerSubtitle = getHeaderSubtitle?.();
              if (headerSubtitle) {
                const currentPageTitle = getCurrentPageTitleFn?.() || "PROGRESS NOT PERFECTION";
                scrambleText(headerSubtitle, currentPageTitle);
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

    const currentSlug = getCurrentProjectSlug();
    if (!hasMoved || !touchStartStrip) {
      if (currentSlug) {
        document.documentElement.setAttribute("data-project", currentSlug);
      } else {
        document.documentElement.removeAttribute("data-project");
      }
    }

    const headerSubtitle = getHeaderSubtitle?.();
    if (headerSubtitle) {
      const currentPageTitle = getCurrentPageTitleFn?.() || "PROGRESS NOT PERFECTION";
      scrambleText(headerSubtitle, currentPageTitle);
    }

    touchStartStrip = null;
    hasMoved = false;
  });
}
