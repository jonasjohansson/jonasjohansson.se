import { resetFilters, updateProjectViewState, applyProjectColor, updateCurrentPageTitle } from "./strips.js";
import { getProjectPath } from "./utils/pathBuilder.js";

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
    } else {
      // Extract slug from any project path (work/{slug} or about)
      let slug = relativePath.replace(/^\/work\//, "").replace(/^\/about/, "about").replace(/\/$/, "");
      if (slug) {
      this.showProject(slug);
      }
    }
  }

  showHome() {
    // Remove any existing project containers first
    const existingProjects = document.querySelectorAll("#projects");
    existingProjects.forEach((proj) => {
      if (proj && proj.parentNode) {
        proj.parentNode.removeChild(proj);
      }
    });

    // Also remove any individual project sections that might exist
    const existingProjectSections = document.querySelectorAll("section[data-project], .project.visible");
    existingProjectSections.forEach((section) => {
      if (section && section.parentNode) {
        section.parentNode.removeChild(section);
      }
    });

    // Remove project-visible class
    document.body.classList.remove("project-visible");
    document.documentElement.classList.remove("project-visible");

    // Reset header title to default
    this.updateHeaderTitle(null);

    // Reset document title to just the name
    const baseName = window.__SITE_TITLE__ || "Jonas Johansson";
    document.title = baseName;

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

    // Auto-scroll to strips position when returning home
    import("./utils/scrollPosition.js").then(({ getStripsScrollPosition }) => {
      window.scrollTo({
        top: getStripsScrollPosition(),
        behavior: "auto", // Instant for navigation
      });
    });

    // Trigger strips animation on return
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

    // Will scroll after content is loaded - see end of showProject function

    // Update header subtitle (document title stays as name)
    updateCurrentPageTitle(project.title);

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
        // Fetch if not preloaded - use unified path builder
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

      // Remove any existing project containers first
      const existingProjects = document.querySelectorAll("#projects");
      existingProjects.forEach((project) => {
        if (project.parentNode) {
          project.parentNode.removeChild(project);
        }
      });

      // Also remove any individual project sections that might exist
      const existingProjectSections = document.querySelectorAll("section[data-project], .project.visible");
      existingProjectSections.forEach((section) => {
        if (section.parentNode) {
          section.parentNode.removeChild(section);
        }
      });

      // Create new project container
      let currentProjects;
      const stripsElement = document.getElementById("strips");
      if (stripsElement && stripsElement.parentNode) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = projectContentHTML;
        const projectContent = tempDiv.firstElementChild;
        projectContent.style.opacity = "0";
        stripsElement.parentNode.insertBefore(projectContent, stripsElement);
        currentProjects = projectContent;
      }

      // Scroll to content-wrapper immediately after inserting content
      // Use requestAnimationFrame to ensure DOM is updated, then double RAF for iOS
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const contentWrapper = document.getElementById("content-wrapper");
          if (contentWrapper) {
            // Get the actual position of the content-wrapper element
            const rect = contentWrapper.getBoundingClientRect();
            const contentPosition = rect.top + window.scrollY;
            
            window.scrollTo({
              top: contentPosition,
              behavior: "auto", // Instant scroll to prevent skip
            });
          } else {
            // Fallback to old method if content-wrapper not found
      import("./utils/scrollPosition.js").then(({ getProjectScrollPosition }) => {
        window.scrollTo({
          top: getProjectScrollPosition(),
                behavior: "auto",
              });
            });
          }
        });
      });

      // Show content after DOM update
      if (currentProjects) {
        // Add project-visible class to body for styling
        document.body.classList.add("project-visible");
        document.documentElement.classList.add("project-visible");

        // Project title already set when clicking the project, no need to update here

        // Create overlay copy of strip image to prevent flash
        let stripOverlay = null;
        if (clickedStrip) {
          const stripImage = clickedStrip.querySelector(".strip-image");
          if (stripImage) {
            const bgImage = window.getComputedStyle(stripImage).backgroundImage;
            stripOverlay = document.createElement("div");
            stripOverlay.style.position = "fixed";
            stripOverlay.style.top = "0";
            stripOverlay.style.left = "0";
            stripOverlay.style.width = "100vw";
            stripOverlay.style.height = "100vh";
            stripOverlay.style.backgroundImage = bgImage;
            stripOverlay.style.backgroundSize = "cover";
            stripOverlay.style.backgroundPosition = "center";
            stripOverlay.style.backgroundRepeat = "no-repeat";
            stripOverlay.style.zIndex = "10000";
            stripOverlay.style.pointerEvents = "none";
            document.body.appendChild(stripOverlay);
          }
        }

        // Helper to fade out the expanded strip after content is ready
        const fadeOutClickedStrip = () => {
          if (!clickedStrip) return;
          clickedStrip.style.transition = "opacity 0.2s ease";
          clickedStrip.style.opacity = "0";
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
        };

        // Remove overlay after delay
        const removeOverlay = () => {
          if (stripOverlay && stripOverlay.parentNode) {
            stripOverlay.parentNode.removeChild(stripOverlay);
          }
        };

        // Reveal project content only after hero is ready, to avoid gaps
        const revealProject = () => {
          currentProjects.style.opacity = "1";
          currentProjects.style.transition = "opacity 0.2s ease";
          fadeOutClickedStrip();

          // Keep overlay briefly to blend, then remove
          setTimeout(() => {
            removeOverlay();
          }, 300);
        };

        // Start with hidden content until ready
        currentProjects.style.opacity = "0";

        // Find hero image and wait for it if possible
        const heroImage = currentProjects.querySelector(".project-hero img, .project-hero-image img, img[data-hero]");
        if (heroImage) {
          const src = heroImage.src || heroImage.getAttribute("data-src");
          const img = new Image();
          img.onload = revealProject;
          img.onerror = () => setTimeout(revealProject, 50);
          if (src) {
            img.src = src;
          } else if (heroImage.complete && heroImage.naturalWidth > 0) {
            // Already loaded
            revealProject();
          } else {
            // Fallback small delay
            setTimeout(revealProject, 100);
          }
        } else {
          // No hero image — reveal immediately
          revealProject();
        }
      } else {
        // No currentProjects, proceed with strip visibility update
        if (clickedStrip) {
          clickedStrip.style.transition = "opacity 0.2s ease";
          clickedStrip.style.opacity = "0";
          setTimeout(() => {
            clickedStrip.style.opacity = "";
            clickedStrip.style.transition = "";
            clickedStrip.style.zIndex = "";
            clickedStrip.style.flexGrow = "";
            const allStrips = document.querySelectorAll(".strip");
            allStrips.forEach((strip) => strip.classList.remove("selected", "not-selected"));
            this.updateStripVisibility(slug);
          }, 200);
        } else {
          this.updateStripVisibility(slug);
        }
      }

      // Don't scroll to top - we already scrolled to content-wrapper above

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
