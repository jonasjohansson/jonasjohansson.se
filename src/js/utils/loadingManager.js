import { getCurrentRoute, getPathPrefix } from "./routeUtils.js";

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

  // Preload all assets based on route
  async preloadAllAssets() {
    const route = getCurrentRoute();
    const promises = [];

    // Always preload fonts
    promises.push(document.fonts?.ready || Promise.resolve());

    // Preload assets based on route
    if (route === "home") {
      promises.push(this.preloadStripImages());
    } else if (route === "about") {
      promises.push(this.preloadAboutImage());
    } else if (route === "project") {
      promises.push(this.preloadProjectImages());
    }

    // Wait for assets but cap at 4s to avoid blocking on slow connections
    await Promise.race([
      Promise.all(promises),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);

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
    const pathPrefix = getPathPrefix();
    // Preload all available about images from Eleventy data
    let imagesToPreload = [];

    if (window.__ABOUT_IMAGES__ && Array.isArray(window.__ABOUT_IMAGES__) && window.__ABOUT_IMAGES__.length > 0) {
      imagesToPreload = window.__ABOUT_IMAGES__.map((img) => {
        // Ensure path has leading slash and pathPrefix
        const normalizedPath = img.startsWith("/") ? img : `/${img}`;
        return normalizedPath.startsWith(pathPrefix) ? normalizedPath : `${pathPrefix}${normalizedPath}`;
      });
    } else {
      // Fallback: try numbered images
      const aboutImageNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      imagesToPreload = aboutImageNumbers.map((num) => {
        const paddedNum = num.toString().padStart(2, "0");
        return `${pathPrefix}/projects/about/${paddedNum}.jpg`;
      });
    }

    const imagePromises = imagesToPreload.map((imagePath) => {
      return this.loadImage(imagePath).catch(() => {
        // Ignore errors for images that don't exist
        return Promise.resolve();
      });
    });

    if (imagePromises.length > 0) {
      await Promise.all(imagePromises);
    }
  }

  async preloadProjectImages() {
    // Get project from window global
    const project = window.__INITIAL_PROJECT__;
    if (!project || !project.images || project.images.length === 0) {
      return;
    }

    // Preload all project images
    const pathPrefix = getPathPrefix();
    const imagePromises = project.images.map((img) => {
      const imageUrl = typeof img === "string" ? img : img.src;
      const normalizedUrl = imageUrl.startsWith("/") ? imageUrl : imageUrl.startsWith("http") ? imageUrl : `${pathPrefix}/${imageUrl}`;
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
    this.onCompleteCallbacks.forEach((callback) => callback());
    this.onCompleteCallbacks = [];
  }
}

export const loadingManager = new LoadingManager();
