// Strip event listeners - mouse/touch handlers, tap detection, preload-on-hover
import { getProjectPath } from "./utils/pathBuilder.js";
import { setCurrentProjectTitle } from "./utils/state.js";
import { handlePoint } from "./stripAnimation.js";
import { detectSwipeDirection } from "./utils/gestureDetector.js";
import { scrambleText } from "./utils/textScramble.js";
import { getCurrentProjectSlug } from "./utils/routeUtils.js";

const projects = window.__PROJECTS_DATA__ || [];

// References set by strips.js
let stripsContainer = null;
let getAllStrips = null;
let getHeaderSubtitle = null;
let getCurrentPageTitleFn = null;
let setCurrentPageTitleFn = null;
let getNavigationTimeoutId = null;
let setNavigationTimeoutId = null;
let preloadProjectFn = null;
let navigateFn = null;

let hoverDebounceTimer = null;
const HOVER_DEBOUNCE_MS = 120;

// Activating a strip navigates and reflows the strip layout. A stationary
// pointer over the reflowed layout fires a spurious mouseenter on a different
// strip, which would overwrite the real project title. Ignore hover for a
// short window after an activation.
let lastActivateAt = 0;
const POST_ACTIVATE_HOVER_MUTE_MS = 400;

function setHeaderRevealed(headerSubtitle, revealed) {
  const header = headerSubtitle?.closest("header");
  if (header) header.classList.toggle("header-hidden", !revealed);
}

