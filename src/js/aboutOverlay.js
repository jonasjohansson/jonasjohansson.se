import { getPathPrefix } from "./utils/routeUtils.js";
import { getCurrentProjectTitle } from "./utils/state.js";

class AboutOverlay {
  constructor() {
    this.headerToggle = null;
    this.headerSubtitle = null;
    this.aboutOverlay = null;
    this.headerCenter = null;
    this.defaultSubtitleText = "PROGRESS NOT PERFECTION";
    this.initialized = false;
    this._routerRef = null;
  }

  init(routerRef) {
    if (routerRef) this._routerRef = routerRef;
    if (this.initialized) return;

    this.headerToggle = document.getElementById("header-toggle");
    this.headerSubtitle = document.getElementById("header-subtitle");
    this.aboutOverlay = document.getElementById("about");

    if (!this.headerToggle || !this.headerSubtitle || !this.aboutOverlay) return;

    this.headerCenter = this.headerToggle.closest(".header-center");
    if (!this.headerCenter) return;

    this.defaultSubtitleText = (
      this.headerSubtitle.dataset.defaultSubtitle ||
      this.headerSubtitle.textContent ||
      "PROGRESS NOT PERFECTION"
    ).trim();

    this.pathPrefix = getPathPrefix();
    this.initialized = true;

    this._attachEventListeners();
  }

  // --- Public API ---

  isVisible() {
    return this.aboutOverlay?.classList.contains("visible") ?? false;
  }

  async show(immediate = false) {
    if (!this.initialized) return;

    const aboutPath = this._getAboutPath();
    const currentPath = window.location.pathname;

    if (currentPath !== aboutPath) {
      this.aboutOverlay.dataset.previousPath = currentPath;
    }

    document.body.classList.add("about-visible");
    this.aboutOverlay.classList.add("visible");
    this._setSubtitle(this.defaultSubtitleText);
    this.headerCenter.classList.add("overlay-active");

    window.scrollTo({ top: 0, behavior: "smooth" });

    if (this._routerRef && currentPath !== aboutPath) {
      window.history.pushState({ route: aboutPath }, "", aboutPath);
      if (this._routerRef.currentRoute !== undefined) {
        this._routerRef.currentRoute = aboutPath;
      }
    }
  }

  hide(skipNavigation = false) {
    if (!this.initialized) return;

    const aboutPath = this._getAboutPath();
    const homePath = this.pathPrefix ? `${this.pathPrefix}/` : "/";

    // Remove data attributes immediately
    this.aboutOverlay.removeAttribute("data-initial-about");
    document.body.removeAttribute("data-initial-about");

    this.aboutOverlay.classList.remove("visible");
    document.body.classList.remove("about-visible");

    // Reset scroll position so user isn't stranded after about collapses
    window.scrollTo({ top: 0, behavior: "instant" });

    const isProjectView = document.body.classList.contains("project-visible");
    const storedTitle = getCurrentProjectTitle()?.trim();
    const nextSubtitle = isProjectView && storedTitle ? storedTitle : this.defaultSubtitleText;
    this._setSubtitle(nextSubtitle);
    this.headerCenter.classList.remove("overlay-active");

    if (!skipNavigation) {
      const storedPreviousPath = this.aboutOverlay.dataset.previousPath;
      delete this.aboutOverlay.dataset.previousPath;

      let targetPath = storedPreviousPath || homePath;
      if (!targetPath || targetPath === aboutPath || targetPath.includes("/about")) {
        targetPath = homePath;
      }

      // Restore URL and router state without full re-navigation
      window.history.pushState({ route: targetPath }, "", targetPath);
      if (this._routerRef) {
        this._routerRef.currentRoute = targetPath;
      }
    }
  }

  toggle() {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  // --- Private Helpers ---

  _getAboutPath() {
    return this.pathPrefix ? `${this.pathPrefix}/about/` : "/about/";
  }

  _setSubtitle(text, fadeIn = false) {
    if (!this.headerSubtitle) return;
    const targetText = (text || this.defaultSubtitleText).trim().toUpperCase();

    if (fadeIn) {
      this.headerSubtitle.style.opacity = "0";
      this.headerSubtitle.style.transition = "opacity 0.3s ease";
      requestAnimationFrame(() => {
        this.headerSubtitle.textContent = targetText;
        requestAnimationFrame(() => {
          this.headerSubtitle.style.opacity = "1";
        });
      });
    } else {
      this.headerSubtitle.textContent = targetText;
    }
  }

  _attachEventListeners() {
    // Click outside to close
    this.aboutOverlay.addEventListener("click", (event) => {
      if (event.target === this.aboutOverlay) {
        this.hide();
      }
    });

    // Escape key to close
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isVisible()) {
        this.hide();
      }
    });

    // Header toggle interaction
    const handleInteraction = (event) => {
      event.stopPropagation();
      this.toggle();
      if (this.headerToggle) this.headerToggle.blur();
      if (this.headerCenter) this.headerCenter.blur();
    };

    this.headerToggle.addEventListener("click", handleInteraction, true);
    this.headerCenter.addEventListener("click", handleInteraction, true);

    // Reset subtitle when mouse leaves header
    const handleMouseLeave = () => {
      if (this.isVisible()) return;
      const isProjectView = document.body.classList.contains("project-visible");
      const storedTitle = getCurrentProjectTitle()?.trim();
      const nextSubtitle = isProjectView && storedTitle ? storedTitle : this.defaultSubtitleText;
      this._setSubtitle(nextSubtitle);
    };

    this.headerCenter.addEventListener("mouseleave", handleMouseLeave);
    this.headerToggle.addEventListener("mouseleave", handleMouseLeave);
  }
}

export const aboutOverlay = new AboutOverlay();
