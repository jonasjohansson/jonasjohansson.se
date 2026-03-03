import { getStripsScrollPosition, getProjectScrollPosition } from "./utils/scrollPosition.js";
import { getProjectPath } from "./utils/pathBuilder.js";
import { getPathPrefix } from "./utils/routeUtils.js";
import { preloadCache } from "./strips.js";

const projects = window.__PROJECTS_DATA__ || [];
const pathPrefix = getPathPrefix();

// Reset project colors to default
function resetProjectColors() {
  document.documentElement.style.removeProperty("--project-accent-color");
  document.documentElement.style.removeProperty("--project-accent-color-light");
  document.documentElement.style.removeProperty("--project-accent-color-dark");
}

// Remove all existing project containers from the DOM
function clearExistingProjects() {
  document.querySelectorAll("#projects").forEach((el) => el.remove());
  document.querySelectorAll("section[data-project], .project.visible").forEach((el) => el.remove());
}

class SPARouter {
  constructor() {
    this.currentRoute = null;
    this.initialized = false;
    this._hooks = {};
  }

  // Register callbacks to decouple router from strips/aboutOverlay modules
  registerHooks(hooks) {
    Object.assign(this._hooks, hooks);
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    window.addEventListener("popstate", () => {
      this.navigate(window.location.pathname, false);
    });

    this.currentRoute = window.location.pathname;
  }

