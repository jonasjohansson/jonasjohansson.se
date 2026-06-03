import { getCurrentRoute } from "./routeUtils.js";

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
    // Warm the optimized hero image (the LCP) straight from the DOM. The other
    // grid images load via their own <img> tags, and the raw originals listed
    // in __INITIAL_PROJECT__.images are no longer deployed (only /img/ variants).
    const heroImg = document.querySelector(
      ".project-grid .media-item.hero img, .project-grid .media-item:first-child img, .project-grid img"
    );
    const url = heroImg && (heroImg.currentSrc || heroImg.src);
    if (!url) return;

    this.totalImages += 1;
    this.updateTitleProgress();
    await this.loadImage(url);
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
