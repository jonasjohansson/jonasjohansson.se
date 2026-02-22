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

  randomizeHeaderAngles() {
    const titleEl = document.querySelector('.header-title');
    const subtitleEl = document.querySelector('.header-subtitle');
    const titleDir = Math.random() < 0.5 ? -1 : 1;
    const subtitleDir = Math.random() < 0.5 ? -1 : 1;
    if (titleEl) titleEl.style.transform = `rotate(${(titleDir * (2 + Math.random() * 8)).toFixed(1)}deg)`;
    if (subtitleEl) subtitleEl.style.transform = `rotate(${(subtitleDir * (2 + Math.random() * 8)).toFixed(1)}deg)`;
  }

  resetHeaderAngles() {
    const titleEl = document.querySelector('.header-title');
    const subtitleEl = document.querySelector('.header-subtitle');
    if (titleEl) titleEl.style.transform = '';
    if (subtitleEl) subtitleEl.style.transform = '';
  }

  async showHome(showAboutOverlay = false, immediate = false) {
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
      }
    }

    resetProjectColors();
    this.resetHeaderAngles();
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

      // Scroll to content
      requestAnimationFrame(() => {
        const contentWrapper = document.getElementById("content");
        if (contentWrapper) {
          const contentPosition = contentWrapper.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: contentPosition, behavior: "auto" });
        } else {
          window.scrollTo({ top: getProjectScrollPosition(), behavior: "auto" });
        }
      });

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

      if (currentProjects) {
        document.body.classList.add("project-visible");
        document.documentElement.classList.add("project-visible");

        // Create overlay copy of strip image to prevent flash
        let stripOverlay = null;
        if (clickedStrip) {
          const stripImage = clickedStrip.querySelector(".strip-image");
          if (stripImage) {
            const bgImage = window.getComputedStyle(stripImage).backgroundImage;
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

        const revealProject = () => {
          currentProjects.style.transition = "opacity 0.3s ease";
          currentProjects.style.opacity = "1";

          // Fade out overlay in sync, then clean up after project is fully visible
          if (stripOverlay) {
            stripOverlay.style.transition = "opacity 0.3s ease";
            stripOverlay.style.opacity = "0";
          }

          setTimeout(() => {
            stripOverlay?.remove();
            resetClickedStrip();
          }, 300);
        };

        currentProjects.style.opacity = "0";

        const heroImage = currentProjects.querySelector(".project-hero img, .project-hero-image img, img[data-hero]");
        if (heroImage) {
          const src = heroImage.src || heroImage.getAttribute("data-src");
          const img = new Image();
          img.onload = revealProject;
          img.onerror = () => setTimeout(revealProject, 50);
          if (src) {
            img.src = src;
          } else if (heroImage.complete && heroImage.naturalWidth > 0) {
            revealProject();
          } else {
            setTimeout(revealProject, 50);
          }
        } else {
          revealProject();
        }
      } else {
        resetClickedStrip();
        if (!clickedStrip) this.updateStripVisibility(slug);
      }

      this.randomizeHeaderAngles();
      await this._hooks.applyProjectColor?.(project);
    } catch (error) {
      console.error("Error loading project:", error);
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