  navigate(path, pushState = true) {
    if (this.currentRoute === path) return;

    if (pushState) {
      window.history.pushState({ route: path }, "", path);
    }
    this.currentRoute = path;

    const relativePath = pathPrefix ? path.replace(pathPrefix, "") : path;

    if (relativePath === "/about" || relativePath === "/about/") {
      this.showHome(true, true);
      this.announce("About");
      return;
    }

    if (relativePath === "/" || relativePath === "/index.html" || relativePath === "") {
      this.showHome();
      this.announce("Home");
    } else {
      const slug = relativePath.replace(/^\/work\//, "").replace(/\/$/, "");
      if (slug) this.showProject(slug);
    }
  }


  async showHome(showAboutOverlay = false, immediate = false) {
    document.documentElement.classList.add("transition-lock");
    document.body.setAttribute("data-route", "home");
    document.body.classList.remove("about-visible", "project-visible");

    if (!showAboutOverlay) {
      this._hooks.hideAbout?.(true);
    }

    clearExistingProjects();

    document.body.classList.remove("project-visible");
    document.documentElement.classList.remove("project-visible");

    document.title = window.__SITE_TITLE__ || "Jonas Johansson";

    // Reset all strip inline styles and classes (from expanded state)
    const allStrips = document.querySelectorAll(".strip");
    allStrips.forEach((strip) => {
      const computedFlexGrow = window.getComputedStyle(strip).flexGrow;
      strip.style.flexGrow = "";
      strip.style.zIndex = "";
      strip.style.opacity = "";
      strip.style.transition = "";
      strip.classList.remove("touch-hover", "selected", "not-selected");
      if (computedFlexGrow !== "1" && computedFlexGrow !== "0") {
        strip.style.flexGrow = "1";
      }
    });

    this.updateStripVisibility(null);

    window.scrollTo({
      top: getStripsScrollPosition(),
      behavior: "auto",
    });

    const stripsContainer = document.getElementById("strips");
    if (stripsContainer) {
      stripsContainer.style.opacity = "1";
      stripsContainer.style.visibility = "visible";
      stripsContainer.style.display = "";
      stripsContainer.classList.add("animate-in");

      if (!stripsContainer.classList.contains("strips-initialized")) {
        this._hooks.initializeStrips?.();
      } else {
        // Strips already initialized, unlock after a short settle
        setTimeout(() => document.documentElement.classList.remove("transition-lock"), 400);
      }
    } else {
      document.documentElement.classList.remove("transition-lock");
    }

    resetProjectColors();
    document.documentElement.removeAttribute("data-project");

    if (showAboutOverlay) {
      this._hooks.initAbout?.();
      if (immediate) {
        this._hooks.showAbout?.(true);
      } else {
        this._hooks.showAbout?.();
      }
    }
  }

  async showProject(slug) {
    const project = projects.find((p) => p.slug === slug);
    if (!project) {
      console.warn("Project not found:", slug);
      return;
    }

    document.body.setAttribute("data-route", "project");
    document.body.classList.remove("about-visible");
    document.documentElement.setAttribute("data-project", slug);
    this._hooks.hideAbout?.(true);

    this._hooks.updateCurrentPageTitle?.(project.title);
    this._hooks.resetFilters?.();
    this.announce(project.title);

    // Load strip images on project pages without full initialization
    const stripsContainer = document.getElementById("strips");
    if (stripsContainer) {
      stripsContainer.querySelectorAll(".strip-image").forEach((img) => {
        const bgImage = img.getAttribute("data-bg-image");
        if (bgImage && !img.style.backgroundImage) {
          img.style.backgroundImage = `url('${bgImage}')`;
          img.classList.add("loaded");
        }
      });
    }

    // Hide current project's strip immediately
    this.updateStripVisibility(slug);

    const clickedStrip = document.querySelector(`.strip[data-project="${slug}"]`);

    try {
      let projectContentHTML;

      if (preloadCache.has(slug)) {
        projectContentHTML = preloadCache.get(slug);
      } else {
        const fetchPath = getProjectPath(slug);
        const response = await fetch(fetchPath);
        if (!response.ok) throw new Error(`Failed to fetch project: ${response.status}`);

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const projectContent = doc.querySelector("#projects");

        if (!projectContent) {
          console.warn("Project content not found in response");
          document.documentElement.classList.remove("transition-lock");
          return;
        }

        projectContentHTML = projectContent.innerHTML;
      }

      clearExistingProjects();

      // Create new project container
      let currentProjects;
      const stripsElement = document.getElementById("strips");
      if (stripsElement?.parentNode) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = projectContentHTML;
        const projectContent = tempDiv.firstElementChild;
        projectContent.style.opacity = "0";
        stripsElement.parentNode.insertBefore(projectContent, stripsElement);
        currentProjects = projectContent;
      }

      const resetClickedStrip = () => {
        if (!clickedStrip) return;
        clickedStrip.style.transition = "opacity 0.1s ease";
        clickedStrip.style.opacity = "0";
        setTimeout(() => {
          clickedStrip.style.opacity = "";
          clickedStrip.style.transition = "";
          clickedStrip.style.zIndex = "";
          clickedStrip.style.flexGrow = "";
          document.querySelectorAll(".strip").forEach((s) => s.classList.remove("selected", "not-selected"));
          this.updateStripVisibility(slug);
        }, 100);
      };

      // Scroll to project content (called after transition-lock is removed so scroll works)
      const scrollToProject = () => {
        requestAnimationFrame(() => {
          const contentWrapper = document.getElementById("content");
          if (contentWrapper) {
            const contentPosition = contentWrapper.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({ top: contentPosition, behavior: "auto" });
          } else {
            window.scrollTo({ top: getProjectScrollPosition(), behavior: "auto" });
          }
        });
      };

      if (currentProjects) {
        document.body.classList.add("project-visible");
        document.documentElement.classList.add("project-visible");

        // Create overlay copy of strip image to prevent flash
        let stripOverlay = null;
        if (clickedStrip) {
          const stripImage = clickedStrip.querySelector(".strip-image");
          if (stripImage) {
            const computed = window.getComputedStyle(stripImage);
            const bgImage = computed.backgroundImage;
            stripOverlay = document.createElement("div");
            Object.assign(stripOverlay.style, {
              position: "fixed", top: "0", left: "0",
              width: "100vw", height: "100vh",
              backgroundImage: bgImage, backgroundSize: "cover",
              backgroundPosition: "center", backgroundRepeat: "no-repeat",
              zIndex: "150", pointerEvents: "none",
            });
            document.body.appendChild(stripOverlay);
          }
        }

        let revealed = false;
        const revealProject = () => {
          if (revealed) return;
          revealed = true;

          // Fade in project content while overlay stays solid on top
          currentProjects.style.transition = "opacity 0.3s ease";
          currentProjects.style.opacity = "1";

          // Wait for project to be fully opaque, then remove overlay and unlock scroll
          setTimeout(() => {
            stripOverlay?.remove();
            resetClickedStrip();
            document.documentElement.classList.remove("transition-lock");
            scrollToProject();
          }, 350);
        };

        currentProjects.style.opacity = "0";

        const heroEl = currentProjects.querySelector(".media-item.hero img, .media-item.hero video, .project-hero img");
        if (heroEl && heroEl.tagName === "VIDEO") {
          // For video heroes, reveal once metadata/first frame is ready
          if (heroEl.readyState >= 2) {
            revealProject();
          } else {
            heroEl.addEventListener("loadeddata", revealProject, { once: true });
            setTimeout(revealProject, 1000); // Fallback timeout
          }
        } else if (heroEl) {
          // Force eager loading so browser fetches while container is hidden
          heroEl.loading = "eager";
          const src = heroEl.src || heroEl.getAttribute("data-src");
          const img = new Image();
          img.onload = revealProject;
          img.onerror = () => setTimeout(revealProject, 50);
          if (src) {
            img.src = src;
          } else if (heroEl.complete && heroEl.naturalWidth > 0) {
            revealProject();
          } else {
            setTimeout(revealProject, 300);
          }
        } else {
          revealProject();
        }
      } else {
        resetClickedStrip();
        if (!clickedStrip) this.updateStripVisibility(slug);
        document.documentElement.classList.remove("transition-lock");
        scrollToProject();
      }

      await this._hooks.applyProjectColor?.(project);
    } catch (error) {
      console.error("Error loading project:", error);
      document.documentElement.classList.remove("transition-lock");
    }
  }

  updateStripVisibility(currentProjectSlug) {
    document.querySelectorAll(".strip").forEach((strip) => {
      if (currentProjectSlug && strip.getAttribute("data-project") === currentProjectSlug) {
        strip.classList.add("hidden");
      } else {
        strip.classList.remove("hidden");
      }
    });
  }

  announce(text) {
    const el = document.getElementById("route-announcer");
    if (el) {
      el.textContent = "";
      requestAnimationFrame(() => { el.textContent = `Navigated to ${text}`; });
    }
  }

  goHome() {
    const homePath = pathPrefix ? `${pathPrefix}/` : "/";
    this.navigate(homePath);
  }
}

export const router = new SPARouter();
