// Loading manager for preloading images
export class LoadingManager {
  constructor() {
    this.loadedImages = 0;
    this.totalImages = 0;
    this.isLoading = true;
    this.originalTitle = document.title;
    this.onCompleteCallbacks = [];

    // Add loading class to body
    document.body.classList.add("loading");
  }

  // Register callback to be called when loading completes
  onComplete(callback) {
    if (this.isLoading) {
      this.onCompleteCallbacks.push(callback);
    } else {
      // Already loaded, call immediately
      callback();
    }
  }

  // Determine current route
  getCurrentRoute() {
    const pathPrefix = window.__PATH_PREFIX__ || "";
    const currentPath = window.location.pathname;
    const relativePath = pathPrefix ? currentPath.replace(pathPrefix, "") : currentPath;
    
    if (relativePath === "/about" || relativePath === "/about/") {
      return "about";
    } else if (relativePath.startsWith("/work/")) {
      return "project";
    } else {
      return "home";
    }
  }

  // Preload all assets based on route
  async preloadAllAssets() {
    const route = this.getCurrentRoute();
    const promises = [];

    // Always preload fonts
    promises.push(
      document.fonts?.ready || Promise.resolve()
    );

    // Preload assets based on route
    if (route === "home") {
      promises.push(this.preloadStripImages());
    } else if (route === "about") {
      promises.push(this.preloadAboutImage());
    } else if (route === "project") {
      promises.push(this.preloadProjectImages());
    }

    // Wait for all assets to load
    await Promise.all(promises);
    
    this.completeLoading();
  }

  async preloadStripImages() {
    const strips = document.querySelectorAll(".strip");
    
    if (strips.length === 0) {
      return;
    }

    // Preload all strip images
    const imagePromises = [];
    
    strips.forEach((strip) => {
      const stripImage = strip.querySelector(".strip-image");
      if (stripImage) {
        const bgImage = stripImage.getAttribute("data-bg-image");
        if (bgImage) {
          imagePromises.push(this.loadImage(bgImage));
        }
      }
    });

    if (imagePromises.length > 0) {
      await Promise.all(imagePromises);
    }
  }

  async preloadAboutImage() {
    const pathPrefix = window.__PATH_PREFIX__ || "";
    const aboutImagePath = `${pathPrefix}/projects/about/01.jpg`;
    await this.loadImage(aboutImagePath);
  }

  async preloadProjectImages() {
    // Get project from window global
    const project = window.__INITIAL_PROJECT__;
    if (!project || !project.images || project.images.length === 0) {
      return;
    }

    // Preload all project images
    const imagePromises = project.images.map((img) => {
      const imageUrl = typeof img === "string" ? img : img.src;
      const pathPrefix = window.__PATH_PREFIX__ || "";
      const normalizedUrl = imageUrl.startsWith("/") 
        ? imageUrl 
        : imageUrl.startsWith("http") 
        ? imageUrl 
        : `${pathPrefix}/${imageUrl}`;
      return this.loadImage(normalizedUrl);
    });

    if (imagePromises.length > 0) {
      await Promise.all(imagePromises);
    }
  }

  loadImage(url) {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        this.loadedImages++;
        resolve();
      };

      img.onerror = () => {
        this.loadedImages++;
        resolve(); // Continue even if image fails
      };

      img.src = url;
    });
  }

  completeLoading() {
    // Restore original title when loading is complete
    document.title = this.originalTitle;
    this.isLoading = false;
    document.body.classList.remove("loading");
    document.body.classList.add("loaded");
    
    // Call all registered callbacks
    this.onCompleteCallbacks.forEach(callback => callback());
    this.onCompleteCallbacks = [];
  }
}

export const loadingManager = new LoadingManager();
