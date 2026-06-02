import { getCurrentRoute, getPathPrefix } from "./routeUtils.js";

// Loading manager for preloading images
export class LoadingManager {
  constructor() {
    this.loadedImages = 0;
    this.totalImages = 0;
    this.isLoading = true;
    this.baseName = window.__SITE_TITLE__ || document.title || "Jonas Johansson";
    this.onCompleteCallbacks = [];

    document.body.classList.add("loading");
  }

  onComplete(callback) {
    if (this.isLoading) {
      this.onCompleteCallbacks.push(callback);
    } else {
      callback();
    }
  }

  updateTitleProgress() {
    if (this.totalImages === 0) return;
    const pct = Math.round((this.loadedImages / this.totalImages) * 100);
    document.title = `${this.baseName} ${pct}%`;
  }

  async preloadAllAssets() {
    const route = getCurrentRoute();
    const promises = [];

    promises.push(document.fonts?.ready || Promise.resolve());

    if (route === "project") {
      promises.push(this.preloadProjectImages());
    }

    await Promise.race([
      Promise.all(promises),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);

    this.completeLoading();
  }

  async preloadStripImages() {
    const strips = document.querySelectorAll(".strip");
    if (strips.length === 0) return;

    const imagePromises = [];
    strips.forEach((strip) => {
      const stripImage = strip.querySelector(".strip-image");
      if (stripImage) {
        const bgImage = stripImage.getAttribute("data-bg-image");
        if (bgImage) {
          this.totalImages++;
          imagePromises.push(this.loadImage(bgImage));
        }
      }
    });

    this.updateTitleProgress();
    if (imagePromises.length > 0) await Promise.all(imagePromises);
  }

  async preloadProjectImages() {
    const project = window.__INITIAL_PROJECT__;
    if (!project || !project.images || project.images.length === 0) return;

    const pathPrefix = getPathPrefix();
    this.totalImages += project.images.length;
    this.updateTitleProgress();

    const imagePromises = project.images.map((img) => {
      const imageUrl = typeof img === "string" ? img : img.src;
      const normalizedUrl = imageUrl.startsWith("/") ? imageUrl : imageUrl.startsWith("http") ? imageUrl : `${pathPrefix}/${imageUrl}`;
      return this.loadImage(normalizedUrl);
    });

    if (imagePromises.length > 0) await Promise.all(imagePromises);
  }

  loadImage(url) {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        this.loadedImages++;
        this.updateTitleProgress();
        resolve();
      };

      img.onerror = () => {
        this.loadedImages++;
        this.updateTitleProgress();
        resolve();
      };

      img.src = url;
    });
  }

  completeLoading() {
    document.title = this.baseName;
    this.isLoading = false;
    document.body.classList.remove("loading");
    document.body.classList.add("loaded");

    this.onCompleteCallbacks.forEach((callback) => callback());
    this.onCompleteCallbacks = [];
  }
}

export const loadingManager = new LoadingManager();
