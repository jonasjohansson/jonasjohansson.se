// Modern SPA Router using History API
import { projects, IMAGE_VERSION } from "./config/projects.js";

class SPARouter {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.initialized = false;
    this.basePath = this.detectBasePath();
  }

  detectBasePath() {
    const pathname = window.location.pathname;
    // If we're in a subdirectory, extract the base path
    const parts = pathname.split("/");
    if (parts.length > 2) {
      return parts.slice(0, -1).join("/") || "/";
    }
    return "/";
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Handle browser back/forward buttons
    window.addEventListener("popstate", (event) => {
      this.handleRouteChange(event.state?.route || this.getCurrentPath());
    });

    // Handle initial page load
    this.handleRouteChange(this.getCurrentPath());
  }

  getCurrentPath() {
    const fullPath = window.location.pathname;
    // Remove the base path if we're in a subdirectory
    if (fullPath.startsWith(this.basePath)) {
      return fullPath.substring(this.basePath.length) || "/";
    }
    return fullPath;
  }

  // Register a route
  route(path, handler) {
    this.routes.set(path, handler);
  }

  // Navigate to a route
  navigate(path, data = {}) {
    // Update URL without page reload
    const fullPath = path === "/" ? this.basePath : `${this.basePath}${path}`;
    window.history.pushState({ route: path, data }, "", fullPath);
    this.handleRouteChange(path, data);
  }

  // Handle route changes
  handleRouteChange(path, data = {}) {
    // Check for exact match first
    let handler = this.routes.get(path);

    // If no exact match, check for dynamic routes
    if (!handler) {
      if (path.startsWith("/project/")) {
        const projectId = path.split("/").pop();
        this.currentRoute = path;
        showProjectView(projectId);
        return;
      }
    }

    if (handler) {
      this.currentRoute = path;
      handler(data);
    } else {
      // Default to home if route not found - but avoid recursion
      if (path !== "/") {
        this.navigate("/");
      } else {
        // If we're already at home and no handler exists, just show the default view
        console.warn("No route handler found for:", path);
      }
    }
  }

  // Go back to home
  goHome() {
    this.navigate("/");
  }
}

// Create router instance
export const router = new SPARouter();

// Route handlers
router.route("/", () => {
  showHomeView();
});

// View functions
function showHomeView() {
  const projectDetail = document.getElementById("project-detail");
  const stage = document.getElementById("stage");
  const headerSubtitle = document.querySelector(".header-subtitle");

  if (projectDetail) {
    // Hide project detail
    projectDetail.classList.remove("visible");
    projectDetail.classList.add("hidden");
  }

  if (stage) {
    // Show strips normally
    stage.classList.remove("transitioning");
    stage.style.display = "block";
    stage.style.transform = "translateY(0)";
  }

  // Reset header subtitle
  if (headerSubtitle) {
    headerSubtitle.textContent = "PROGRESS NOT PERFECTION";
  }

  // Reset scroll position
  window.scrollTo(0, 0);
}

function showProjectView(projectId) {
  const projectDetail = document.getElementById("project-detail");
  const projectImage = document.getElementById("project-detail-image");
  const projectTitle = document.getElementById("project-detail-title");
  const projectBody = document.getElementById("project-detail-body");

  // Get project data
  const project = getProjectById(projectId);

  if (project) {
    // Get the image URL (use first image from array if available)
    let imageUrl = Array.isArray(project.images) ? project.images[0] : project.image;

    // Add cache busting parameter if IMAGE_VERSION is defined
    if (typeof IMAGE_VERSION !== "undefined") {
      imageUrl = `${imageUrl}?v=${IMAGE_VERSION}`;
    }

    // Set full-screen background image
    projectImage.style.backgroundImage = `url('${imageUrl}')`;

    // Hide the title in the content area (title is already in header)
    projectTitle.style.display = "none";

    // Update project content - simplified without title, year, tags
    projectBody.innerHTML = `
      <div class="project-info">
        <p>This is a detailed view of the project. You can add more content here, including descriptions, images, videos, or any other project details.</p>
      </div>
    `;

    // Show project detail as fullscreen overlay
    projectDetail.classList.remove("hidden");
    projectDetail.classList.add("visible");
  }
}

// Helper function to get project by ID
function getProjectById(id) {
  // Find project by title (converted to slug)
  return projects.find((project) => project.title.toLowerCase().replace(/\s+/g, "-") === id);
}

// Initialize back button
document.addEventListener("DOMContentLoaded", () => {
  const backButton = document.getElementById("back-button");
  if (backButton) {
    backButton.addEventListener("click", () => {
      router.goHome();
    });
  }
});

// Export for use in other modules
export { showHomeView, showProjectView };
