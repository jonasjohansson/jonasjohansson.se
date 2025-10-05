import { resetFilters } from "./strips.js";

const projects = window.__PROJECTS_DATA__ || [];
const pathPrefix = window.__PATH_PREFIX__ || "";

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

    this.updateStripVisibility(null);
    window.scrollTo(0, 0);
  }

  async showProject(slug) {
    const project = projects.find((p) => p.slug === slug);

    if (!project) {
      console.warn("Project not found:", slug);
      return;
    }

    // Reset any active filters when entering a project
    resetFilters();

    const clickedStrip = document.querySelector(`.strip[data-project="${slug}"]`);

    try {
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

      let currentProjects = document.getElementById("projects");
      if (currentProjects) {
        currentProjects.style.opacity = "0";
        currentProjects.innerHTML = projectContent.innerHTML;
        currentProjects.classList.add("visible");
      } else {
        const stripsElement = document.getElementById("strips");
        if (stripsElement && stripsElement.parentNode) {
          projectContent.style.opacity = "0";
          stripsElement.parentNode.insertBefore(projectContent, stripsElement);
          currentProjects = projectContent;
        }
      }

      if (clickedStrip) {
        clickedStrip.style.transition = "flex-grow 1.2s ease-out";
        clickedStrip.style.flexGrow = "100";
        clickedStrip.style.zIndex = "300";

        const waitForProjectReady = () => {
          return new Promise((resolve) => {
            if (currentProjects) {
              currentProjects.style.opacity = "1";
              currentProjects.style.transition = "opacity 0.4s ease";
            }

            setTimeout(() => {
              clickedStrip.style.opacity = "0";
              clickedStrip.style.transition = "opacity 0.3s ease";

              setTimeout(() => {
                clickedStrip.style.opacity = "";
                clickedStrip.style.transition = "";
                clickedStrip.style.zIndex = "";
                clickedStrip.style.flexGrow = "";

                this.updateStripVisibility(slug);
                resolve();
              }, 300);
            }, 400);
          });
        };

        setTimeout(waitForProjectReady, 300);
      } else {
        this.updateStripVisibility(slug);
      }

      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Error loading project:", error);
    }
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
