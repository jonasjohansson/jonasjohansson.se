import { resetFilters, updateProjectViewState, applyProjectColor } from "./strips.js";

const projects = window.__PROJECTS_DATA__ || [];
const pathPrefix = window.__PATH_PREFIX__ || "";

// Reset project colors to default
function resetProjectColors() {
  document.documentElement.style.removeProperty("--project-accent-color");
  document.documentElement.style.removeProperty("--project-accent-color-light");
  document.documentElement.style.removeProperty("--project-accent-color-dark");
}

class SPARouter {
  constructor() {
    this.currentRoute = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    window.addEventListener("popstate", (event) => {
      const path = window.location.pathname;
      this.navigate(path, false);
    });

    const currentPath = window.location.pathname;
    this.currentRoute = currentPath;
  }

  navigate(path, pushState = true) {
    // Prevent re-navigation to the same route
    if (this.currentRoute === path) {
      return;
    }

    if (pushState) {
      window.history.pushState({ route: path }, "", path);
    }
    this.currentRoute = path;

    const relativePath = pathPrefix ? path.replace(pathPrefix, "") : path;

    if (relativePath === "/" || relativePath === "/index.html" || relativePath === "") {
      this.showHome();
    } else if (relativePath.startsWith("/work/")) {
      const slug = relativePath.replace("/work/", "").replace(/\/$/, "");
      this.showProject(slug);
    }
  }

  showHome() {
    const projectsContainer = document.getElementById("projects");
    if (projectsContainer) {
      projectsContainer.innerHTML = "";
      projectsContainer.classList.remove("visible");
    }

    // Reset header title to default
    this.updateHeaderTitle(null);

    // Reset document title to default
    document.title = "Jonas Johansson";

    // Reset all strip inline styles and classes (from expanded state)
    const allStrips = document.querySelectorAll(".strip");
    allStrips.forEach((strip) => {
      const computedFlexGrow = window.getComputedStyle(strip).flexGrow;

      strip.style.flexGrow = "";
      strip.style.zIndex = "";
      strip.style.opacity = "";
      strip.style.transition = "";
      strip.classList.remove("touch-hover", "selected", "not-selected");

      // Force override if computed flex-grow is still high (from lingering CSS)
      if (computedFlexGrow !== "1" && computedFlexGrow !== "0") {
        strip.style.flexGrow = "1";
      }
    });

    this.updateStripVisibility(null);
    window.scrollTo(0, 0);

    // Trigger strips animation
    const stripsContainer = document.getElementById("strips");
    if (stripsContainer) {
      stripsContainer.classList.add("animate-in");
    }

    if (updateProjectViewState) {
      updateProjectViewState();
    }

    // Reset project colors when returning to home
    resetProjectColors();
  }

  async showProject(slug) {
    const project = projects.find((p) => p.slug === slug);

    if (!project) {
      console.warn("Project not found:", slug);
      return;
    }

    // Update document title to project name
    document.title = `${project.title} - Jonas Johansson`;

    // Reset any active filters when entering a project
    resetFilters();

    const clickedStrip = document.querySelector(`.strip[data-project="${slug}"]`);

    // Start strip animation immediately
    if (clickedStrip) {
      clickedStrip.style.transition = "flex-grow 0.8s ease-out";
      clickedStrip.style.flexGrow = "100";
      clickedStrip.style.zIndex = "300";
      clickedStrip.classList.add("selected");
    }

    try {
      let projectContentHTML;

      // Check if content is preloaded
      if (window.preloadCache && window.preloadCache.has(slug)) {
        projectContentHTML = window.preloadCache.get(slug);
      } else {
        // Fetch if not preloaded
        const fetchPath = pathPrefix ? `${pathPrefix}/work/${slug}/` : `/work/${slug}/`;
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

      let currentProjects = document.getElementById("projects");
      if (currentProjects) {
        // Clear any existing content and reset
        currentProjects.innerHTML = "";
        currentProjects.style.opacity = "0";
        currentProjects.classList.remove("visible");

        // Small delay to ensure DOM is cleared
        setTimeout(() => {
          currentProjects.innerHTML = projectContentHTML;
          currentProjects.classList.add("visible");
        }, 50);
      } else {
        const stripsElement = document.getElementById("strips");
        if (stripsElement && stripsElement.parentNode) {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = projectContentHTML;
          const projectContent = tempDiv.firstElementChild;
          projectContent.style.opacity = "0";
          stripsElement.parentNode.insertBefore(projectContent, stripsElement);
          currentProjects = projectContent;
        }
      }

      // Show content after DOM update
      if (currentProjects) {
        setTimeout(() => {
          currentProjects.style.opacity = "1";
          currentProjects.style.transition = "opacity 0.2s ease";
        }, 100);

        // Preload hero image immediately
        const heroImage = currentProjects.querySelector(".project-hero img, .project-hero-image img, img[data-hero]");
        if (heroImage) {
          const img = new Image();
          img.src = heroImage.src || heroImage.getAttribute("data-src");
          img.onload = () => {
            heroImage.style.opacity = "1";
          };
        }
      }

      if (clickedStrip) {
        // Faster strip transition
        setTimeout(() => {
          clickedStrip.style.opacity = "0";
          clickedStrip.style.transition = "opacity 0.2s ease";

          setTimeout(() => {
            clickedStrip.style.opacity = "";
            clickedStrip.style.transition = "";
            clickedStrip.style.zIndex = "";
            clickedStrip.style.flexGrow = "";

            // Remove selection classes from all strips
            const allStrips = document.querySelectorAll(".strip");
            allStrips.forEach((strip) => {
              strip.classList.remove("selected", "not-selected");
            });

            this.updateStripVisibility(slug);
          }, 200);
        }, 200);
      } else {
        this.updateStripVisibility(slug);
      }

      window.scrollTo(0, 0);

      if (updateProjectViewState) {
        updateProjectViewState();
      }

      await applyProjectColor(project);
    } catch (error) {
      console.error("Error loading project:", error);
    }
  }

  updateHeaderTitle(projectTitle) {
    // Don't update header title - keep as "PROGRESS NOT PERFECTION"
    // This function is kept for compatibility but does nothing
  }

  updateStripVisibility(currentProjectSlug) {
    const allStrips = document.querySelectorAll(".strip");

    allStrips.forEach((strip) => {
      const stripSlug = strip.getAttribute("data-project");

      if (currentProjectSlug && stripSlug === currentProjectSlug) {
        strip.classList.add("hidden");
      } else {
        strip.classList.remove("hidden");
      }
    });
  }

  goHome() {
    const homePath = pathPrefix ? `${pathPrefix}/` : "/";
    this.navigate(homePath);
  }
}

export const router = new SPARouter();
router.init();