export function initInteractionRefs(refs) {
  stripsContainer = refs.stripsContainer;
  getAllStrips = refs.getAllStrips;
  getHeaderSubtitle = refs.getHeaderSubtitle;
  getCurrentPageTitleFn = refs.getCurrentPageTitle;
  setCurrentPageTitleFn = refs.setCurrentPageTitle;
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
    // Placeholders and the filter have nothing to open, preload or scramble to.
    if (strip.classList.contains("strip-placeholder") || strip.classList.contains("strip-filter")) return;

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
      // Touch devices emit emulated mouse events (incl. after a tap and the
      // navigation reflow). Those must not drive the header title or they
      // clobber the real project title with a stray strip's name. Tap
      // navigation sets the title itself, so skip hover entirely here.
      if (window.matchMedia("(hover: none)").matches) return;
      if (Date.now() - lastActivateAt < POST_ACTIVATE_HOVER_MUTE_MS) return;
      if (!stripsContainer?.classList.contains("strips-initialized")) return;


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
          setHeaderRevealed(headerSubtitle, true);
          scrambleText(headerSubtitle, projectTitle);
        } else if (pSlug) {
          const p = projects.find((pr) => pr.slug === pSlug);
          if (p?.title) {
            setHeaderRevealed(headerSubtitle, true);
            scrambleText(headerSubtitle, p.title);
          }
        }
      }, HOVER_DEBOUNCE_MS);
    });

    strip.addEventListener("mouseleave", (e) => {
      if (window.matchMedia("(hover: none)").matches) return;
      // Placeholders and the filter don't set a title of their own, so moving
      // onto one must still fall through and clear the previous strip's title.
      if (e.relatedTarget?.closest?.(".strip:not(.strip-placeholder):not(.strip-filter)")) return;
      if (hoverDebounceTimer) { clearTimeout(hoverDebounceTimer); hoverDebounceTimer = null; }
      const headerSubtitle = getHeaderSubtitle?.();
      if (!headerSubtitle) return;
      if (!stripsContainer?.classList.contains("strips-initialized")) return;

      if (getNavigationTimeoutId?.()) return;

      // Restore current project color or clear on homepage
      const currentSlug = getCurrentProjectSlug();
      if (currentSlug) {
        document.documentElement.setAttribute("data-project", currentSlug);
      } else {
        document.documentElement.removeAttribute("data-project");
      }
      const currentPageTitle = getCurrentPageTitleFn?.() || "PROGRESS NOT PERFECTION";
      setHeaderRevealed(headerSubtitle, !!currentSlug);
      scrambleText(headerSubtitle, currentPageTitle);
    });

    const handleStripActivate = (e) => {
      // Strips are real <a href> links. Let modifier-clicks (open in new
      // tab/window) use the native href; intercept plain clicks for SPA nav.
      if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1)) return;
      if (e) e.preventDefault();
      if (document.body?.dataset?.filtering === "true") return;
      if (document.documentElement.classList.contains("transition-lock")) return;

      const clickedProjectSlug = strip.getAttribute("data-project");
      if (!clickedProjectSlug) return;

      const clickedProject = projects.find((p) => p.slug === clickedProjectSlug);
      if (!clickedProject) return;

      // Cancel any pending hover write and mute hover briefly so the
      // post-navigation reflow can't overwrite this project's title.
      if (hoverDebounceTimer) { clearTimeout(hoverDebounceTimer); hoverDebounceTimer = null; }
      lastActivateAt = Date.now();

      const computedId = clickedProject.slug || clickedProject.title.toLowerCase().replace(/\s+/g, "-");
      const projectPath = getProjectPath(computedId);

      setCurrentPageTitleFn?.(clickedProject.title);
      setCurrentProjectTitle(clickedProject.title);
      document.documentElement.dataset.currentProjectTitle = clickedProject.title;

      const headerSubtitle = getHeaderSubtitle?.();
      if (headerSubtitle) {
        setHeaderRevealed(headerSubtitle, true);
        scrambleText(headerSubtitle, clickedProject.title);
      }

      // Navigate immediately
      document.documentElement.classList.add("transition-lock");
      navigateFn?.(projectPath);
    };

    strip.addEventListener("click", handleStripActivate);

    // The strip is an <a href>, so Enter activates it natively (fires a click).
    // Handle Space here too, which links don't activate by default.
    strip.addEventListener("keydown", (e) => {
      if (e.key === " ") {
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
  // Touch model: first tap previews a strip (expand + reveal title), a second
  // tap on the same previewed strip navigates. Avoids mis-taps on thin strips.
  let previewedStrip = null;

  function clearPreview() {
    if (currentlyTouchedStrip) {
      currentlyTouchedStrip.classList.remove("touch-hover");
      currentlyTouchedStrip = null;
    }
    previewedStrip = null;

    const currentSlug = getCurrentProjectSlug();
    if (currentSlug) {
      document.documentElement.setAttribute("data-project", currentSlug);
    } else {
      document.documentElement.removeAttribute("data-project");
    }

    const headerSubtitle = getHeaderSubtitle?.();
    if (headerSubtitle) {
      const currentPageTitle = getCurrentPageTitleFn?.() || "PROGRESS NOT PERFECTION";
      setHeaderRevealed(headerSubtitle, !!currentSlug);
      scrambleText(headerSubtitle, currentPageTitle);
    }
  }

  // Tapping anywhere outside the strips dismisses a pending preview.
  document.addEventListener(
    "touchstart",
    (e) => {
      if (!previewedStrip) return;
      const t = e.touches && e.touches[0];
      const target = t ? document.elementFromPoint(t.clientX, t.clientY) : e.target;
      if (!target?.closest?.("#strips")) clearPreview();
    },
    { passive: true }
  );

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
      // No-hover devices don't scrub strips; allow native page scrolling and
      // just record that the finger moved so touchend won't fire a tap.
      if (window.matchMedia("(hover: none)").matches) {
        if (e.touches && e.touches.length > 0) {
          const t = e.touches[0];
          if (Math.abs(t.clientX - touchStartX) > 10 || Math.abs(t.clientY - touchStartY) > 10) {
            hasMoved = true;
          }
        }
        return;
      }

      const isPortrait = window.matchMedia("(orientation: portrait)").matches;

      if (e.touches && e.touches.length > 0) {
        const t = e.touches[0];

        if (!hasMoved) {
          const direction = detectSwipeDirection(touchStartX, touchStartY, t.clientX, t.clientY);

          if (isPortrait) {
            // Portrait: vertical swipe = strip interaction, horizontal = ignore
            if (direction === "vertical") {
              isHorizontalScroll = true; // reuse flag for "is strip interaction"
              hasMoved = true;
            } else if (direction === "horizontal") {
              hasMoved = true;
              return;
            }
          } else {
            // Landscape: horizontal swipe = strip interaction, vertical = page scroll
            if (direction === "horizontal") {
              isHorizontalScroll = true;
              hasMoved = true;
            } else if (direction === "vertical") {
              hasMoved = true;
              return;
            }
          }
        }

        if (!isHorizontalScroll) return;

        // Prevent page scroll while interacting with strips
        if (e.cancelable) e.preventDefault();

        handlePoint(t.clientX, t.clientY);

        const element = document.elementFromPoint(t.clientX, t.clientY);
        // Placeholders and the filter aren't scrubbable — treat as empty space.
        const strip = element?.closest(".strip:not(.strip-placeholder):not(.strip-filter)");

        if (strip !== currentlyTouchedStrip) {
          if (currentlyTouchedStrip) {
            currentlyTouchedStrip.classList.remove("touch-hover");
          }

          if (strip) {
            strip.classList.add("touch-hover");

            const pSlug = strip.getAttribute("data-project");
            if (pSlug) document.documentElement.setAttribute("data-project", pSlug);

            const headerSubtitle = getHeaderSubtitle?.();
            if (headerSubtitle) {
              const projectTitle = strip.getAttribute("data-project-title") || getStripProjectTitle(strip);
              if (projectTitle) {
                setHeaderRevealed(headerSubtitle, true);
                scrambleText(headerSubtitle, projectTitle);
              }
            }
          } else {
            const touchCurrentSlug = getCurrentProjectSlug();
            if (touchCurrentSlug) {
              document.documentElement.setAttribute("data-project", touchCurrentSlug);
            } else {
              document.documentElement.removeAttribute("data-project");
            }

            const headerSubtitle = getHeaderSubtitle?.();
            if (headerSubtitle) {
              const currentPageTitle = getCurrentPageTitleFn?.() || "PROGRESS NOT PERFECTION";
              setHeaderRevealed(headerSubtitle, !!touchCurrentSlug);
              scrambleText(headerSubtitle, currentPageTitle);
            }
          }

          currentlyTouchedStrip = strip;
        }
      }
    },
    { passive: false }
  );

  stripsContainer.addEventListener("touchend", () => {
    // Tap without movement: first tap previews, second tap on the same strip opens
    if (!hasMoved && touchStartStrip) {
      const strip = touchStartStrip;
      touchStartStrip = null;
      hasMoved = false;

      // Tapping an unmade project does nothing, and the filter strip runs its
      // own .filter-option handlers — neither should navigate.
      if (strip.classList.contains("strip-placeholder") || strip.classList.contains("strip-filter")) {
        clearPreview();
        return;
      }

      // No-hover devices show strips without the expand/scale preview, so a
      // single tap navigates straight to the project.
      if (window.matchMedia("(hover: none)").matches) {
        if (currentlyTouchedStrip) {
          currentlyTouchedStrip.classList.remove("touch-hover");
          currentlyTouchedStrip = null;
        }
        previewedStrip = null;
        strip.click();
        return;
      }

      // Second tap on the already-previewed strip = navigate
      if (strip === previewedStrip) {
        if (currentlyTouchedStrip) {
          currentlyTouchedStrip.classList.remove("touch-hover");
          currentlyTouchedStrip = null;
        }
        previewedStrip = null;
        strip.click();
        return;
      }

      // First tap (or tap on a different strip) = preview it, don't navigate yet
      if (currentlyTouchedStrip && currentlyTouchedStrip !== strip) {
        currentlyTouchedStrip.classList.remove("touch-hover");
      }
      strip.classList.add("touch-hover");
      currentlyTouchedStrip = strip;
      previewedStrip = strip;

      const pSlug = strip.getAttribute("data-project");
      if (pSlug) document.documentElement.setAttribute("data-project", pSlug);

      const headerSubtitle = getHeaderSubtitle?.();
      if (headerSubtitle) {
        const projectTitle = strip.getAttribute("data-project-title") || getStripProjectTitle(strip);
        if (projectTitle) {
          setHeaderRevealed(headerSubtitle, true);
          scrambleText(headerSubtitle, projectTitle);
        }
      }
      return;
    }

    // Swipe ended: clean up, don't navigate, drop any pending preview
    clearPreview();
    touchStartStrip = null;
    hasMoved = false;
  });
}
